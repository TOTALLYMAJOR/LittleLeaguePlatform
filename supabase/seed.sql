-- Demo data for the first Supabase-backed registration slice.
-- Profiles are intentionally not seeded here because they must map to real auth.users rows.

insert into public.organizations (id, name)
values ('11111111-1111-4111-8111-111111111111', 'Little League HQ')
on conflict (id) do nothing;

insert into public.seasons (id, organization_id, name, status, starts_at, ends_at)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Spring 2026',
  'active',
  '2026-03-01T00:00:00.000Z',
  '2026-06-15T23:59:59.000Z'
)
on conflict (id) do nothing;

insert into public.teams (
  id,
  organization_id,
  season_id,
  division,
  name,
  mascot,
  primary_color,
  secondary_color,
  theme_key
)
values
  (
    '33333333-3333-4333-8333-333333333331',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '3U',
    'Tiny Tigers',
    'Tiger Cub',
    '#f97316',
    '#1d4ed8',
    'baseball'
  ),
  (
    '33333333-3333-4333-8333-333333333332',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '3U',
    'Rookie Rockets',
    'Rocket',
    '#dc2626',
    '#facc15',
    'soccer'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '5U',
    'Happy Hawks',
    'Hawk',
    '#0f766e',
    '#fde047',
    'scouts'
  ),
  (
    '33333333-3333-4333-8333-333333333334',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '6U',
    'Green Comets',
    'Comet',
    '#16a34a',
    '#38bdf8',
    'swim'
  )
on conflict (id) do nothing;
