-- Accounting Ledger V1: overseas transaction fields (additive, nullable, backward-compatible).
-- Adds FX/currency and an overseas flag to source_transactions for VAT reverse-charge (§52) context.
-- Non-destructive: only ADD COLUMN + schema metadata. Existing rows default is_overseas=false.
-- RLS/policies unchanged (row-level security continues to apply to the new columns).

begin;

alter table public.source_transactions
  add column if not exists is_overseas boolean not null default false,
  add column if not exists foreign_currency text,
  add column if not exists foreign_amount numeric(18,2),
  add column if not exists exchange_rate numeric(18,6);

insert into public.accounting_sync_meta (key, value)
values ('last_schema_version', '0.04')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

insert into public.app_research_notes (
  app_version, skill_version, note_type, title, body, source_type, source_ref
) values (
  '0.29', 'Sub_tax-vat-classification_0.06', 'schema_review',
  'Overseas transaction fields added',
  'Added nullable is_overseas/foreign_currency/foreign_amount/exchange_rate to source_transactions for overseas purchase tracking (VAT reverse-charge context and FX conversion). Additive and backward-compatible; RLS unchanged; existing rows default is_overseas=false.',
  'migration', '20260712000500_accounting_v1_overseas_fields'
);

commit;
