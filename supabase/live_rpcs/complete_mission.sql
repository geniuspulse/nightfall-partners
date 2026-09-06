CREATE OR REPLACE FUNCTION public.complete_mission(mission_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
  c couples%rowtype;
  m missions%rowtype;
  gs jsonb;
  base int; sync_bonus int; penalty int; attempts_penalty int := 0;
  score int; pts int;
  k text; v jsonb;
  already_complete boolean;
begin
  select * into c from public.couples where (player_a = me or player_b = me);
  if c.id is null then
    raise exception 'NO_COUPLE';
  end if;

  select * into m from public.missions where id = mission_id_param;
  if m.id is null then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  select state into gs from public.game_state
    where couple_id = c.id and mission_id = mission_id_param;
  if gs is null then
    raise exception 'NO_GAME_STATE';
  end if;

  -- Score (mirrors frontend computeScore)
  base := coalesce((gs->>'objectivesDone')::int, 0) * 100;
  sync_bonus := coalesce((gs->>'syncHits')::int, 0) * 50;
  penalty := coalesce((gs->>'syncMisses')::int, 0) * 25;
  for k, v in select key, value from jsonb_each(coalesce(gs->'attempts', '{}'::jsonb)) loop
    attempts_penalty := attempts_penalty + greatest(0, (v::text)::int - 1) * 10;
  end loop;
  score := greatest(0, base + sync_bonus - penalty - attempts_penalty);
  pts := case when score > 0 then score else 50 end;

  select exists(
    select 1 from public.mission_progress
    where couple_id = c.id and mission_id = mission_id_param and status = 'complete'
  ) into already_complete;

  insert into public.mission_progress
    (couple_id, mission_id, status, objectives_done, secrets_found,
     sync_score, damage_taken, score, points_awarded, started_at, completed_at)
  values
    (c.id, mission_id_param, 'complete',
     coalesce((gs->>'objectivesDone')::int, 0), 0,
     coalesce((gs->>'syncHits')::int, 0), coalesce((gs->>'syncMisses')::int, 0),
     score, pts, now(), now())
  on conflict (couple_id, mission_id) do update
    set status = 'complete',
        objectives_done = excluded.objectives_done,
        secrets_found = excluded.secrets_found,
        sync_score = excluded.sync_score,
        damage_taken = excluded.damage_taken,
        score = excluded.score,
        completed_at = now();

  -- Award both partners exactly once (replays never double-award)
  if not already_complete then
    update public.profiles set points = points + pts
      where id in (c.player_a, c.player_b) and id is not null;
    insert into public.points_ledger (profile_id, amount, reason)
    select p, pts, 'Completed: ' || m.title
      from unnest(array[c.player_a, c.player_b]) as p
     where p is not null;
  end if;

  return jsonb_build_object(
    'score', score,
    'points_awarded', pts,
    'already_complete', already_complete
  );
end;
$function$;
