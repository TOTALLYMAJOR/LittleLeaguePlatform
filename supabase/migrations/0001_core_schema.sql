-- Little League HQ production contract draft.
-- This migration is documentation-ready and not required by the local typed adapter.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  status text not null check (status in ('active', 'archived')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  season_id uuid not null references seasons(id),
  division text not null,
  name text not null,
  coach_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  season_id uuid not null references seasons(id),
  team_id uuid not null references teams(id),
  first_name text not null,
  last_initial text not null,
  jersey text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table player_guardians (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  parent_user_id uuid,
  parent_invite_id uuid,
  relationship text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  status text not null check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table parent_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  team_id uuid not null references teams(id),
  player_id uuid not null references players(id),
  email text not null,
  phone text,
  invite_token_hash text not null,
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')),
  sent_count integer not null default 0,
  last_sent_at timestamptz,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  team_id uuid not null references teams(id),
  season_id uuid not null references seasons(id),
  title text not null,
  event_type text not null check (event_type in ('game', 'practice', 'team_event')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_name text,
  location_address text,
  status text not null check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  player_id uuid not null references players(id),
  parent_user_id uuid not null,
  response text not null check (response in ('going', 'not_going', 'maybe')),
  note text,
  responded_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  recipient_user_id uuid not null,
  team_id uuid not null references teams(id),
  event_id uuid references events(id),
  notification_type text not null,
  title text not null,
  body text not null,
  channel text not null check (channel in ('push', 'email', 'sms')),
  status text not null check (status in ('pending', 'sent', 'failed', 'read')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

create table roster_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  season_id uuid not null references seasons(id),
  uploaded_by_user_id uuid not null,
  filename text,
  status text not null check (status in ('uploaded', 'validated', 'committed', 'failed')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  error_rows integer not null default 0,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create table roster_import_rows (
  id uuid primary key default gen_random_uuid(),
  roster_import_id uuid not null references roster_imports(id),
  row_number integer not null,
  raw_data_json jsonb not null,
  normalized_data_json jsonb not null,
  status text not null check (status in ('valid', 'warning', 'error', 'skipped')),
  issue_codes_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table media_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  team_id uuid not null references teams(id),
  title text not null,
  media_type text not null check (media_type in ('google_photos', 'youtube')),
  url text not null,
  created_at timestamptz not null default now()
);

create table team_chat_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  season_id uuid not null references seasons(id),
  team_id uuid not null references teams(id),
  pinned_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id)
);

create table team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  season_id uuid not null references seasons(id),
  team_id uuid not null references teams(id),
  channel_id uuid not null references team_chat_channels(id),
  event_id uuid references events(id),
  author_user_id uuid not null,
  author_role text not null check (author_role in ('admin', 'coach', 'parent')),
  message_kind text not null check (message_kind in ('message', 'announcement')),
  announcement_topic text check (announcement_topic in ('game_time', 'field_location', 'uniforms', 'snacks', 'weather', 'reminder')),
  body text not null,
  pinned boolean not null default false,
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'hidden', 'deleted')),
  read_by_user_ids_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  moderated_at timestamptz,
  moderated_by_user_id uuid,
  moderation_reason text
);

alter table team_chat_channels
  add constraint team_chat_channels_pinned_message_id_fkey
  foreign key (pinned_message_id) references team_chat_messages(id);

create table chat_moderation_audit_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references team_chat_messages(id),
  channel_id uuid not null references team_chat_channels(id),
  team_id uuid not null references teams(id),
  actor_user_id uuid not null,
  actor_role text not null check (actor_role in ('admin', 'coach', 'parent')),
  action text not null check (action in ('message_hidden', 'message_deleted', 'message_restored')),
  reason text not null,
  created_at timestamptz not null default now()
);

create index idx_team_chat_messages_channel_id on team_chat_messages(channel_id);
create index idx_team_chat_messages_event_id on team_chat_messages(event_id);
create index idx_chat_moderation_audit_events_message_id on chat_moderation_audit_events(message_id);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  actor_user_id uuid,
  action text not null,
  target_type text not null,
  target_id text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
