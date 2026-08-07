-- Keep owner-scoped tombstone lookups and foreign-key maintenance indexed.
create index if not exists idx_tombstones_owner_user_id
  on public.tombstones(owner_user_id);
