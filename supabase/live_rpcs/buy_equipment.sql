CREATE OR REPLACE FUNCTION public.buy_equipment(equipment_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
  e equipment%rowtype;
  newbal int;
begin
  select * into e from public.equipment
    where id = equipment_id_param and is_active;
  if e.id is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;
  if coalesce(e.cost_points, 0) <= 0 then
    raise exception 'NOT_A_POINTS_ITEM';
  end if;
  if exists (select 1 from public.inventory
             where profile_id = me and equipment_id = e.id) then
    return jsonb_build_object('status', 'already_owned');
  end if;

  update public.profiles
     set points = points - e.cost_points
   where id = me and points >= e.cost_points
  returning points into newbal;

  if newbal is null then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into public.inventory (profile_id, equipment_id, quantity)
  values (me, e.id, 1);

  insert into public.points_ledger (profile_id, amount, reason)
  values (me, -e.cost_points, 'Bought: ' || e.name);

  return jsonb_build_object('status', 'ok', 'points', newbal);
end;
$function$;
