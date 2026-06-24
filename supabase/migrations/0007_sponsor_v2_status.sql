-- Sponsor Management V2 status workflow.

alter table public.sponsors
  drop constraint if exists sponsors_status_check;

alter table public.sponsors
  add constraint sponsors_status_check
  check (status in ('pending', 'active', 'expired'));
