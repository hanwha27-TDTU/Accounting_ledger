-- Accounting Ledger V1: universal money contract and daily FX audit metadata.
-- Existing KRW and legacy overseas rows are backfilled without changing posted KRW totals.

begin;

alter table public.source_transactions
  add column if not exists currency_code text,
  add column if not exists original_amount numeric(24,4),
  add column if not exists exchange_rate_to_krw numeric(24,10),
  add column if not exists exchange_rate_date date,
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_fetched_at timestamptz,
  add column if not exists exchange_rate_manual boolean not null default false;

update public.source_transactions
set currency_code = case
      when foreign_currency is not null and foreign_currency ~ '^[A-Za-z]{3}$' then upper(foreign_currency)
      else 'KRW'
    end,
    original_amount = coalesce(foreign_amount, total_amount),
    exchange_rate_to_krw = coalesce(exchange_rate, 1),
    exchange_rate_date = case when foreign_currency is not null then transaction_date else null end,
    exchange_rate_source = case when foreign_currency is not null then 'LEGACY_MANUAL' else 'KRW' end,
    exchange_rate_manual = foreign_currency is not null
where currency_code is null
   or original_amount is null
   or exchange_rate_to_krw is null;

alter table public.source_transactions
  alter column currency_code set default 'KRW',
  alter column currency_code set not null,
  alter column exchange_rate_to_krw set default 1,
  alter column exchange_rate_to_krw set not null;

alter table public.fixed_expenses
  add column if not exists currency_code text,
  add column if not exists original_amount numeric(24,4),
  add column if not exists exchange_rate_to_krw numeric(24,10),
  add column if not exists exchange_rate_date date,
  add column if not exists exchange_rate_source text,
  add column if not exists exchange_rate_fetched_at timestamptz,
  add column if not exists exchange_rate_manual boolean not null default false;

update public.fixed_expenses
set currency_code = 'KRW',
    original_amount = amount,
    exchange_rate_to_krw = 1,
    exchange_rate_source = 'KRW',
    exchange_rate_manual = false
where currency_code is null
   or original_amount is null
   or exchange_rate_to_krw is null;

alter table public.fixed_expenses
  alter column currency_code set default 'KRW',
  alter column currency_code set not null,
  alter column exchange_rate_to_krw set default 1,
  alter column exchange_rate_to_krw set not null;

alter table public.source_transactions
  add constraint source_transactions_currency_code_format
    check (currency_code ~ '^[A-Z]{3}$') not valid,
  add constraint source_transactions_original_amount_positive
    check (original_amount > 0) not valid,
  add constraint source_transactions_exchange_rate_positive
    check (exchange_rate_to_krw > 0) not valid;

alter table public.fixed_expenses
  add constraint fixed_expenses_currency_code_format
    check (currency_code ~ '^[A-Z]{3}$') not valid,
  add constraint fixed_expenses_original_amount_positive
    check (original_amount > 0) not valid,
  add constraint fixed_expenses_exchange_rate_positive
    check (exchange_rate_to_krw > 0) not valid;

comment on column public.source_transactions.total_amount is
  'KRW posting amount. Original currency and the immutable conversion evidence live in currency_code/original_amount/exchange_rate_*.';
comment on column public.fixed_expenses.amount is
  'KRW estimate captured when the schedule was saved. UI may show a newer daily estimate without rewriting history.';

insert into public.accounting_sync_meta (key, value)
values ('last_schema_version', '0.06')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

insert into public.app_research_notes (
  app_version, skill_version, note_type, title, body, source_type, source_ref
) values (
  '0.60', 'Sub_app-research-notes_0.78', 'schema_review',
  'Universal money and daily FX metadata added',
  'Added a backward-compatible universal money contract to source_transactions and fixed_expenses. Posted and scheduled KRW amounts remain unchanged; original currency, original amount, KRW rate, rate date, source, fetch time, and manual-override status are retained for audit and synced by the existing LWW/canonical lifecycle.',
  'migration', '20260802000800_accounting_v1_multicurrency_daily_fx'
);

commit;
