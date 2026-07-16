-- Media upload storage pipeline. Uploaded files stay private and pending until
-- coach/admin moderation approves the media row for family-visible reads.

alter table public.media_items
  drop constraint if exists media_items_media_type_check;

alter table public.media_items
  add constraint media_items_media_type_check
  check (media_type in ('google_photos', 'youtube', 'uploaded_image', 'uploaded_video'));

alter table public.media_items
  add column if not exists uploaded_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists byte_size integer check (byte_size is null or byte_size > 0),
  add column if not exists upload_status text not null default 'external_link'
    check (upload_status in ('external_link', 'intent_created', 'uploaded', 'quarantined', 'removed')),
  add column if not exists scan_status text not null default 'not_applicable'
    check (scan_status in ('not_applicable', 'pending', 'passed', 'flagged', 'not_configured')),
  add column if not exists uploaded_at timestamptz,
  add column if not exists takedown_requested_at timestamptz,
  add column if not exists takedown_reason text,
  add column if not exists retention_policy text not null default 'season_archive_window';

create unique index if not exists idx_media_items_storage_object
  on public.media_items(storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;

create index if not exists idx_media_items_upload_review
  on public.media_items(team_id, upload_status, scan_status, moderation_status);
