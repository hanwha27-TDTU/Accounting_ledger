-- Accounting Ledger V1: remove duplicate indexes introduced by FK coverage tuning.
-- These indexes duplicated names already created by the initial schema migration.

begin;

drop index if exists public.idx_accounts_business_id;
drop index if exists public.idx_assets_business_id;
drop index if exists public.idx_business_sites_business_id;
drop index if exists public.idx_businesses_owner_user_id;
drop index if exists public.idx_counterparties_business_id;
drop index if exists public.idx_evidence_files_business_id;
drop index if exists public.idx_import_rows_import_id;
drop index if exists public.idx_journal_entries_source_transaction_id;
drop index if exists public.idx_journal_entry_lines_journal_entry_id;

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
  'Supabase duplicate index cleanup',
  'After FK coverage tuning, Supabase performance advisors reported duplicate indexes where the initial schema already had equivalent indexes. The duplicate _id-suffixed indexes were removed and the original index names were kept.',
  'migration',
  '20260709000300_accounting_v1_drop_duplicate_indexes'
);

commit;
