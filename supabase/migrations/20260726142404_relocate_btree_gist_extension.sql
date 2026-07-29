-- Keep extension-owned objects out of the exposed public schema.
-- Existing exclusion constraints reference operator classes by OID, so moving
-- this relocatable extension does not rebuild or weaken those constraints.

create schema if not exists extensions;
alter extension btree_gist set schema extensions;
