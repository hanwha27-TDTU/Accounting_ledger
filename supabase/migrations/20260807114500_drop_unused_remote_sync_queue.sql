-- The application queue is IndexedDB-only. Retire the obsolete remote table only
-- when it is still empty; unexpected data or dependencies must stop this migration.
do $$
begin
  if to_regclass('public.sync_queue') is null then
    return;
  end if;

  if exists (select 1 from public.sync_queue limit 1) then
    raise exception 'public.sync_queue is not empty; refusing destructive retirement';
  end if;
end
$$;

drop table if exists public.sync_queue;
