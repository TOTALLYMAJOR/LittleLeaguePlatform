-- Let parents cancel an RSVP without deleting attendance history.

alter table public.rsvps
  drop constraint if exists rsvps_response_check;

alter table public.rsvps
  add constraint rsvps_response_check check (response in ('going', 'not_going', 'maybe', 'cancelled'));
