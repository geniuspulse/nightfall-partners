// ============================================================
// NIGHTFALL PARTNERS — Mission persistence (Phase 3)
// Save/resume mission state to the couple-scoped mission_progress
// table (RLS isolates rows to bond members). Only the session
// host writes; both players read. Checkpoints + engine state are
// stored as JSONB so mission definitions can evolve without
// breaking old saves.
// ============================================================

import { supabase } from '../../api/supabaseClient';
import { serialize } from './MissionEngine.js';

/**
 * Load the saved engine state for (couple, mission), or null.
 * Returns { row, state } where state is the deserialized engine
 * state (or null when no save exists).
 */
export async function loadMissionProgress({ coupleId, missionDbId }) {
  const { data, error } = await supabase
    .from('mission_progress')
    .select('id, status, engine_state, checkpoint, objectives_done, points_awarded')
    .eq('couple_id', coupleId)
    .eq('mission_id', missionDbId)
    .maybeSingle();
  if (error) throw new Error(`loadMissionProgress: ${error.message}`);
  if (!data) return { row: null, state: null };
  return {
    row: data,
    state: data.engine_state && Object.keys(data.engine_state).length ? data.engine_state : null,
  };
}

/**
 * Upsert a mission_progress row with the full engine state.
 * Mirrors progress counters for dashboards/scores.
 */
export async function saveMissionProgress({ coupleId, missionDbId, state, progress, complete }) {
  const payload = {
    couple_id: coupleId,
    mission_id: missionDbId,
    status: complete ? 'complete' : 'in_progress',
    objectives_done: progress?.done ?? 0,
    secrets_found: progress?.secrets ?? 0,
    points_awarded: complete ? (state?.pointsAwarded ?? 0) : 0,
    engine_state: state ? serialize(state) : {},
    checkpoint: state?.checkpoints?.length
      ? serialize(state.checkpoints[state.checkpoints.length - 1])
      : null,
    completed_at: complete ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('mission_progress')
    .upsert(payload, { onConflict: 'couple_id,mission_id' })
    .select('id')
    .single();
  if (error) throw new Error(`saveMissionProgress: ${error.message}`);
  return data;
}

/** All completed mission definitions for this couple (for unlocks). */
export async function loadCompletedMissionIds({ coupleId }) {
  const { data, error } = await supabase
    .from('mission_progress')
    .select('mission_id, missions(night_number, title)')
    .eq('couple_id', coupleId)
    .eq('status', 'complete');
  if (error) throw new Error(`loadCompletedMissionIds: ${error.message}`);
  return (data ?? []).map((r) => r.mission_id);
}
