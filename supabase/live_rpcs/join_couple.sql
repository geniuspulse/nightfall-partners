CREATE OR REPLACE FUNCTION public.join_couple(invite_code_param text)
 RETURNS couples
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result public.couples;
begin
  update public.couples
  set player_b = auth.uid()
  where invite_code = upper(trim(invite_code_param))
    and player_b is null
    and player_a <> auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'INVALID_OR_CLOSED_INVITE';
  end if;

  return result;
end;
$function$;
