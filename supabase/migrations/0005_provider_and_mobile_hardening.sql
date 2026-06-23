-- Provider and mobile hardening for weather, maps, media, push, and chat retention.

alter table public.media_items
  add column if not exists moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected', 'removed')),
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists report_count integer not null default 0;

alter table public.field_locations
  add column if not exists google_place_id text,
  add column if not exists map_embed_url text;

alter table public.weather_alerts
  add column if not exists expires_at timestamptz,
  add column if not exists reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists idx_media_items_moderation_status on public.media_items(team_id, moderation_status);
create index if not exists idx_weather_alerts_event_status on public.weather_alerts(event_id, status);
create index if not exists idx_push_subscriptions_enabled on public.push_subscriptions(user_id, enabled);

create or replace function public.purge_expired_team_chat_messages(retention_cutoff timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  purged_count integer;
begin
  update public.team_chat_messages
  set
    body = '[deleted after retention period]',
    moderation_status = 'deleted',
    deleted_at = coalesce(deleted_at, now()),
    moderation_reason = coalesce(moderation_reason, 'Deleted by retention policy.')
  where retained_until is not null
    and retained_until <= retention_cutoff
    and moderation_status <> 'deleted';

  get diagnostics purged_count = row_count;
  return purged_count;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'team_chat_messages'
    ) then
      alter publication supabase_realtime add table public.team_chat_messages;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'chat_moderation_audit_events'
    ) then
      alter publication supabase_realtime add table public.chat_moderation_audit_events;
    end if;
  end if;
end $$;
