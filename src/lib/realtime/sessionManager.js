// ============================================================
// NIGHTFALL PARTNERS — Realtime Session Manager (Phase 0)
// ------------------------------------------------------------
// Foundation for live multiplayer: session lifecycle (via RPCs),
// presence, fast broadcast transport, and authoritative world-event
// subscription. No UI dependencies; consumed by the 3D layer (Phase 1)
// and validated by /dev/sync.
// ============================================================

import { supabase } from '../../api/supabaseClient';

const HEARTBEAT_MS = 10_000;
const TRANSFORM_HZ = 12;

export const SESSION_EVENT = {
  TRANSFORM: 'transform', // peer avatar position (broadcast, fast, lossy)
  PING: 'ping',
  VOICE_SIGNAL: 'voice-signal', // Phase 2: SDP/ICE signaling
  WORLD_STATE: 'world-state',   // shared ambience toggles (lanterns, doors, …)
};

// ── Session lifecycle (RPC-backed; server validates couple membership) ──

export async function startSession(missionId) {
  const { data, error } = await supabase.rpc('start_game_session', {
    mission_id_param: missionId,
  });
  if (error) throw new Error(`startSession: ${error.message}`);
  return data; // session uuid
}

export async function joinSession(sessionId) {
  const { data, error } = await supabase.rpc('join_game_session', {
    session_id_param: sessionId,
  });
  if (error) throw new Error(`joinSession: ${error.message}`);
  return data; // full session row
}

export async function leaveSession(sessionId) {
  const { error } = await supabase.rpc('leave_game_session', {
    session_id_param: sessionId,
  });
  if (error) console.warn('leaveSession:', error.message);
}

export async function saveCheckpoint(sessionId, checkpoint, expectedVersion) {
  const { data, error } = await supabase.rpc('save_checkpoint', {
    session_id_param: sessionId,
    checkpoint_param: checkpoint,
    expected_version: expectedVersion,
  });
  if (error) throw new Error(`saveCheckpoint: ${error.message}`);
  return data; // new version
}

// Authoritative world event (damage, objective, npc, pickup, …).
// Returns the server-assigned seq — both clients observe the same order.
export async function sendWorldEvent(sessionId, type, payload = {}) {
  const { data, error } = await supabase.rpc('append_world_event', {
    session_id_param: sessionId,
    type_param: type,
    payload_param: payload,
  });
  if (error) throw new Error(`sendWorldEvent: ${error.message}`);
  return data; // seq
}

// ── Live channel: presence + broadcast + authoritative events ──

export class SessionChannel {
  /**
   * @param {string} sessionId
   * @param {{ profileId: string, displayName?: string, role: string }} self
   */
  constructor(sessionId, self) {
    this.sessionId = sessionId;
    this.self = self;
    this.channel = supabase.channel(`session:${sessionId}`, {
      config: { presence: { key: self.profileId } },
    });
    this._hbTimer = null;
    this._lastTransformAt = 0;
    this._listeners = { presence: [], event: [], message: [] };
  }

  onPresence(cb) { this._listeners.presence.push(cb); return this; }
  onWorldEvent(cb) { this._listeners.event.push(cb); return this; }
  onMessage(cb) { this._listeners.message.push(cb); return this; }

  async connect() {
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this._listeners.presence.forEach((cb) => cb(state));
      })
      .on('broadcast', { event: SESSION_EVENT.TRANSFORM }, ({ payload }) => {
        if (payload.pid === this.self.profileId) return; // ignore own echo
        this._listeners.message.forEach((cb) => cb(payload));
      })
      .on('broadcast', { event: SESSION_EVENT.PING }, ({ payload }) => {
        this._listeners.message.forEach((cb) => cb(payload));
      })
      .on('broadcast', { event: SESSION_EVENT.VOICE_SIGNAL }, ({ payload }) => {
        if (payload.pid === this.self.profileId) return;
        this._listeners.message.forEach((cb) => cb(payload));
      })
      .on('broadcast', { event: SESSION_EVENT.WORLD_STATE }, ({ payload }) => {
        if (payload.pid === this.self.profileId) return;
        this._listeners.message.forEach((cb) => cb(payload));
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'world_events',
          filter: `session_id=eq.${this.sessionId}` },
        (payload) => this._listeners.event.forEach((cb) => cb(payload.new))
      );

    const status = await new Promise((resolve, reject) => {
      this.channel.subscribe((s, err) => {
        if (s === 'SUBSCRIBED') resolve(s);
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') reject(new Error(`subscribe failed: ${s}`));
      });
    });
    if (status !== 'SUBSCRIBED') throw new Error(`channel subscribe failed: ${status}`);
    await this.channel.track({
      pid: this.self.profileId,
      name: this.self.displayName ?? 'Wanderer',
      role: this.self.role,
      online_at: Date.now(),
    });

    this._hbTimer = setInterval(() => {
      supabase
        .rpc('heartbeat_session', { session_id_param: this.sessionId })
        .then(({ error }) => { if (error) console.warn('heartbeat:', error.message); });
    }, HEARTBEAT_MS);

    return this;
  }

  /** Throttled avatar snapshot. Lossy by design — latest wins. */
  sendTransform(pos, yaw, anim = 'idle') {
    const now = performance.now();
    if (now - this._lastTransformAt < 1000 / TRANSFORM_HZ) return;
    this._lastTransformAt = now;
    this.channel.send({
      type: 'broadcast',
      event: SESSION_EVENT.TRANSFORM,
      payload: { pid: this.self.profileId, pos, yaw, anim, t: now },
    });
  }

  /** Arbitrary low-latency message (ping, voice signaling, …). */
  send(event, payload) {
    return this.channel.send({
      type: 'broadcast',
      event,
      payload: { pid: this.self.profileId, ...payload },
    });
  }

  async disconnect() {
    if (this._hbTimer) clearInterval(this._hbTimer);
    await leaveSession(this.sessionId).catch(() => {});
    await this.channel.untrack().catch(() => {});
    supabase.removeChannel(this.channel);
  }
}

// ── Interpolation helper (Phase 1 avatar smoothing; unit-testable now) ──

export function createRemoteAvatar() {
  return {
    pos: null,       // {x,y,z}
    yaw: 0,
    buffer: [],       // {pos, yaw, t, receivedAt}
    setSnapshot(snap) {
      this.buffer.push({ ...snap, receivedAt: performance.now() });
      if (this.buffer.length > 30) this.buffer.shift();
    },
    /** Render-frame update: interpolate ~120ms behind the newest snapshot. */
    update() {
      if (!this.buffer.length) return this.pos;
      const renderTime = performance.now() - 120;
      while (this.buffer.length > 1 && this.buffer[1].receivedAt <= renderTime) {
        this.buffer.shift();
      }
      if (this.buffer.length === 1) {
        this.pos = this.buffer[0].pos;
        this.yaw = this.buffer[0].yaw;
        return this.pos;
      }
      const a = this.buffer[0], b = this.buffer[1];
      const span = b.receivedAt - a.receivedAt || 1;
      const alpha = Math.min(1, Math.max(0, (renderTime - a.receivedAt) / span));
      this.pos = {
        x: a.pos.x + (b.pos.x - a.pos.x) * alpha,
        y: a.pos.y + (b.pos.y - a.pos.y) * alpha,
        z: a.pos.z + (b.pos.z - a.pos.z) * alpha,
      };
      this.yaw = a.yaw + shortestAngle(a.yaw, b.yaw) * alpha;
      return this.pos;
    },
  };
}

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
