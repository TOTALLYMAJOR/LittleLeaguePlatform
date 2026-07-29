-- Schedule CRUD hardening: recurring event instances and managed venue metadata.

alter table public.field_locations
  add column if not exists field_label text,
  add column if not exists notes text,
  add column if not exists map_embed_url text,
  add column if not exists google_place_id text;

alter table public.event_series
  add column if not exists field_location_id uuid references public.field_locations(id) on delete set null,
  add column if not exists location_name text,
  add column if not exists location_address text,
  add column if not exists opponent text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

alter table public.events
  add column if not exists recurrence_instance_index integer;

create unique index if not exists idx_events_series_instance
  on public.events(event_series_id, recurrence_instance_index)
  where event_series_id is not null and recurrence_instance_index is not null;

create index if not exists idx_events_field_location_time
  on public.events(field_location_id, starts_at, ends_at)
  where field_location_id is not null;

create index if not exists idx_event_series_field_location
  on public.event_series(field_location_id)
  where field_location_id is not null;

create unique index if not exists idx_field_reservations_event_unique
  on public.field_reservations(event_id)
  where event_id is not null;
