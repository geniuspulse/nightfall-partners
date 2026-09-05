-- NIGHTFALL PARTNERS — Database Schema
-- Auth + co-op pairing + missions + gear economy

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Wanderer',
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============ COUPLES (bonded pairs) ============
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references public.profiles(id) on delete cascade,
  player_b uuid references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  bond_score integer not null default 0,
  missions_completed integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============ MISSIONS ============
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  night_number integer not null unique,
  title text not null,
  summary text not null,
  status text not null default 'locked'  -- locked | available | complete
);

-- ============ MISSION PROGRESS (per couple per mission) ============
create table public.mission_progress (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  status text not null default 'in_progress',  -- in_progress | complete | failed
  objectives_done integer not null default 0,
  secrets_found integer not null default 0,
  sync_score integer not null default 0,
  damage_taken integer not null default 0,
  score integer not null default 0,
  points_awarded integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(couple_id, mission_id)
);

-- ============ EQUIPMENT CATALOG ============
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot text not null,               -- weapon | utility | charm
  tier text not null default 'basic', -- basic | veteran | premium
  cost_points integer not null default 0,
  cost_money numeric(10,2),          -- null = purchasable with points only
  currency text default 'MWK',
  description text not null,
  icon text not null default '🔧',
  requires_partner_item uuid references public.equipment(id),
  unlocks_mission_night integer,
  is_active boolean not null default true
);

-- ============ INVENTORY ============
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  quantity integer not null default 1,
  acquired_at timestamptz not null default now(),
  unique(profile_id, equipment_id)
);

-- ============ LOADOUT (equipped gear per mission) ============
create table public.loadouts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission_progress_id uuid references public.mission_progress(id) on delete set null,
  weapon_id uuid references public.equipment(id),
  utility_id uuid references public.equipment(id),
  charm_id uuid references public.equipment(id),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

-- ============ POINTS LEDGER ============
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ============ MISSION STATE (realtime game state per couple) ============
create table public.game_state (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  room_number integer not null default 1,
  state jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique(couple_id, mission_id)
);

-- ============ PURCHASES (paywall) ============
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'MWK',
  gateway text not null default 'paychangu',
  gateway_reference text,
  status text not null default 'pending',  -- pending | paid | failed
  created_at timestamptz not null default now()
);

-- ============ TRIGGERS ============
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Wanderer'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.missions enable row level security;
alter table public.mission_progress enable row level security;
alter table public.equipment enable row level security;
alter table public.inventory enable row level security;
alter table public.loadouts enable row level security;
alter table public.points_ledger enable row level security;
alter table public.game_state enable row level security;
alter table public.purchases enable row level security;

-- Profiles: own only
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "read partner profile" on public.profiles for select using (true);

-- Couples: members can read/update; player_a can create
create policy "couple member read" on public.couples for select using (auth.uid() = player_a or auth.uid() = player_b or player_b is null);
create policy "couple create" on public.couples for insert with check (auth.uid() = player_a);
create policy "couple update" on public.couples for update using (auth.uid() = player_a or auth.uid() = player_b);

-- Missions: readable by all authenticated
create policy "missions read" on public.missions for select using (auth.role() = 'authenticated');

-- Mission progress: couple members
create policy "progress read" on public.mission_progress for select using (
  couple_id in (select id from public.couples where auth.uid() in (player_a, player_b))
);
create policy "progress write" on public.mission_progress for all using (
  couple_id in (select id from public.couples where auth.uid() in (player_a, player_b))
) with check (
  couple_id in (select id from public.couples where auth.uid() in (player_a, player_b))
);

-- Equipment catalog: readable by all
create policy "equipment read" on public.equipment for select using (auth.role() = 'authenticated');

-- Inventory: own
create policy "inventory own" on public.inventory for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Loadouts: own
create policy "loadout own" on public.loadouts for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Points ledger: own
create policy "ledger own" on public.points_ledger for select using (auth.uid() = profile_id);
create policy "ledger insert" on public.points_ledger for insert with check (auth.uid() = profile_id);

-- Game state: couple members
create policy "game state access" on public.game_state for all using (
  couple_id in (select id from public.couples where auth.uid() in (player_a, player_b))
) with check (
  couple_id in (select id from public.couples where auth.uid() in (player_a, player_b))
);

-- Purchases: own
create policy "purchases own" on public.purchases for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============ SEED: NIGHT MISSIONS ============
insert into public.missions (night_number, title, summary, status) values
  (1, 'The Lantern in the Dark', 'A curse splits your town at nightfall. Find each other across the veil before the lantern burns out.', 'available'),
  (2, 'The Whispering Bridge', 'A spirit bridge appears only to those who trust. Cross before dawn, or be trapped between realms.', 'locked'),
  (3, 'The Hollow Chapel', 'Something is singing in the chapel ruins. It has been waiting for a pair like you.', 'locked'),
  (4, 'The Midnight Market', 'Traders from the shadow realm will bargain — but only with matched hearts.', 'locked'),
  (5, 'The Descent', 'The source of the curse lies beneath the town. Go down together, or not at all.', 'locked');

-- ============ SEED: STARTER EQUIPMENT ============
insert into public.equipment (name, slot, tier, cost_points, cost_money, description, icon, requires_partner_item) values
  ('Sling', 'weapon', 'basic', 50, null, 'A humble hunter''s sling. Silent, reliable, free of consequence.', '🪨', null),
  ('Torch', 'utility', 'basic', 40, null, 'Ordinary light. Reveals what daylight layer players cannot see up close.', '🔥', null),
  ('Iron Charm', 'charm', 'basic', 45, null, 'Wards off minor spirits. Reduces damage taken by 1.', '🧿', null),
  ('Shadow Crossbow', 'weapon', 'veteran', 220, null, 'Forged in the shadow layer. Fires bolts that pass through thin walls.', '🏹', null),
  ('Lover''s Lantern', 'utility', 'premium', 0, 25000, 'Works only when both partners carry one. Burns brighter the closer you stand.', '🏮', null),
  ('Ghost Pistol', 'weapon', 'premium', 0, 40000, 'Relic of the old war. Three shots a night — each one unmissable.', '🔫', null),
  ('Twin Compass', 'charm', 'premium', 0, 30000, 'Points toward your partner, always — even across realms.', '🧭', null);
