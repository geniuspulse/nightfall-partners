-- ============================================================
-- NIGHTFALL PARTNERS — Mission Engine (Phase 3)
-- mission_progress gains JSONB engine state + checkpoint storage
-- so saves survive mission-definition evolution. Seeds the demo
-- mission (night 0) that proves the engine end-to-end.
-- ============================================================

-- engine state: full serializable MissionEngine state
alter table public.mission_progress
  add column if not exists engine_state jsonb not null default '{}'::jsonb,
  add column if not exists checkpoint jsonb,
  add column if not exists current_objective text;

-- demo mission: night 0 "First Light" (the 3D forest prototype)
insert into public.missions (night_number, title, summary, status)
values (
  0,
  'First Light',
  'The veil between Hollow Creek and the other world is thin tonight. Light the old path — together.',
  'available'
)
on conflict (night_number) do nothing;
