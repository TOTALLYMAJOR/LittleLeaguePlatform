-- Admin Theme Studio tenant-level defaults for future teams.

alter table public.organizations
  add column if not exists default_theme_key text not null default 'baseball'
    check (default_theme_key in ('soccer', 'football', 'baseball', 'scouts', 'golf', 'tennis', 'swim', 'generic')),
  add column if not exists default_mascot text not null default 'Team',
  add column if not exists default_primary_color text not null default '#174ea6',
  add column if not exists default_secondary_color text not null default '#fbbc04',
  add column if not exists logo_status text not null default 'not_configured'
    check (logo_status in ('not_configured', 'queued', 'approved'));
