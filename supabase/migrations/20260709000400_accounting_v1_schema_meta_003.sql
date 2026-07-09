-- Accounting Ledger V1: schema metadata after initial advisor cleanup.
-- App version remains 0.00; schema baseline is now 0.03.

begin;

insert into public.accounting_sync_meta (key, value)
values ('last_schema_version', '0.03')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

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
  'Schema metadata updated to 0.03',
  'The database schema metadata now reflects the initial schema, FK/RLS tuning, and duplicate-index cleanup migrations. The user-facing app file has not shipped yet, so app_version remains 0.00.',
  'migration',
  '20260709000400_accounting_v1_schema_meta_003'
);

commit;
