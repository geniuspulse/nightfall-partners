// ============================================================
// NIGHTFALL PARTNERS — Mission Engine
// Shared game state lives in `game_state` (jsonb), synced via
// Supabase Realtime so two devices always see the same room.
// ============================================================

import { supabase } from '../api/supabaseClient';

export const ROLE_PATHFINDER = 'pathfinder';
export const ROLE_SEER = 'seer';

// Player A (invite creator) = Pathfinder. Player B = Seer.
export function roleForUser(userId, couple) {
  if (!couple) return null;
  return couple.player_a === userId ? ROLE_PATHFINDER : ROLE_SEER;
}

export function emptyState() {
  return {
    roomIndex: 0,
    phase: 'story', // story | interaction | result | finale
    // choice voting
    votes: {},        // { playerId: optionId }
    // code entry
    codeEntries: {},  // { playerId: string }
    // sync-tap
    taps: {},         // { playerId: timestampMs }
    // scoring
    objectivesDone: 0,
    syncHits: 0,
    syncMisses: 0,
    attempts: {},
    startedAt: Date.now(),
  };
}

// ── Realtime-synced state store ──
export async function loadState(coupleId, missionId) {
  const { data } = await supabase
    .from('game_state')
    .select('state, room_number')
    .eq('couple_id', coupleId)
    .eq('mission_id', missionId)
    .maybeSingle();
  return data?.state ?? null;
}

export async function initGameState(coupleId, missionId) {
  const fresh = emptyState();
  const { error } = await supabase
    .from('game_state')
    .upsert(
      { couple_id: coupleId, mission_id: missionId, room_number: 1, state: fresh },
      { onConflict: 'couple_id,mission_id' }
    );
  if (error) throw error;
  return fresh;
}

export async function patchState(coupleId, missionId, mutate) {
  // Read-modify-write: fetch current, apply mutation, save.
  const current = (await loadState(coupleId, missionId)) ?? emptyState();
  const next = mutate(structuredClone(current));
  const { error } = await supabase
    .from('game_state')
    .upsert(
      { couple_id: coupleId, mission_id: missionId, room_number: next.roomIndex + 1, state: next },
      { onConflict: 'couple_id,mission_id' }
    );
  if (error) throw error;
  return next;
}

export function subscribeToState(coupleId, missionId, onChange) {
  const channel = supabase
    .channel(`game:${coupleId}:${missionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_state',
        filter: `couple_id=eq.${coupleId}`,
      },
      (payload) => onChange(payload.new?.state)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ── Interaction resolution ──
export function resolveChoice(state, room) {
  const [a, b] = Object.values(state.votes);
  const agree = a && b && a === b;
  const correct = agree && a === room.interaction.answer;
  return { agree, correct, done: !!a && !!b };
}

export function resolveCode(state, room) {
  const entries = Object.values(state.codeEntries);
  const hasBoth = entries.length >= 2;
  const correct = hasBoth && entries.some((e) => String(e).trim() === String(room.interaction.answer));
  return { hasBoth, correct, done: hasBoth };
}

export function resolveSyncTap(state, room) {
  const taps = Object.values(state.taps);
  if (taps.length < 2) return { done: false, inWindow: false };
  const diff = Math.abs(taps[0] - taps[1]);
  return { done: true, inWindow: diff <= (room.interaction.windowMs || 3000) };
}

// ── Scoring ──
export function computeScore(state) {
  const totalRooms = 3; // Night One
  const base = state.objectivesDone * 100;
  const syncBonus = state.syncHits * 50;
  const penalty = state.syncMisses * 25;
  const attemptsPenalty = Object.values(state.attempts).reduce((s, n) => s + Math.max(0, (n - 1)) * 10, 0);
  return Math.max(0, base + syncBonus - penalty - attemptsPenalty);
}

export function progressRoom(state) {
  return {
    ...state,
    roomIndex: state.roomIndex + 1,
    phase: 'story',
    votes: {},
    codeEntries: {},
    taps: {},
  };
}
