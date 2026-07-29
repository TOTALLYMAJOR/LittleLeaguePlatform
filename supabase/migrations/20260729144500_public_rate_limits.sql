-- Durable public intake rate limits for unauthenticated endpoints.

create table if not exists public.public_rate_limit_buckets (
  bucket_key text primary key,
  route_key text not null,
  window_start timestamptz not null,
  expires_at timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_rate_limit_buckets_expires_at
  on public.public_rate_limit_buckets(expires_at);

create or replace function public.claim_public_rate_limit(
  p_bucket_key text,
  p_route_key text,
  p_window_start timestamptz,
  p_expires_at timestamptz,
  p_limit integer
)
returns table(hit_count integer, allowed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_hit_count integer;
  expected_limit integer;
begin
  expected_limit := case p_route_key
    when 'registration-requests' then 5
    when 'mobile-usage-events' then 120
    else null
  end;

  if expected_limit is null
    or p_limit is distinct from expected_limit
    or p_bucket_key is null
    or char_length(p_bucket_key) not between 1 and 256
    or p_window_start is null
    or p_expires_at is null
    or p_expires_at <= p_window_start
    or p_expires_at > p_window_start + interval '10 minutes'
  then
    raise exception 'Invalid public rate-limit claim.'
      using errcode = '22023';
  end if;

  delete from public.public_rate_limit_buckets
  where expires_at < now();

  insert into public.public_rate_limit_buckets (
    bucket_key,
    route_key,
    window_start,
    expires_at,
    hit_count,
    updated_at
  )
  values (
    p_bucket_key,
    p_route_key,
    p_window_start,
    p_expires_at,
    1,
    now()
  )
  on conflict (bucket_key)
  do update set
    hit_count = public.public_rate_limit_buckets.hit_count + 1,
    updated_at = now()
  returning public.public_rate_limit_buckets.hit_count into current_hit_count;

  return query select current_hit_count, current_hit_count <= p_limit;
end;
$$;

alter table public.public_rate_limit_buckets enable row level security;

revoke all on table public.public_rate_limit_buckets from public, anon, authenticated;
grant all on table public.public_rate_limit_buckets to service_role;

revoke all on function public.claim_public_rate_limit(text, text, timestamptz, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.claim_public_rate_limit(text, text, timestamptz, timestamptz, integer)
  to service_role;
