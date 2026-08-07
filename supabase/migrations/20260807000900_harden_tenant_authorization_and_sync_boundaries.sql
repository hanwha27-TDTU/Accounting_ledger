begin;

-- Security audit hardening for tenant authorization, canonical metadata, deletion signals,
-- the unused remote queue, and owner-visible authorization audit events.

create or replace function public.accounting_current_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select au.role
  from public.app_allowed_users au
  where lower(au.email::text) = lower(coalesce(public.accounting_current_email(), ''))
    and au.status = 'active'
    and au.deleted_at is null
  limit 1
$$;

create or replace function public.accounting_can_read_ledgers()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(public.accounting_current_role() in ('owner', 'editor', 'viewer'), false)
$$;

create or replace function public.accounting_can_write_ledgers()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(public.accounting_current_role() in ('owner', 'editor'), false)
$$;

create or replace function public.accounting_can_admin_ledgers()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(public.accounting_current_role() = 'owner', false)
$$;

create or replace function public.accounting_can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.accounting_can_read_ledgers() and exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_user_id = (select auth.uid())
      and b.deleted_at is null
  )
$$;

drop policy if exists "owners can read their businesses" on public.businesses;
create policy "owners can read their businesses"
on public.businesses for select to authenticated
using (
  public.accounting_can_read_ledgers()
  and owner_user_id = (select auth.uid())
  and deleted_at is null
);

drop policy if exists "allowed users can create own businesses" on public.businesses;
create policy "allowed users can create own businesses"
on public.businesses for insert to authenticated
with check (
  public.accounting_can_write_ledgers()
  and owner_user_id = (select auth.uid())
);

drop policy if exists "owners can update their businesses" on public.businesses;
create policy "owners can update their businesses"
on public.businesses for update to authenticated
using (public.accounting_can_write_ledgers() and owner_user_id = (select auth.uid()))
with check (public.accounting_can_write_ledgers() and owner_user_id = (select auth.uid()));

drop policy if exists "owners can delete their businesses" on public.businesses;
create policy "owners can delete their businesses"
on public.businesses for delete to authenticated
using (public.accounting_can_admin_ledgers() and owner_user_id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'business_sites', 'ledger_period_settings', 'accounts', 'account_aliases',
    'counterparties', 'fixed_expenses', 'source_transactions', 'journal_entries',
    'journal_entry_lines', 'payment_events', 'payment_allocations', 'evidence_documents',
    'evidence_files', 'imports', 'import_rows', 'assets', 'depreciation_schedules',
    'business_tax_profiles', 'business_activity_profiles', 'tax_determinations',
    'income_tax_report_drafts', 'vat_summary_drafts', 'major_expense_items',
    'decision_notes', 'period_closings'
  ]
  loop
    execute format('drop policy if exists "business scoped select" on public.%I', t);
    execute format('drop policy if exists "business scoped insert" on public.%I', t);
    execute format('drop policy if exists "business scoped update" on public.%I', t);
    execute format('drop policy if exists "business scoped delete" on public.%I', t);
    execute format('create policy "business scoped select" on public.%I for select to authenticated using (public.accounting_can_access_business(business_id) and deleted_at is null)', t);
    execute format('create policy "business scoped insert" on public.%I for insert to authenticated with check (public.accounting_can_write_ledgers() and public.accounting_can_access_business(business_id))', t);
    execute format('create policy "business scoped update" on public.%I for update to authenticated using (public.accounting_can_write_ledgers() and public.accounting_can_access_business(business_id)) with check (public.accounting_can_write_ledgers() and public.accounting_can_access_business(business_id))', t);
    execute format('create policy "business scoped delete" on public.%I for delete to authenticated using (public.accounting_can_admin_ledgers() and public.accounting_can_access_business(business_id))', t);
  end loop;
end $$;

-- Tombstones retain immutable owner scope even after their parent business becomes soft-deleted.
alter table public.tombstones add column if not exists owner_user_id uuid references auth.users(id);

update public.tombstones t
set owner_user_id = b.owner_user_id
from public.businesses b
where t.owner_user_id is null
  and b.id = coalesce(t.business_id, case when t.entity_type = 'businesses' then t.entity_id end);

drop policy if exists "allowed users can read tombstones" on public.tombstones;
drop policy if exists "allowed users can insert tombstones" on public.tombstones;
create policy "owners can read tombstones"
on public.tombstones for select to authenticated
using (public.accounting_can_read_ledgers() and owner_user_id = (select auth.uid()));
create policy "owners can insert tombstones"
on public.tombstones for insert to authenticated
with check (
  public.accounting_can_write_ledgers()
  and owner_user_id = (select auth.uid())
  and (business_id is null or public.accounting_can_access_business(business_id))
  and deleted_at <= now() + interval '5 minutes'
);

-- canonical_version is per owner. A final-version action must never supersede another user's queue.
alter table public.accounting_sync_meta add column if not exists owner_user_id uuid references auth.users(id);
update public.accounting_sync_meta
set owner_user_id = (
  select u.id from auth.users u where lower(u.email) = 'hanwha27@gmail.com' limit 1
)
where owner_user_id is null;

do $$
begin
  if exists (select 1 from public.accounting_sync_meta where owner_user_id is null) then
    raise exception 'Cannot scope accounting_sync_meta: bootstrap owner auth user is missing';
  end if;
end $$;

alter table public.accounting_sync_meta drop constraint if exists accounting_sync_meta_pkey;
alter table public.accounting_sync_meta alter column owner_user_id set not null;
alter table public.accounting_sync_meta add constraint accounting_sync_meta_pkey primary key (owner_user_id, key);

drop policy if exists "allowed users can read reference data" on public.accounting_sync_meta;
drop policy if exists "bootstrap owner can insert reference data" on public.accounting_sync_meta;
drop policy if exists "bootstrap owner can update reference data" on public.accounting_sync_meta;
drop policy if exists "bootstrap owner can delete reference data" on public.accounting_sync_meta;
create policy "owners can read own sync metadata"
on public.accounting_sync_meta for select to authenticated
using (public.accounting_can_read_ledgers() and owner_user_id = (select auth.uid()));
create policy "owners can insert own sync metadata"
on public.accounting_sync_meta for insert to authenticated
with check (public.accounting_can_admin_ledgers() and owner_user_id = (select auth.uid()));
create policy "owners can update own sync metadata"
on public.accounting_sync_meta for update to authenticated
using (public.accounting_can_admin_ledgers() and owner_user_id = (select auth.uid()))
with check (public.accounting_can_admin_ledgers() and owner_user_id = (select auth.uid()));
create policy "owners can delete own sync metadata"
on public.accounting_sync_meta for delete to authenticated
using (public.accounting_can_admin_ledgers() and owner_user_id = (select auth.uid()));

-- The web app queue is IndexedDB-only. Keep the unused public table inaccessible until a
-- tenant-scoped server consumer is explicitly designed.
revoke all on table public.sync_queue from anon, authenticated;
drop policy if exists "allowed users can read sync queue" on public.sync_queue;
drop policy if exists "allowed users can insert sync queue" on public.sync_queue;
drop policy if exists "allowed users can update sync queue" on public.sync_queue;
drop policy if exists "allowed users can delete sync queue" on public.sync_queue;

-- Authorization events are owner admin actions. The RPC derives actor identity from the JWT;
-- direct client INSERT is revoked so a caller cannot forge another actor.
revoke insert on table public.auth_access_logs from authenticated;
drop policy if exists "authenticated can insert auth access logs" on public.auth_access_logs;

create or replace function public.accounting_log_access_event(
  p_action text,
  p_target_email text,
  p_result text default 'success'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  next_id uuid := extensions.gen_random_uuid();
begin
  if auth.uid() is null or not public.accounting_is_bootstrap_owner() then
    raise exception 'AUTH_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_action not in ('allowlist_add', 'allowlist_reactivate', 'allowlist_revoke')
     or p_result <> 'success'
     or length(coalesce(p_target_email, '')) > 320 then
    raise exception 'AUTH_EVENT_INVALID' using errcode = '22023';
  end if;
  insert into public.auth_access_logs (
    id, actor_user_id, actor_email, action, target_email, result, detail, created_at
  ) values (
    next_id, auth.uid(), public.accounting_current_email(), p_action,
    nullif(lower(trim(p_target_email)), ''), p_result, null, now()
  );
  return next_id;
end;
$$;

revoke all on function public.accounting_log_access_event(text, text, text) from public, anon;
grant execute on function public.accounting_log_access_event(text, text, text) to authenticated;

insert into public.accounting_sync_meta (owner_user_id, key, value)
select u.id, 'last_schema_version', '0.07'
from auth.users u
where lower(u.email) = 'hanwha27@gmail.com'
on conflict (owner_user_id, key) do update
set value = excluded.value, updated_at = now();

commit;
