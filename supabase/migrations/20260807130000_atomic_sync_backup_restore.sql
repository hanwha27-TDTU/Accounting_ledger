begin;

-- Storage/backup/restore audit hardening:
-- 1) stale clients can no longer overwrite a newer cloud row;
-- 2) canonical publication is one CAS-protected database transaction;
-- 3) cloud backups are produced from one database statement snapshot;
-- 4) anonymous table privileges are explicitly removed as defense in depth.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  sync_tables constant text[] := array[
    'businesses', 'business_sites', 'ledger_period_settings', 'accounts',
    'counterparties', 'fixed_expenses', 'source_transactions', 'journal_entries',
    'journal_entry_lines', 'evidence_files', 'period_closings'
  ];
  canonical_publish boolean := coalesce(current_setting('accounting.canonical_publish', true), '') = 'on';
begin
  if tg_table_name = any(sync_tables) then
    if new.updated_at is null then
      new.updated_at := now();
    end if;
    if new.updated_at > now() + interval '5 minutes' then
      raise exception 'SYNC_TIMESTAMP_IN_FUTURE' using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' and not canonical_publish and old.updated_at >= new.updated_at then
      return null;
    end if;
    return new;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create schema if not exists accounting_private;
revoke all on schema accounting_private from public, anon, authenticated;

create or replace function accounting_private.apply_rows(
  p_table text,
  p_rows jsonb,
  p_append_only boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  columns_sql text;
  updates_sql text;
begin
  if p_table not in (
    'businesses', 'business_sites', 'ledger_period_settings', 'accounts',
    'counterparties', 'fixed_expenses', 'source_transactions', 'journal_entries',
    'journal_entry_lines', 'evidence_files', 'audit_logs', 'period_closings', 'tombstones'
  ) then
    raise exception 'SYNC_TABLE_INVALID:%', p_table using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_rows, '[]'::jsonb)) > 50000 then
    raise exception 'SYNC_ROWS_INVALID:%', p_table using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_rows, '[]'::jsonb)) = 0 then
    return;
  end if;

  select string_agg(format('%I', a.attname), ', ' order by a.attnum),
         string_agg(format('%1$I = excluded.%1$I', a.attname), ', ' order by a.attnum)
           filter (where a.attname <> 'id')
  into columns_sql, updates_sql
  from pg_catalog.pg_attribute a
  where a.attrelid = format('public.%I', p_table)::regclass
    and a.attnum > 0
    and not a.attisdropped
    and a.attgenerated = '';

  execute format(
    'insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) '
    || 'on conflict (id) do %3$s',
    p_table,
    columns_sql,
    case when p_append_only then 'nothing' else 'update set ' || updates_sql end
  ) using p_rows;
end;
$$;

revoke all on function accounting_private.apply_rows(text, jsonb, boolean) from public, anon, authenticated;

create or replace function public.accounting_publish_canonical(
  p_expected_version bigint,
  p_device_id text,
  p_upserts jsonb,
  p_deletes jsonb,
  p_tombstones jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := nullif(auth.jwt() ->> 'email', '');
  current_version bigint;
  next_version bigint;
  published_at timestamptz := clock_timestamp();
  table_name text;
  rows jsonb;
  total_rows bigint := 0;
  upsert_order constant text[] := array[
    'businesses', 'business_sites', 'ledger_period_settings', 'accounts',
    'counterparties', 'fixed_expenses', 'source_transactions', 'journal_entries',
    'journal_entry_lines', 'evidence_files', 'audit_logs', 'period_closings'
  ];
  delete_order constant text[] := array[
    'period_closings', 'evidence_files', 'journal_entry_lines', 'journal_entries',
    'source_transactions', 'fixed_expenses', 'counterparties', 'accounts',
    'ledger_period_settings', 'business_sites', 'businesses'
  ];
begin
  if actor_id is null or actor_email is null or not exists (
    select 1
    from public.app_allowed_users au
    where lower(au.email::text) = lower(actor_email)
      and au.role = 'owner'
      and au.status = 'active'
      and au.deleted_at is null
  ) then
    raise exception 'CANONICAL_OWNER_ONLY' using errcode = '42501';
  end if;
  if p_expected_version < 0 or length(coalesce(p_device_id, '')) not between 1 and 200
     or jsonb_typeof(coalesce(p_upserts, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_deletes, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_tombstones, '[]'::jsonb)) <> 'array' then
    raise exception 'CANONICAL_PAYLOAD_INVALID' using errcode = '22023';
  end if;

  insert into public.accounting_sync_meta(owner_user_id, key, value, updated_at)
  values (actor_id, 'canonical_version', '0', now())
  on conflict (owner_user_id, key) do nothing;

  select value::bigint into current_version
  from public.accounting_sync_meta
  where owner_user_id = actor_id and key = 'canonical_version'
  for update;

  if current_version <> p_expected_version then
    raise exception 'CANONICAL_VERSION_CONFLICT:%:%', p_expected_version, current_version
      using errcode = '40001';
  end if;
  next_version := current_version + 1;

  foreach table_name in array upsert_order loop
    rows := coalesce(p_upserts -> table_name, '[]'::jsonb);
    if jsonb_typeof(rows) <> 'array' then
      raise exception 'CANONICAL_TABLE_INVALID:%', table_name using errcode = '22023';
    end if;
    total_rows := total_rows + jsonb_array_length(rows);
  end loop;
  foreach table_name in array delete_order loop
    rows := coalesce(p_deletes -> table_name, '[]'::jsonb);
    if jsonb_typeof(rows) <> 'array' then
      raise exception 'CANONICAL_TABLE_INVALID:%', table_name using errcode = '22023';
    end if;
    total_rows := total_rows + jsonb_array_length(rows);
  end loop;
  total_rows := total_rows + jsonb_array_length(p_tombstones);
  if total_rows > 200000 then
    raise exception 'CANONICAL_ROW_LIMIT_EXCEEDED' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(p_upserts -> 'businesses', '[]'::jsonb) || coalesce(p_deletes -> 'businesses', '[]'::jsonb)) r
    where nullif(r ->> 'owner_user_id', '') is not null
      and (r ->> 'owner_user_id')::uuid <> actor_id
  ) then
    raise exception 'CANONICAL_OWNER_SCOPE_INVALID' using errcode = '42501';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_upserts -> 'businesses', '[]'::jsonb) || coalesce(p_deletes -> 'businesses', '[]'::jsonb)) r
    join public.businesses b on b.id = (r ->> 'id')::uuid
    where b.owner_user_id <> actor_id
  ) then
    raise exception 'CANONICAL_OWNER_SCOPE_INVALID' using errcode = '42501';
  end if;

  perform set_config('accounting.canonical_publish', 'on', true);
  p_upserts := jsonb_set(
    p_upserts,
    '{businesses}',
    coalesce((
      select jsonb_agg(jsonb_set(r, '{owner_user_id}', to_jsonb(actor_id), true))
      from jsonb_array_elements(coalesce(p_upserts -> 'businesses', '[]'::jsonb)) r
    ), '[]'::jsonb),
    true
  );

  foreach table_name in array upsert_order loop
    rows := coalesce(p_upserts -> table_name, '[]'::jsonb);
    perform accounting_private.apply_rows(table_name, rows, table_name = 'audit_logs');
  end loop;

  if exists (
    select 1 from jsonb_array_elements(p_tombstones) r
    where nullif(r ->> 'owner_user_id', '') is null or (r ->> 'owner_user_id')::uuid <> actor_id
  ) then
    raise exception 'CANONICAL_TOMBSTONE_SCOPE_INVALID' using errcode = '42501';
  end if;
  perform accounting_private.apply_rows('tombstones', p_tombstones, true);

  -- Every child row in the submitted snapshot must belong to the caller after parent upserts.
  foreach table_name in array array[
    'business_sites', 'ledger_period_settings', 'accounts', 'counterparties',
    'fixed_expenses', 'source_transactions', 'journal_entries', 'journal_entry_lines',
    'evidence_files', 'period_closings'
  ] loop
    rows := coalesce(p_upserts -> table_name, '[]'::jsonb) || coalesce(p_deletes -> table_name, '[]'::jsonb);
    if exists (
      select 1 from jsonb_array_elements(rows) r
      left join public.businesses b on b.id = (r ->> 'business_id')::uuid
      where b.id is null or b.owner_user_id <> actor_id
    ) then
      raise exception 'CANONICAL_BUSINESS_SCOPE_INVALID:%', table_name using errcode = '42501';
    end if;
  end loop;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_upserts -> 'audit_logs', '[]'::jsonb)) r
    left join public.businesses b on b.id = nullif(r ->> 'business_id', '')::uuid
    where nullif(r ->> 'business_id', '') is not null
      and (b.id is null or b.owner_user_id <> actor_id)
  ) then
    raise exception 'CANONICAL_BUSINESS_SCOPE_INVALID:audit_logs' using errcode = '42501';
  end if;

  foreach table_name in array delete_order loop
    perform accounting_private.apply_rows(table_name, coalesce(p_deletes -> table_name, '[]'::jsonb), false);
  end loop;

  update public.accounting_sync_meta
  set value = next_version::text, updated_at = published_at
  where owner_user_id = actor_id and key = 'canonical_version';
  insert into public.accounting_sync_meta(owner_user_id, key, value, updated_at)
  values
    (actor_id, 'canonical_updated_at', published_at::text, published_at),
    (actor_id, 'canonical_device_id', p_device_id, published_at),
    (actor_id, 'last_schema_version', '0.08', published_at)
  on conflict (owner_user_id, key) do update
  set value = excluded.value, updated_at = excluded.updated_at;

  return jsonb_build_object('canonical_version', next_version, 'published_at', published_at);
end;
$$;

revoke all on function public.accounting_publish_canonical(bigint, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.accounting_publish_canonical(bigint, text, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.accounting_export_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := nullif(auth.jwt() ->> 'email', '');
  snapshot jsonb;
begin
  if actor_id is null or actor_email is null or not exists (
    select 1
    from public.app_allowed_users au
    where lower(au.email::text) = lower(actor_email)
      and au.role in ('owner', 'editor', 'viewer')
      and au.status = 'active'
      and au.deleted_at is null
  ) then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select jsonb_build_object(
      'canonical_version', coalesce((select value::bigint from public.accounting_sync_meta where owner_user_id = actor_id and key = 'canonical_version'), 0),
      'captured_at', statement_timestamp(),
      'tables', jsonb_build_object(
        'businesses', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.businesses x where x.owner_user_id = actor_id and x.deleted_at is null), '[]'::jsonb),
        'business_sites', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.business_sites x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'ledger_period_settings', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.ledger_period_settings x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'accounts', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.accounts x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'counterparties', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.counterparties x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'fixed_expenses', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.fixed_expenses x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'source_transactions', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.source_transactions x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'journal_entries', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.journal_entries x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'journal_entry_lines', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.journal_entry_lines x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'evidence_files', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.evidence_files x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'audit_logs', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id) from public.audit_logs x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id), '[]'::jsonb),
        'period_closings', coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.id) from public.period_closings x join public.businesses b on b.id=x.business_id where b.owner_user_id=actor_id and b.deleted_at is null and x.deleted_at is null), '[]'::jsonb),
        'tombstones', coalesce((select jsonb_agg(to_jsonb(x) order by x.deleted_at desc, x.id) from public.tombstones x where x.owner_user_id=actor_id), '[]'::jsonb)
      )
    ) into snapshot;

  return snapshot;
end;
$$;

revoke all on function public.accounting_export_snapshot() from public, anon;
grant execute on function public.accounting_export_snapshot() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_allowed_users', 'auth_access_logs', 'businesses', 'business_sites',
    'ledger_period_settings', 'standard_accounts', 'accounts', 'account_explanations',
    'account_aliases', 'counterparties', 'fixed_expenses', 'source_transactions',
    'journal_entries', 'journal_entry_lines', 'payment_events', 'payment_allocations',
    'evidence_documents', 'evidence_files', 'imports', 'import_rows', 'assets',
    'depreciation_schedules', 'nts_industry_codes', 'business_tax_profiles',
    'business_activity_profiles', 'tax_determinations', 'tax_year_rules',
    'legal_reference_checks', 'legal_form_snapshots', 'income_tax_report_drafts',
    'vat_summary_drafts', 'major_expense_items', 'decision_notes', 'app_research_notes',
    'audit_logs', 'period_closings', 'accounting_sync_meta', 'tombstones'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('revoke all on table public.%I from anon', t);
    end if;
  end loop;
end $$;

insert into public.accounting_sync_meta(owner_user_id, key, value, updated_at)
select u.id, 'last_schema_version', '0.08', now()
from auth.users u
where lower(u.email) = 'hanwha27@gmail.com'
on conflict (owner_user_id, key) do update
set value = excluded.value, updated_at = excluded.updated_at;

commit;
