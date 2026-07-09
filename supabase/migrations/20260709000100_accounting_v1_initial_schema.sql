-- Accounting Ledger V1 initial schema
-- Project: News&Accounting / ihxiywffzmvrwmqvatzt
-- Created: 2026-07-09
--
-- Safe intent:
-- - Adds accounting-ledger tables without touching existing news/vocab tables.
-- - Keeps RLS enabled on every exposed table.
-- - Adds explicit grants for Supabase Data API compatibility after 2026 default grant changes.

begin;

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_allowed_users (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext unique not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  status text not null check (status in ('active', 'blocked', 'pending')),
  label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create or replace function public.accounting_current_email()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'email', '')
$$;

create or replace function public.accounting_is_bootstrap_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(coalesce(public.accounting_current_email(), '')) = 'hanwha27@gmail.com'
$$;

create or replace function public.accounting_is_allowed_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_allowed_users au
    where lower(au.email::text) = lower(coalesce(public.accounting_current_email(), ''))
      and au.status = 'active'
      and au.deleted_at is null
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.auth_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email extensions.citext,
  action text not null,
  target_email extensions.citext,
  result text,
  detail jsonb,
  created_at timestamptz default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_type text not null check (business_type in ('individual', 'corporation', 'freelancer', 'joint', 'other')),
  name text not null,
  registration_number text,
  representative_name text,
  tax_profile_status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.business_sites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  site_name text not null,
  address text,
  main_industry_code text,
  main_industry_name text,
  opened_on date,
  closed_on date,
  is_primary boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.ledger_period_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ledger_start_year int not null default 2025,
  ledger_start_date date not null default date '2025-01-01',
  first_import_year int,
  opening_balance_date date,
  retroactive_import_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.standard_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text,
  account_name text not null,
  account_type text not null,
  nts_term boolean default true,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  standard_account_id uuid references public.standard_accounts(id),
  account_code text,
  account_name text not null,
  account_type text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.account_explanations (
  id uuid primary key default gen_random_uuid(),
  standard_account_id uuid references public.standard_accounts(id) on delete cascade,
  title text not null,
  easy_description text not null,
  example_text text,
  caution_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.account_aliases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  standard_account_id uuid references public.standard_accounts(id),
  alias_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.counterparties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  registration_number text,
  contact text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.source_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  business_site_id uuid references public.business_sites(id),
  transaction_date date not null,
  recognition_date date,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'asset_purchase', 'asset_sale', 'transfer', 'payment_only')),
  description text,
  counterparty_id uuid references public.counterparties(id),
  account_id uuid references public.accounts(id),
  supply_amount numeric(18,2) default 0,
  vat_amount numeric(18,2) default 0,
  total_amount numeric(18,2) not null,
  vat_type text,
  evidence_status text default 'not_attached',
  payment_status text default 'unpaid',
  review_status text default 'normal',
  source_channel text default 'manual',
  source_revision int default 1,
  posting_rule_version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_transaction_id uuid references public.source_transactions(id) on delete set null,
  entry_date date not null,
  status text default 'generated',
  generated_from text default 'source_transaction',
  posting_rule_version text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  debit_amount numeric(18,2) default 0,
  credit_amount numeric(18,2) default 0,
  line_memo text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint journal_entry_lines_nonnegative check (debit_amount >= 0 and credit_amount >= 0),
  constraint journal_entry_lines_one_side check (
    (debit_amount > 0 and credit_amount = 0)
    or (credit_amount > 0 and debit_amount = 0)
  )
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_date date not null,
  payment_method text,
  direction text not null check (direction in ('in', 'out')),
  amount numeric(18,2) not null,
  account_label text,
  counterparty_id uuid references public.counterparties(id),
  source_channel text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_event_id uuid not null references public.payment_events(id) on delete cascade,
  source_transaction_id uuid not null references public.source_transactions(id) on delete cascade,
  allocated_amount numeric(18,2) not null,
  allocation_type text not null,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.evidence_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  evidence_type text,
  document_date date,
  issuer_name text,
  issuer_registration_number text,
  total_amount numeric(18,2),
  vat_amount numeric(18,2),
  tax_treatment_hint text,
  review_status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  evidence_document_id uuid references public.evidence_documents(id) on delete set null,
  source_transaction_id uuid references public.source_transactions(id) on delete set null,
  storage_provider text default 'cloudinary',
  cloudinary_public_id text,
  resource_type text,
  secure_url text,
  thumbnail_url text,
  original_filename text,
  mime_type text,
  file_size bigint,
  file_hash text,
  page_count int,
  preview_status text,
  future_ocr_text text,
  manual_summary text,
  future_ai_summary text,
  future_ai_status text default 'not_configured',
  upload_status text default 'uploaded',
  delete_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  import_type text not null,
  original_filename text,
  file_hash text,
  status text default 'pending',
  row_count int default 0,
  confirmed_count int default 0,
  failed_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  import_id uuid not null references public.imports(id) on delete cascade,
  row_number int not null,
  row_hash text,
  raw_row jsonb not null,
  parsed_row jsonb,
  match_status text default 'pending',
  source_transaction_id uuid references public.source_transactions(id) on delete set null,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_transaction_id uuid references public.source_transactions(id) on delete set null,
  asset_name text not null,
  acquisition_date date,
  acquisition_amount numeric(18,2),
  useful_life_years int,
  depreciation_method text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.depreciation_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  tax_year int not null,
  depreciation_amount numeric(18,2),
  accumulated_depreciation numeric(18,2),
  report_candidate boolean default true,
  user_confirmed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.nts_industry_codes (
  id uuid primary key default gen_random_uuid(),
  tax_year int not null,
  industry_code text not null,
  industry_name text not null,
  major_category text,
  middle_category text,
  minor_category text,
  detail_category text,
  business_type_name text,
  standard_industry_code text,
  standard_industry_name text,
  simple_expense_rate numeric(8,4),
  standard_expense_rate numeric(8,4),
  source_check_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique (tax_year, industry_code)
);

create table if not exists public.business_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year int not null,
  taxpayer_entity_type text,
  vat_payer_type_candidate text,
  vat_payer_type_confirmed text,
  book_obligation_candidate text,
  book_obligation_confirmed text,
  main_industry_code text,
  previous_year_revenue numeric(18,2),
  requires_review boolean default true,
  source_check_id uuid,
  user_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.business_activity_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year int not null,
  broad_category text,
  detail_category text,
  activity_description text,
  has_human_facility boolean,
  has_physical_facility boolean,
  professional_candidate boolean default false,
  medical_candidate boolean default false,
  creator_candidate boolean default false,
  agriculture_candidate boolean default false,
  requires_review boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.tax_determinations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year int not null,
  determination_type text not null,
  candidate_value text,
  confirmed_value text,
  confidence text,
  requires_review boolean default true,
  reason text,
  source_check_id uuid,
  user_note_id uuid,
  user_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.tax_year_rules (
  id uuid primary key default gen_random_uuid(),
  tax_year int not null,
  rule_type text not null,
  rule_key text not null,
  rule_value jsonb not null,
  source_check_id uuid,
  confidence text default 'official_checked',
  requires_review boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.legal_reference_checks (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  tax_year int,
  source_type text,
  source_name text,
  source_url text,
  law_name text,
  law_id text,
  mst text,
  article text,
  annex_kind text,
  form_no text,
  form_name text,
  byl_seq text,
  form_revision_date date,
  file_format text,
  effective_date date,
  snapshot_hash text,
  checked_at timestamptz default now(),
  checked_by text,
  summary text,
  raw_snapshot jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.legal_form_snapshots (
  id uuid primary key default gen_random_uuid(),
  tax_year int not null,
  report_type text not null,
  law_name text not null,
  law_id text,
  mst text,
  effective_date date,
  annex_kind text not null,
  form_no text not null,
  form_name text not null,
  byl_seq text,
  form_revision_date date,
  file_format text,
  source_url text,
  source_check_id uuid references public.legal_reference_checks(id) on delete set null,
  snapshot_hash text not null,
  raw_snapshot jsonb not null,
  is_current_for_tax_year boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.income_tax_report_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year int not null,
  filing_type_candidate text,
  book_obligation_candidate text,
  gross_revenue numeric(18,2),
  necessary_expenses numeric(18,2),
  income_amount numeric(18,2),
  requires_review boolean default true,
  source_check_id uuid references public.legal_reference_checks(id) on delete set null,
  form_snapshot_id uuid references public.legal_form_snapshots(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.vat_summary_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year int not null,
  period_label text,
  taxable_sales_supply numeric(18,2) default 0,
  taxable_sales_vat numeric(18,2) default 0,
  exempt_sales numeric(18,2) default 0,
  purchase_supply numeric(18,2) default 0,
  purchase_vat numeric(18,2) default 0,
  non_deductible_vat numeric(18,2) default 0,
  requires_review boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.major_expense_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year int not null,
  expense_type text not null,
  amount numeric(18,2) not null,
  evidence_status text,
  source_transaction_id uuid references public.source_transactions(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.decision_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  note_type text not null,
  title text,
  body text,
  status text default 'draft',
  confidence text,
  source_type text,
  source_ref_id uuid,
  reviewed_by_user boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.app_research_notes (
  id uuid primary key default gen_random_uuid(),
  app_version text,
  skill_version text,
  note_type text not null,
  title text not null,
  body text,
  related_file text,
  related_commit text,
  source_type text,
  source_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  actor_user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.period_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_type text not null,
  period_start date not null,
  period_end date not null,
  status text default 'open',
  closed_at timestamptz,
  reopened_at timestamptz,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.accounting_sync_meta (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

create table if not exists public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  operation text not null,
  payload jsonb,
  status text default 'pending',
  retry_count int default 0,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.tombstones (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  business_id uuid references public.businesses(id) on delete cascade,
  deleted_at timestamptz not null,
  deleted_by_device_id text,
  reason text,
  created_at timestamptz default now()
);

create or replace function public.accounting_can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_user_id = auth.uid()
      and b.deleted_at is null
  )
$$;

create or replace view public.simple_book_rows
with (security_invoker = true)
as
select
  st.id,
  st.business_id,
  st.transaction_date,
  extract(month from st.transaction_date)::int as transaction_month,
  extract(day from st.transaction_date)::int as transaction_day,
  coalesce(a.account_name, sa.account_name) as account_name,
  st.description,
  cp.name as counterparty_name,
  case when st.transaction_type = 'income' then st.supply_amount end as income_supply_amount,
  case when st.transaction_type = 'income' then st.vat_amount end as income_vat_amount,
  case when st.transaction_type = 'expense' then st.supply_amount end as expense_supply_amount,
  case when st.transaction_type = 'expense' then st.vat_amount end as expense_vat_amount,
  case when st.transaction_type in ('asset_purchase', 'asset_sale') then st.supply_amount end as asset_amount,
  case when st.transaction_type in ('asset_purchase', 'asset_sale') then st.vat_amount end as asset_vat_amount,
  st.evidence_status,
  st.payment_status,
  st.review_status,
  st.updated_at
from public.source_transactions st
left join public.accounts a on a.id = st.account_id
left join public.standard_accounts sa on sa.id = a.standard_account_id
left join public.counterparties cp on cp.id = st.counterparty_id
where st.deleted_at is null;

create index if not exists idx_businesses_owner on public.businesses(owner_user_id);
create index if not exists idx_business_sites_business on public.business_sites(business_id);
create index if not exists idx_accounts_business on public.accounts(business_id);
create index if not exists idx_counterparties_business on public.counterparties(business_id);
create index if not exists idx_source_transactions_business_date on public.source_transactions(business_id, transaction_date desc);
create index if not exists idx_source_transactions_updated on public.source_transactions(updated_at desc);
create index if not exists idx_journal_entries_source on public.journal_entries(source_transaction_id);
create index if not exists idx_journal_lines_entry on public.journal_entry_lines(journal_entry_id);
create index if not exists idx_payment_events_business_date on public.payment_events(business_id, payment_date desc);
create index if not exists idx_evidence_files_business on public.evidence_files(business_id);
create index if not exists idx_import_rows_import on public.import_rows(import_id);
create index if not exists idx_assets_business on public.assets(business_id);
create index if not exists idx_tax_rules_year_type on public.tax_year_rules(tax_year, rule_type);
create index if not exists idx_legal_forms_year_report on public.legal_form_snapshots(tax_year, report_type);
create index if not exists idx_decision_notes_target on public.decision_notes(target_type, target_id);
create index if not exists idx_sync_queue_status on public.sync_queue(status, updated_at);
create index if not exists idx_tombstones_entity on public.tombstones(entity_type, entity_id);

insert into public.app_allowed_users (email, role, status, label)
values ('hanwha27@gmail.com', 'owner', 'active', 'bootstrap owner')
on conflict (email) do update
set role = excluded.role,
    status = excluded.status,
    label = excluded.label,
    updated_at = now();

insert into public.accounting_sync_meta (key, value)
values
  ('canonical_version', '0'),
  ('canonical_updated_at', null),
  ('canonical_device_id', null),
  ('last_schema_version', '0.01')
on conflict (key) do nothing;

insert into public.app_research_notes (app_version, skill_version, note_type, title, body, source_type, source_ref)
values (
  '0.00',
  'Sub_v1-scope_0.01',
  'design_decision',
  'Supabase V1 initial schema migration',
  'Initial accounting-ledger V1 schema created for News&Accounting project. Existing news/vocab tables are intentionally untouched.',
  'migration',
  '20260709000100_accounting_v1_initial_schema'
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_allowed_users',
    'businesses',
    'business_sites',
    'ledger_period_settings',
    'standard_accounts',
    'accounts',
    'account_explanations',
    'account_aliases',
    'counterparties',
    'source_transactions',
    'journal_entries',
    'journal_entry_lines',
    'payment_events',
    'payment_allocations',
    'evidence_documents',
    'evidence_files',
    'imports',
    'import_rows',
    'assets',
    'depreciation_schedules',
    'nts_industry_codes',
    'business_tax_profiles',
    'business_activity_profiles',
    'tax_determinations',
    'tax_year_rules',
    'legal_reference_checks',
    'legal_form_snapshots',
    'income_tax_report_drafts',
    'vat_summary_drafts',
    'major_expense_items',
    'decision_notes',
    'app_research_notes',
    'period_closings',
    'accounting_sync_meta',
    'sync_queue'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_allowed_users',
    'auth_access_logs',
    'businesses',
    'business_sites',
    'ledger_period_settings',
    'standard_accounts',
    'accounts',
    'account_explanations',
    'account_aliases',
    'counterparties',
    'source_transactions',
    'journal_entries',
    'journal_entry_lines',
    'payment_events',
    'payment_allocations',
    'evidence_documents',
    'evidence_files',
    'imports',
    'import_rows',
    'assets',
    'depreciation_schedules',
    'nts_industry_codes',
    'business_tax_profiles',
    'business_activity_profiles',
    'tax_determinations',
    'tax_year_rules',
    'legal_reference_checks',
    'legal_form_snapshots',
    'income_tax_report_drafts',
    'vat_summary_drafts',
    'major_expense_items',
    'decision_notes',
    'app_research_notes',
    'audit_logs',
    'period_closings',
    'accounting_sync_meta',
    'sync_queue',
    'tombstones'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on public.app_allowed_users to authenticated;
grant insert on public.auth_access_logs to authenticated;
grant select on public.auth_access_logs to authenticated;
grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.business_sites to authenticated;
grant select, insert, update, delete on public.ledger_period_settings to authenticated;
grant select, insert, update, delete on public.standard_accounts to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.account_explanations to authenticated;
grant select, insert, update, delete on public.account_aliases to authenticated;
grant select, insert, update, delete on public.counterparties to authenticated;
grant select, insert, update, delete on public.source_transactions to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_entry_lines to authenticated;
grant select, insert, update, delete on public.payment_events to authenticated;
grant select, insert, update, delete on public.payment_allocations to authenticated;
grant select, insert, update, delete on public.evidence_documents to authenticated;
grant select, insert, update, delete on public.evidence_files to authenticated;
grant select, insert, update, delete on public.imports to authenticated;
grant select, insert, update, delete on public.import_rows to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.depreciation_schedules to authenticated;
grant select, insert, update, delete on public.nts_industry_codes to authenticated;
grant select, insert, update, delete on public.business_tax_profiles to authenticated;
grant select, insert, update, delete on public.business_activity_profiles to authenticated;
grant select, insert, update, delete on public.tax_determinations to authenticated;
grant select, insert, update, delete on public.tax_year_rules to authenticated;
grant select, insert, update, delete on public.legal_reference_checks to authenticated;
grant select, insert, update, delete on public.legal_form_snapshots to authenticated;
grant select, insert, update, delete on public.income_tax_report_drafts to authenticated;
grant select, insert, update, delete on public.vat_summary_drafts to authenticated;
grant select, insert, update, delete on public.major_expense_items to authenticated;
grant select, insert, update, delete on public.decision_notes to authenticated;
grant select, insert, update, delete on public.app_research_notes to authenticated;
grant select, insert, update, delete on public.audit_logs to authenticated;
grant select, insert, update, delete on public.period_closings to authenticated;
grant select, insert, update, delete on public.accounting_sync_meta to authenticated;
grant select, insert, update, delete on public.sync_queue to authenticated;
grant select, insert, update, delete on public.tombstones to authenticated;
grant select on public.simple_book_rows to authenticated, service_role;

create policy "app allowed users can read own row or owner can read all"
on public.app_allowed_users
for select
to authenticated
using (
  lower(email::text) = lower(coalesce(public.accounting_current_email(), ''))
  or public.accounting_is_bootstrap_owner()
);

create policy "bootstrap owner can insert allowed users"
on public.app_allowed_users
for insert
to authenticated
with check (public.accounting_is_bootstrap_owner());

create policy "bootstrap owner can update allowed users"
on public.app_allowed_users
for update
to authenticated
using (public.accounting_is_bootstrap_owner())
with check (public.accounting_is_bootstrap_owner());

create policy "bootstrap owner can delete allowed users"
on public.app_allowed_users
for delete
to authenticated
using (public.accounting_is_bootstrap_owner());

create policy "authenticated can insert auth access logs"
on public.auth_access_logs
for insert
to authenticated
with check (actor_user_id is null or actor_user_id = auth.uid() or public.accounting_is_bootstrap_owner());

create policy "bootstrap owner can read auth access logs"
on public.auth_access_logs
for select
to authenticated
using (public.accounting_is_bootstrap_owner());

create policy "owners can read their businesses"
on public.businesses
for select
to authenticated
using (owner_user_id = auth.uid() and deleted_at is null);

create policy "allowed users can create own businesses"
on public.businesses
for insert
to authenticated
with check (owner_user_id = auth.uid() and public.accounting_is_allowed_user());

create policy "owners can update their businesses"
on public.businesses
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "owners can delete their businesses"
on public.businesses
for delete
to authenticated
using (owner_user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'business_sites',
    'ledger_period_settings',
    'accounts',
    'account_aliases',
    'counterparties',
    'source_transactions',
    'journal_entries',
    'journal_entry_lines',
    'payment_events',
    'payment_allocations',
    'evidence_documents',
    'evidence_files',
    'imports',
    'import_rows',
    'assets',
    'depreciation_schedules',
    'business_tax_profiles',
    'business_activity_profiles',
    'tax_determinations',
    'income_tax_report_drafts',
    'vat_summary_drafts',
    'major_expense_items',
    'decision_notes',
    'period_closings'
  ]
  loop
    execute format('create policy "business scoped select" on public.%I for select to authenticated using (public.accounting_can_access_business(business_id) and deleted_at is null)', t);
    execute format('create policy "business scoped insert" on public.%I for insert to authenticated with check (public.accounting_can_access_business(business_id))', t);
    execute format('create policy "business scoped update" on public.%I for update to authenticated using (public.accounting_can_access_business(business_id)) with check (public.accounting_can_access_business(business_id))', t);
    execute format('create policy "business scoped delete" on public.%I for delete to authenticated using (public.accounting_can_access_business(business_id))', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'standard_accounts',
    'account_explanations',
    'nts_industry_codes',
    'tax_year_rules',
    'legal_reference_checks',
    'legal_form_snapshots',
    'app_research_notes',
    'accounting_sync_meta'
  ]
  loop
    execute format('create policy "allowed users can read reference data" on public.%I for select to authenticated using (public.accounting_is_allowed_user())', t);
    execute format('create policy "bootstrap owner can insert reference data" on public.%I for insert to authenticated with check (public.accounting_is_bootstrap_owner())', t);
    execute format('create policy "bootstrap owner can update reference data" on public.%I for update to authenticated using (public.accounting_is_bootstrap_owner()) with check (public.accounting_is_bootstrap_owner())', t);
    execute format('create policy "bootstrap owner can delete reference data" on public.%I for delete to authenticated using (public.accounting_is_bootstrap_owner())', t);
  end loop;
end $$;

create policy "allowed users can read sync queue"
on public.sync_queue
for select
to authenticated
using (public.accounting_is_allowed_user() and deleted_at is null);

create policy "allowed users can insert sync queue"
on public.sync_queue
for insert
to authenticated
with check (public.accounting_is_allowed_user());

create policy "allowed users can update sync queue"
on public.sync_queue
for update
to authenticated
using (public.accounting_is_allowed_user())
with check (public.accounting_is_allowed_user());

create policy "allowed users can delete sync queue"
on public.sync_queue
for delete
to authenticated
using (public.accounting_is_allowed_user());

create policy "allowed users can read tombstones"
on public.tombstones
for select
to authenticated
using (
  (business_id is null and public.accounting_is_allowed_user())
  or public.accounting_can_access_business(business_id)
);

create policy "allowed users can insert tombstones"
on public.tombstones
for insert
to authenticated
with check (
  (business_id is null and public.accounting_is_allowed_user())
  or public.accounting_can_access_business(business_id)
);

create policy "allowed users can read audit logs"
on public.audit_logs
for select
to authenticated
using (
  (business_id is null and public.accounting_is_bootstrap_owner())
  or public.accounting_can_access_business(business_id)
);

create policy "allowed users can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (
  (business_id is null and public.accounting_is_allowed_user())
  or public.accounting_can_access_business(business_id)
);

commit;
