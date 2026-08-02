-- Accounting Ledger V1: recurring fixed-expense management.
-- Adds a business-scoped schedule table and an optional source transaction link.
-- Card/account data is intentionally limited to the last four digits.

begin;

create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  category text,
  expense_name text not null,
  amount_mode text not null default 'fixed' check (amount_mode in ('fixed', 'variable')),
  amount numeric(18,2) not null check (amount > 0),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  next_due_date date not null,
  billing_anchor_month smallint not null check (billing_anchor_month between 1 and 12),
  billing_anchor_day smallint not null check (billing_anchor_day between 1 and 31),
  payment_method text,
  payment_provider text,
  payment_reference_last4 text check (payment_reference_last4 is null or payment_reference_last4 ~ '^[0-9]{4}$'),
  is_required boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  started_on date,
  ended_on date,
  last_booked_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.source_transactions
  add column if not exists fixed_expense_id uuid references public.fixed_expenses(id) on delete set null;

create index if not exists idx_fixed_expenses_business_status_due
  on public.fixed_expenses(business_id, status, next_due_date)
  where deleted_at is null;
create index if not exists idx_fixed_expenses_updated
  on public.fixed_expenses(updated_at desc, id asc);
create index if not exists idx_source_transactions_fixed_expense
  on public.source_transactions(fixed_expense_id)
  where fixed_expense_id is not null;

drop trigger if exists set_updated_at on public.fixed_expenses;
create trigger set_updated_at
before update on public.fixed_expenses
for each row execute function public.set_updated_at();

alter table public.fixed_expenses enable row level security;

revoke all on table public.fixed_expenses from anon;
grant select, insert, update, delete on table public.fixed_expenses to authenticated, service_role;

drop policy if exists "business scoped select" on public.fixed_expenses;
create policy "business scoped select"
on public.fixed_expenses for select to authenticated
using (public.accounting_can_access_business(business_id) and deleted_at is null);

drop policy if exists "business scoped insert" on public.fixed_expenses;
create policy "business scoped insert"
on public.fixed_expenses for insert to authenticated
with check (public.accounting_can_access_business(business_id));

drop policy if exists "business scoped update" on public.fixed_expenses;
create policy "business scoped update"
on public.fixed_expenses for update to authenticated
using (public.accounting_can_access_business(business_id))
with check (public.accounting_can_access_business(business_id));

drop policy if exists "business scoped delete" on public.fixed_expenses;
create policy "business scoped delete"
on public.fixed_expenses for delete to authenticated
using (public.accounting_can_access_business(business_id));

insert into public.accounting_sync_meta (key, value)
values ('last_schema_version', '0.05')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

insert into public.app_research_notes (
  app_version, skill_version, note_type, title, body, source_type, source_ref
) values (
  '0.59', 'Sub_app-research-notes_0.77', 'schema_review',
  'Fixed expense schedule added',
  'Added business-scoped fixed_expenses with RLS, LWW timestamps, soft-delete support, recurring due dates, masked payment references, and an optional source_transactions link. Schema version advanced to 0.05.',
  'migration', '20260802000600_accounting_v1_fixed_expenses'
);

commit;
