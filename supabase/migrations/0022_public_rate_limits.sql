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
set search_path = public
as $$
declare
  current_hit_count integer;
begin
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
