-- Media Governance V2: explicit visibility and hide/restore/remove workflow.

alter table public.media_items
  drop constraint if exists media_items_moderation_status_check;

alter table public.media_items
  add constraint media_items_moderation_status_check
  check (moderation_status in ('pending', 'approved', 'hidden', 'rejected', 'removed'));

alter table public.media_items
  add column if not exists visibility text not null default 'team'
    check (visibility in ('team', 'organization')),
  add column if not exists hidden_at timestamptz,
  add column if not exists removed_at timestamptz;

create index if not exists idx_media_items_visibility_status
  on public.media_items(team_id, visibility, moderation_status);
