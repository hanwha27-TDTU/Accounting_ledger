-- Accounting Ledger V1: cover the fixed_expenses.account_id foreign key.
-- Supabase performance advisor requires a leading index for FK maintenance.

begin;

create index if not exists idx_fixed_expenses_account_id
  on public.fixed_expenses(account_id);

commit;
