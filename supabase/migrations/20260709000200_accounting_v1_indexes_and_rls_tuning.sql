-- Accounting Ledger V1: FK index coverage and RLS policy tuning.
-- Project: News&Accounting / ihxiywffzmvrwmqvatzt
-- App version remains 0.00 because the HTML app has not been shipped yet.

begin;

create index if not exists idx_account_aliases_business_id on public.account_aliases (business_id);
create index if not exists idx_account_aliases_standard_account_id on public.account_aliases (standard_account_id);
create index if not exists idx_account_explanations_standard_account_id on public.account_explanations (standard_account_id);
create index if not exists idx_accounts_business_id on public.accounts (business_id);
create index if not exists idx_accounts_standard_account_id on public.accounts (standard_account_id);
create index if not exists idx_assets_business_id on public.assets (business_id);
create index if not exists idx_assets_source_transaction_id on public.assets (source_transaction_id);
create index if not exists idx_audit_logs_business_id on public.audit_logs (business_id);
create index if not exists idx_business_activity_profiles_business_id on public.business_activity_profiles (business_id);
create index if not exists idx_business_sites_business_id on public.business_sites (business_id);
create index if not exists idx_business_tax_profiles_business_id on public.business_tax_profiles (business_id);
create index if not exists idx_businesses_owner_user_id on public.businesses (owner_user_id);
create index if not exists idx_counterparties_business_id on public.counterparties (business_id);
create index if not exists idx_decision_notes_business_id on public.decision_notes (business_id);
create index if not exists idx_depreciation_schedules_asset_id on public.depreciation_schedules (asset_id);
create index if not exists idx_depreciation_schedules_business_id on public.depreciation_schedules (business_id);
create index if not exists idx_evidence_documents_business_id on public.evidence_documents (business_id);
create index if not exists idx_evidence_files_business_id on public.evidence_files (business_id);
create index if not exists idx_evidence_files_evidence_document_id on public.evidence_files (evidence_document_id);
create index if not exists idx_evidence_files_source_transaction_id on public.evidence_files (source_transaction_id);
create index if not exists idx_import_rows_business_id on public.import_rows (business_id);
create index if not exists idx_import_rows_import_id on public.import_rows (import_id);
create index if not exists idx_import_rows_source_transaction_id on public.import_rows (source_transaction_id);
create index if not exists idx_imports_business_id on public.imports (business_id);
create index if not exists idx_income_tax_report_drafts_business_id on public.income_tax_report_drafts (business_id);
create index if not exists idx_income_tax_report_drafts_form_snapshot_id on public.income_tax_report_drafts (form_snapshot_id);
create index if not exists idx_income_tax_report_drafts_source_check_id on public.income_tax_report_drafts (source_check_id);
create index if not exists idx_journal_entries_business_id on public.journal_entries (business_id);
create index if not exists idx_journal_entries_source_transaction_id on public.journal_entries (source_transaction_id);
create index if not exists idx_journal_entry_lines_account_id on public.journal_entry_lines (account_id);
create index if not exists idx_journal_entry_lines_business_id on public.journal_entry_lines (business_id);
create index if not exists idx_journal_entry_lines_journal_entry_id on public.journal_entry_lines (journal_entry_id);
create index if not exists idx_ledger_period_settings_business_id on public.ledger_period_settings (business_id);
create index if not exists idx_legal_form_snapshots_source_check_id on public.legal_form_snapshots (source_check_id);
create index if not exists idx_major_expense_items_business_id on public.major_expense_items (business_id);
create index if not exists idx_major_expense_items_source_transaction_id on public.major_expense_items (source_transaction_id);
create index if not exists idx_payment_allocations_business_id on public.payment_allocations (business_id);
create index if not exists idx_payment_allocations_payment_event_id on public.payment_allocations (payment_event_id);
create index if not exists idx_payment_allocations_source_transaction_id on public.payment_allocations (source_transaction_id);
create index if not exists idx_payment_events_business_id on public.payment_events (business_id);
create index if not exists idx_payment_events_counterparty_id on public.payment_events (counterparty_id);
create index if not exists idx_period_closings_business_id on public.period_closings (business_id);
create index if not exists idx_source_transactions_account_id on public.source_transactions (account_id);
create index if not exists idx_source_transactions_business_id on public.source_transactions (business_id);
create index if not exists idx_source_transactions_business_site_id on public.source_transactions (business_site_id);
create index if not exists idx_source_transactions_counterparty_id on public.source_transactions (counterparty_id);
create index if not exists idx_tax_determinations_business_id on public.tax_determinations (business_id);
create index if not exists idx_tombstones_business_id on public.tombstones (business_id);
create index if not exists idx_vat_summary_drafts_business_id on public.vat_summary_drafts (business_id);

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
      and b.owner_user_id = (select auth.uid())
      and b.deleted_at is null
  )
$$;

drop policy if exists "authenticated can insert auth access logs" on public.auth_access_logs;
create policy "authenticated can insert auth access logs"
on public.auth_access_logs
for insert
to authenticated
with check (
  actor_user_id is null
  or actor_user_id = (select auth.uid())
  or public.accounting_is_bootstrap_owner()
);

drop policy if exists "owners can read their businesses" on public.businesses;
create policy "owners can read their businesses"
on public.businesses
for select
to authenticated
using (owner_user_id = (select auth.uid()) and deleted_at is null);

drop policy if exists "allowed users can create own businesses" on public.businesses;
create policy "allowed users can create own businesses"
on public.businesses
for insert
to authenticated
with check (owner_user_id = (select auth.uid()) and public.accounting_is_allowed_user());

drop policy if exists "owners can update their businesses" on public.businesses;
create policy "owners can update their businesses"
on public.businesses
for update
to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

drop policy if exists "owners can delete their businesses" on public.businesses;
create policy "owners can delete their businesses"
on public.businesses
for delete
to authenticated
using (owner_user_id = (select auth.uid()));

insert into public.app_research_notes (
  app_version,
  skill_version,
  note_type,
  title,
  body,
  source_type,
  source_ref
)
values (
  '0.00',
  'Sub_v1-scope_0.01',
  'schema_review',
  'Supabase FK index coverage and RLS tuning',
  'Supabase advisors were run after the initial V1 schema migration. Accounting tables received FK covering indexes and selected auth.uid() RLS expressions were wrapped for better policy planning. Existing non-accounting public tables were intentionally left untouched.',
  'migration',
  '20260709000200_accounting_v1_indexes_and_rls_tuning'
);

commit;
