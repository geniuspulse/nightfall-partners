-- ============================================================
-- NIGHTFALL PARTNERS — Chapter 1: The Hunt + Chapter 2 stub
-- ============================================================

insert into public.missions (night_number, title, summary, status)
values (1, 'The Hunt', 'A calm evening hunt turns into a rescue. The forest is safe; the settlement is not. Introduces the Nightstone.', 'available')
on conflict (night_number) do nothing;

insert into public.missions (night_number, title, summary, status)
values (2, 'The Trail', 'The Nightstone is a name with no home. Follow the clawprints north. (Coming soon.)', 'locked')
on conflict (night_number) do nothing;
