# Nightfall Partners — Technical Architecture

**Status:** Phase 0 (Foundation) — approved direction, nothing here is fake or stubbed.
This document is the source of truth for the 2D → 3D multiplayer evolution.

---

## A. Current Architecture (audited 2026-09-06)

### Frontend
- **Stack:** React 18 + Vite 5 + react-router-dom 6. Custom CSS (no UI framework).
- **Size:** 7 components (~720 LOC) + 301-line mission data file + 132-line engine.
- **Nature of the game today:** a *text-based co-op adventure* — no canvas, no 3D, no
  sprites. Rooms render as prose; players interact via choice voting, code entry,
  and timed "sync taps". Asymmetric roles: Pathfinder (daylight layer) vs Seer
  (shadow layer).

### Backend
- **Supabase** (project `aolxyrldgrtaypvqdaht`):
  - **Auth:** email/password, autoconfirm on (verification gate removed), session
    bootstrap in `AuthContext` with profile + couple hydration.
  - **Postgres:** 10 tables — `profiles`, `couples`, `missions`, `mission_progress`,
    `equipment`, `inventory`, `loadouts`, `points_ledger`, `game_state`, `purchases`.
    RLS on all tables; policies verified working.
  - **RPCs (live in DB, NOT in repo — schema drift):** `join_couple(invite_code_param)`,
    `complete_mission(mission_id_param)` (server-side scoring + atomic dual-partner
    award, no double-award on replay), `buy_equipment(equipment_id_param)` (atomic
    balance check → deduct → grant → ledger). Client write privileges on economy
    tables were revoked — economy is server-authoritative.
  - **Realtime:** `postgres_changes` on `game_state` (client capped at 10 events/sec).
    Used for room-state sync. No Broadcast or Presence usage yet.

### Game functionality that works today
1. Email signup → auto profile → pairing via 6-letter invite codes → Bond (couple).
2. Mission select with unlock progression (Night 1 & 2 playable; 3–5 locked).
3. Realtime mission engine: shared jsonb `game_state` row per (couple, mission),
   synced via postgres_changes; three interaction types (choice/code/sync-tap) with
   dual-input resolution and scoring.
4. Points economy (server-side) + Quartermaster shop with basic/veteran/premium tiers.
5. CI/CD: GitHub Actions → `vite build` → Vercel prebuilt deploy.

### Assets
**None.** No images, audio, models, or fonts. The entire product is text + CSS.

### Integrations
- Vercel (via Actions, project linked for prebuilt deploys).
- Paychangu — **stub only** (premium gear rows exist; no checkout wired).
- Analytics, error tracking: none.

### Current limitations (the honest list)
1. **No realtime "world":** state sync is DB-row upserts — fine for turn-based rooms,
   unusable for movement/combat (10 evt/s cap, no per-frame transport).
2. **`patchState` read-modify-write race:** two clients fetching-mutating-upserting
   the same `game_state` row can clobber each other. Mitigated in practice by room
   gating; not fixed structurally.
3. **No session lifecycle:** no live session concept, heartbeat, reconnect, or
   checkpoint/resume. A refresh mid-mission relies on the `game_state` row being valid.
4. **No avatars, no spatial presence** — players never "see" each other.
5. **`computeScore` hardcodes `totalRooms = 3`.**
6. **Schema drift:** live RPCs + revokes are not reproducible from the repo. A fresh
   `schema.sql` run would produce a database the frontend cannot fully work against.
7. **Mission content lives only in the JS bundle** — DB `missions` rows are just titles.

### What can be reused (do NOT rewrite)
- Auth, profiles, couples + invite-code bonding + RLS policies.
- Entire economy: `points_ledger`, `equipment`, `inventory`, `loadouts` + the three
  hardened RPCs.
- `mission_progress` (per-couple progress + scoring) — extend, don't replace.
- The **data-driven mission format** in `src/data/missions.js` — room/asymmetric-clue
  model ports directly to 3D objective descriptors.
- CI/CD pipeline and Vercel hosting.

### What must be built new
- 3D renderer + scene pipeline (Three.js / React Three Fiber).
- Fast player sync (transforms), presence, session lifecycle.
- WebRTC voice.
- Combat, monsters, NPC scripting, interaction runtime, cinematics, checkpoint/resume.

---

## B. Target Architecture

```
┌───────────────────────── Client (both players) ─────────────────────────┐
│  React 18 app                                                            │
│  ├─ Existing screens (Landing, Pairing, Lobby, Missions, Shop, Results)   │
│  ├─ Session Layer      src/lib/realtime/sessionManager.js   [NEW, Phase 0]│
│  ├─ 3D Layer (Phase 1) React Three Fiber <Canvas>, avatars, interaction   │
│  └─ Voice Layer (Phase 2) WebRTC peer connection + audio graph             │
└──────────────┬─────────────────────────────┬───────────────────────────┘
               │ Supabase JS SDK              │ WebRTC (media, P2P)
┌──────────────▼─────────────────────────────▼───────────────────────────┐
│ Supabase                                                                │
│ ├─ Auth (existing)                                                      │
│ ├─ Postgres (existing + additive Phase-0 tables: game_sessions,         │
│ │   session_participants, world_events) — authority for world truth     │
│ ├─ RPCs: existing 3 + start/join/heartbeat/leave session,                │
│ │   append_world_event (seq'd, serialized), save_checkpoint (OCC)      │
│ └─ Realtime:                                                            │
│     ├─ Presence  → lobby & in-session "who's here"                       │
│     ├─ Broadcast → transforms @ ~12 Hz, voice signaling (SDP/ICE)        │
│     └─ postgres_changes → world_events (authoritative), game_state      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Core decisions (and why):**

1. **Transport = Supabase Realtime Broadcast/Presence for a 2-player session.**
   No custom websocket server is justified at n=2 clients; Broadcast bypasses the
   DB entirely (fast), Postgres remains the authority for world truth. This is a
   real production pattern, not a shortcut. Revisit only for spectators or >2 players.

2. **Authority model:** each client is authoritative over *its own avatar*
   (client-predicted, broadcast snapshots, partner interpolates). The **server
   (Postgres RPCs) is authoritative over world events**: damage, monster kills,
   objective completion, items picked up, NPC rescues. Events append to
   `world_events` with a per-session monotonic `seq` (serialized via row lock)
   so both clients observe the same ordered history — deterministic replay and
   conflict-free progression.

3. **Voice = P2P WebRTC** (2 peers = trivial mesh, no media server cost).
   Signaling rides the existing Realtime channel (`voice:{sessionId}`) — no extra
   infra. STUN is free; **a TURN server is required in production** for NAT-restricted
   couples (recommended: Cloudflare TURN, metered; ~free at this scale). LiveKit is
   the documented upgrade path if we ever need >2 players or SFU-grade resilience.

4. **3D = Three.js via React Three Fiber** (idiomatic with the existing React app;
   drei for helpers). Asset pipeline: glTF models in `/public/models`. Avatars:
   capsule-rigged placeholders in Phase 1, rigged characters later.

5. **Missions stay data-driven.** Each room in `missions.js` gains an optional
   `world` descriptor consumed by the 3D layer. The current text engine remains
   the fallback renderer — every room must stay playable in text mode while 3D
   covers Nights progressively.

---

## C. Recommended Database Schema (Phase 0 — additive only)

New tables (all RLS'd to couple members; see
`supabase/migrations/20260906_foundation_3d_multiplayer.sql`):

```sql
game_sessions         -- one live play session of one mission by one couple
  id, couple_id, mission_id, night_number, status (lobby|active|paused|ended),
  host_id, checkpoint jsonb, version int (OCC), created_at, started_at, ended_at

session_participants  -- who is in the session and connection health
  session_id, profile_id, role, is_connected, last_seen   -- PK (session, profile)

world_events          -- authoritative, ordered event log (the world's truth)
  id bigint identity, session_id, seq bigint (unique per session), type,
  payload jsonb, by_profile, created_at
```

New RPCs: `start_game_session`, `join_game_session`, `heartbeat_session`,
`leave_game_session`, `append_world_event` (lock-serialized seq),
`save_checkpoint` (optimistic-concurrency via version), and
`patch_game_state_atomic` (fixes the existing read-modify-write race).

`world_events` is added to the `supabase_realtime` publication for
postgres_changes streaming.

**Untouched:** all ten existing tables and their policies. Existing screens
keep working without modification.

---

## D. Multiplayer Architecture

**Session lifecycle:** `start_game_session` (host) → partner `join_game_session` →
both enter Realtime channel `session:{id}` (Presence on, heartbeat RPC every 10 s,
`last_seen` drives connected state and reconnect detection) → `active` →
`save_checkpoint` at room/segment boundaries (version-checked, no clobber) →
`ended`. Abandoned sessions resume from `checkpoint`.

**Transform sync (Phase 1):** local player simulated at render rate; snapshot
`(x, y, z, yaw, anim, t)` broadcast at 12 Hz; partner applies interpolation with
~120 ms buffer and snaps on teleport. You are always authoritative about yourself;
world truth never depends on transforms.

**World events:** client requests (`append_world_event`) → RPC validates caller is
a session participant and serializes seq → both clients subscribe to
`world_events` postgres_changes and apply the same ordered stream. Monsters/NPCs
are host-simulated for ambient behavior, but **state-changing outcomes go through
world_events**, so a dropped client can't corrupt truth.

**Failure modes handled:** partner disconnect → presence loss + stale `last_seen`
marks them away; reconnect re-joins the channel and replays events since the last
checkpoint; sessions survive because truth lives in Postgres, not memory.

---

## E. Voice Architecture (Phase 2)

1. Session channel sub-topic `voice:{sessionId}` for signaling:
   `offer`, `answer`, `ice` broadcast messages (SDP + candidates).
2. `RTCPeerConnection` audio-only track, Opus, echoCancellation + noiseSuppression on.
3. STUN: Google public. TURN: Cloudflare (metered) — **required** before shipping
   voice to real couples; a meaningful share of real-world pairs need TURN relay.
4. UX: open-mic default (couples), push-to-talk toggle, mute indicator on the
   partner's nameplate.
5. Security: signaling inherits Supabase channel auth (RLS on session); media is
   DTLS-SRTP encrypted by WebRTC itself.
6. Upgrade path documented (not built): LiveKit Cloud if we add groups or need SFU.

**No fake implementations:** voice ships only when signaling + TURN are both real.

---

## F. Mission Architecture

The existing data model is the backbone. Each room object gains:

```js
{
  id, title, story,                      // existing — unchanged
  clues: { pathfinder, seer },           // existing — becomes in-world readable props
  interaction: { type, ... },           // existing — maps to 3D triggers
  world: {                               // NEW, optional — absent ⇒ text mode
    scene: 'lantern_cottage',            // scene registry key
    spawns: { pathfinder: [...], seer: [...] },
    interactables: [ { id, kind, position, readableFor } ],
    npcs: [ { id, script: 'wren', position } ],
    monsters: [ { id, kind, spawn, hp, waves } ],
    objective: { type, target },
    separation: null | { when, rejoinAt } // scripted split/reunion moments
  }
}
```

Interaction mapping: `choice` → in-world dialogue pedestal (both must act);
`code` → runes each partner can only half-see; `sync-tap` → paired lantern sync
event with a real time window. Scoring flows through the existing
`complete_mission` RPC unchanged. Story progression (choices → world flags) is
persisted in `checkpoint` jsonb so Night N+1 can read Night N's decisions.

---

## G. Development Roadmap

| Phase | Goal | Exit criteria (stability gates) |
|---|---|---|
| **0 — Foundation (done)** | Schema + session layer + transport proof | migration applied; two tabs see presence + ordered events; zero regressions to text game |
| 1 — Vertical slice (**prototype live at /forest**) | Atmospheric forest: two avatars, synced movement, third-person camera, interaction foundation (kind registry), lantern waystones | 60 fps both clients; partner movement smooth on throttled link |
| 2 — Voice | WebRTC audio in-session | stable call on NAT-restricted network with TURN |
| 3 — Combat MVP | One monster + Sling (existing equipment row); damage via world_events | no desync after packet loss; death/respawn coherent |
| 4 — Night One in 3D | Full Night One playable in 3D, text mode still works | couple completes both modes; scoring identical |
| 5 — NPCs & separation | Wren NPC scripting; scripted separation/reunion events | story flags persist across nights |
| 6 — Hardening & beta | Save/resume, reconnect UX, Paychangu checkout for premium gear | 7-day soak with a pilot cohort |

Each phase builds on the previous; nothing is rewritten twice.

---

## Outstanding ops items (tracked, not blocking)

- **Schema drift:** live RPCs (`join_couple`, `complete_mission`, `buy_equipment`)
  must be captured back into the repo (needs a service-role read of `pg_proc`) —
  scheduled during Phase 1.
- **Migration application:** Phase 0 migration is additive; needs the service key
  (Supabase SQL editor or Management API).
- `computeScore` `totalRooms` hardcode — fix when the engine refactors for `world`.
