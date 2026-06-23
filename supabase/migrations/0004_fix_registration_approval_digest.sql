-- Fix invite hash generation for environments where pgcrypto.digest only accepts bytea.

create or replace function public.digest(data text, algorithm text)
returns bytea
language sql
immutable
strict
as $$
  select extensions.digest(convert_to(data, 'UTF8'), algorithm);
$$;
