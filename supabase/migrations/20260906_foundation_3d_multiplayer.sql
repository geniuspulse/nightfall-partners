-- ============================================================
-- NIGHTFALL PARTNERS — Phase 0 Foundation Migration
-- Additive ONLY: does not touch any existing table, policy, or RPC.
-- Adds: game_sessions, session_participants, world_events
--       + session lifecycle RPCs + atomic state patch + RLS + realtime
-- Apply with a service-role connection (SQL editor or Management API).
-- ============================================================

-- ============ GAME SESSIONS ============
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  night_number integer not null default 1,
  status text not null default 'lobby'
    check (status in ('lobby','active','paused','ended')),
  host_id uuid not null references public.profiles(id),
  checkpoint jsonb not null default '{}'::jsonb,
  version integer not null default 1,          -- optimistic concurrency
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);
create index if not exists idx_game_sessions_couple
  on public.game_sessions(couple_id, created_at desc);

-- ============ SESSION PARTICIPANTS ============
create table if not exists public.session_participants (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'pathfinder'
    check (role in ('pathfinder','seer')),
  is_connected boolean not null default false,
  last_seen timestamptz not null default now(),
  primary key (session_id, profile_id)
);
create index if not exists idx_participants_seen
  on public.session_participants(last_seen);

-- ============ WORLD EVENTS (authoritative ordered log) ============
create table if not exists public.world_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  seq bigint not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  by_profile uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);
create index if not exists idx_world_events_session
  on public.world_events(session_id, seq);

-- ============ RLS ============
alter table public.game_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.world_events enable row level security;

-- Membership helper: is auth.uid() in the couple that owns this session?
create or replace function public.session_couple_member(session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.game_sessions s
    join public.couples c on c.id = s.couple_id
    where s.id = session
      and (c.player_a = auth.uid() or c.player_b = auth.uid())
  );
$$;

create policy "session member access" on public.game_sessions
  for all using (public.session_couple_member(id))
  with check (public.session_couple_member(id));

create policy "participants member access" on public.session_participants
  for all using (public.session_couple_member(session_id))
  with check (public.session_couple_member(session_id));

create policy "world events member read" on public.world_events
  for select using (public.session_couple_member(session_id));

-- Inserts go through the append_world_event RPC only:
create policy "world events member insert" on public.world_events
  for insert with check (public.session_couple_member(session_id));

-- ============ SESSION LIFECYCLE RPCs ============

-- Host creates a live session for a mission. Requires a fully bonded couple.
create or replace function public.start_game_session(mission_id_param uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_couple public.couples%rowtype;
  v_mission public.missions%rowtype;
  v_role text;
  v_session uuid;
begin
  select * into v_couple from public.couples
    where (player_a = auth.uid() or player_b = auth.uid())
    and player_b is not null
    order by created_at desc limit 1;
  if v_couple.id is null then
    raise exception 'NO_BOND: create or complete a couple bond first';
  end if;

  select * into v_mission from public.missions where id = mission_id_param;
  if v_mission.id is null then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  v_role := case when v_couple.player_a = auth.uid() then 'pathfinder' else 'seer' end;

  insert into public.game_sessions (couple_id, mission_id, night_number, host_id, status)
    values (v_couple.id, v_mission.id, v_mission.night_number, auth.uid(), 'active')
    returning id into v_session;

  insert into public.session_participants (session_id, profile_id, role, is_connected)
    values (v_session, auth.uid(), v_role, true);

  return v_session;
end;
$$;

-- Partner (or host, on reconnect) joins an existing session.
create or replace function public.join_game_session(session_id_param uuid)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare
  v_session public.game_sessions%rowtype;
  v_couple public.couples%rowtype;
  v_role text;
begin
  select * into v_session from public.game_sessions where id = session_id_param;
  if v_session.id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if v_session.status = 'ended' then
    raise exception 'SESSION_ENDED';
  end if;

  select * into v_couple from public.couples where id = v_session.couple_id;
  if not (v_couple.player_a = auth.uid() or v_couple.player_b = auth.uid()) then
    raise exception 'NOT_A_PARTNER: this session belongs to another couple';
  end if;

  v_role := case when v_couple.player_a = auth.uid() then 'pathfinder' else 'seer' end;

  insert into public.session_participants (session_id, profile_id, role, is_connected)
    values (v_session.id, auth.uid(), v_role, true)
    on conflict (session_id, profile_id)
    do update set is_connected = true, last_seen = now();

  return v_session;
end;
$$;

-- Connection heartbeat (client calls every ~10s while in session).
create or replace function public.heartbeat_session(session_id_param uuid)
returns void language sql security definer set search_path = public as $$
  update public.session_participants
    set last_seen = now(), is_connected = true
    where session_id = session_id_param and profile_id = auth.uid();
$$;

create or replace function public.leave_game_session(session_id_param uuid)
returns void language sql security definer set search_path = public as $$
  update public.session_participants
    set is_connected = false
    where session_id = session_id_param and profile_id = auth.uid();
$$;

-- Authoritative event append. Seq is serialized per-session via row lock,
-- so concurrent clients can never interleave or collide on the same seq.
create or replace function public.append_world_event(
  session_id_param uuid,
  type_param text,
  payload_param jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_seq bigint;
  v_status text;
begin
  -- Serialize appends for this session.
  perform 1 from public.game_sessions where id = session_id_param for update;

  select status into v_status from public.game_sessions where id = session_id_param;
  if v_status is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if v_status = 'ended' then
    raise exception 'SESSION_ENDED';
  end if;

  if not exists (
    select 1 from public.session_participants
    where session_id = session_id_param and profile_id = auth.uid()
  ) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;

  select coalesce(max(seq), 0) + 1 into v_seq
    from public.world_events where session_id = session_id_param;

  insert into public.world_events (session_id, seq, type, payload, by_profile)
    values (session_id_param, v_seq, type_param, payload_param, auth.uid());

  return v_seq;
end;
$$;

-- Checkpoint save with optimistic concurrency: a stale client can never
-- clobber a newer checkpoint.
create or replace function public.save_checkpoint(
  session_id_param uuid,
  checkpoint_param jsonb,
  expected_version integer
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_new_version integer;
begin
  update public.game_sessions
    set checkpoint = checkpoint_param,
        version = version + 1
    where id = session_id_param and version = expected_version
    returning version into v_new_version;

  if v_new_version is null then
    raise exception 'CHECKPOINT_CONFLICT: reload the session and retry';
  end if;
  return v_new_version;
end;
$$;

-- Atomic shallow-merge patch for the existing game_state row.
-- Fixes the read-modify-write race in the text engine's patchState().
create or replace function public.patch_game_state_atomic(
  couple_id_param uuid,
  mission_id_param uuid,
  patch_param jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_state jsonb;
begin
  insert into public.game_state (couple_id, mission_id, room_number, state)
    values (couple_id_param, mission_id_param, 1, patch_param)
    on conflict (couple_id, mission_id)
    do update set state = coalesce(public.game_state.state, '{}'::jsonb) || patch_param,
                  updated_at = now()
    returning state into v_state;

  -- keep room_number in sync with the patch when provided
  if patch_param ? 'roomIndex' then
    update public.game_state
      set room_number = ((patch_param->>'roomIndex')::int) + 1
      where couple_id = couple_id_param and mission_id = mission_id_param;
  end if;

  return v_state;
end;
$$;

-- ============ REALTIME PUBLICATION ============
do $$
begin
  alter publication supabase_realtime add table public.world_events;
  alter publication supabase_realtime add table public.game_sessions;
exception
  when duplicate_object then null;  -- already published
  when undefined_object then
    raise notice 'supabase_realtime publication not found; add world_events manually';
end $$;

-- Notes:
-- * Existing tables/policies are untouched by design.
-- * Live-only RPCs (join_couple, complete_mission, buy_equipment) still need
--   to be captured into the repo — tracked in docs/ARCHITECTURE.md ops list.
