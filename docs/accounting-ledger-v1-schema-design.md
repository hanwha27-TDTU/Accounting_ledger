# Accounting Ledger V1 Schema Design

> 작성일: 2026-07-09  
> 상태: V1 데이터/스키마 상세 설계  
> 목적: Supabase, IndexedDB, JSON 백업이 같은 도메인 구조를 공유하도록 기준을 고정한다.

## 1. 공통 원칙

모든 동기화 대상 테이블은 아래 공통 필드를 가진다.

```sql
id uuid primary key,
created_at timestamptz default now(),
updated_at timestamptz default now(),
deleted_at timestamptz
```

사업장 단위 데이터는 기본적으로 `business_id uuid not null`을 가진다. 사용자가 직접 소유하는 최상위 데이터는 `owner_user_id uuid` 또는 허용 사용자 정책으로 보호한다.

공통 규칙:

1. hard delete는 하지 않는다.
2. 모든 변경은 `updated_at`을 갱신한다.
3. 삭제는 `deleted_at` 또는 tombstone으로 동기화한다.
4. Supabase 조회 기본 정렬은 `updated_at desc`다.
5. 클라이언트에는 service role key를 넣지 않는다.

## 2. 인증/권한

### 2.1 app_allowed_users

```sql
app_allowed_users (
  id uuid primary key,
  email citext unique not null,
  role text not null,
  status text not null,
  label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

초기 seed:

```sql
insert into app_allowed_users (id, email, role, status, label)
values (gen_random_uuid(), 'hanwha27@gmail.com', 'owner', 'active', 'bootstrap owner')
on conflict (email) do nothing;
```

### 2.2 auth_access_logs

```sql
auth_access_logs (
  id uuid primary key,
  actor_user_id uuid,
  actor_email citext,
  action text not null,
  target_email citext,
  result text,
  detail jsonb,
  created_at timestamptz default now()
)
```

## 3. 사업자/사업장

```sql
businesses (
  id uuid primary key,
  owner_user_id uuid not null,
  business_type text not null,
  name text not null,
  registration_number text,
  representative_name text,
  tax_profile_status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
business_sites (
  id uuid primary key,
  business_id uuid not null,
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
```

```sql
ledger_period_settings (
  id uuid primary key,
  business_id uuid not null,
  ledger_start_year int not null default 2025,
  ledger_start_date date not null default '2025-01-01',
  first_import_year int,
  opening_balance_date date,
  retroactive_import_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 4. 계정과목/용어 설명

```sql
standard_accounts (
  id uuid primary key,
  account_code text,
  account_name text not null,
  account_type text not null,
  nts_term boolean default true,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
accounts (
  id uuid primary key,
  business_id uuid not null,
  standard_account_id uuid,
  account_code text,
  account_name text not null,
  account_type text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
account_explanations (
  id uuid primary key,
  standard_account_id uuid,
  title text not null,
  easy_description text not null,
  example_text text,
  caution_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 5. 원천거래와 전표

### 5.1 source_transactions

```sql
source_transactions (
  id uuid primary key,
  business_id uuid not null,
  business_site_id uuid,
  transaction_date date not null,
  recognition_date date,
  transaction_type text not null,
  description text,
  counterparty_id uuid,
  account_id uuid,
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
```

`transaction_type` 후보:

| 값 | 의미 |
|---|---|
| `income` | 수입/매출 |
| `expense` | 비용 |
| `asset_purchase` | 사업용 자산 취득 |
| `asset_sale` | 사업용 자산 매각 |
| `transfer` | 계좌간 이체 |
| `payment_only` | 결제/상환 이벤트 후보 |

### 5.2 journal_entries / journal_entry_lines

```sql
journal_entries (
  id uuid primary key,
  business_id uuid not null,
  source_transaction_id uuid,
  entry_date date not null,
  status text default 'generated',
  generated_from text default 'source_transaction',
  posting_rule_version text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
journal_entry_lines (
  id uuid primary key,
  business_id uuid not null,
  journal_entry_id uuid not null,
  account_id uuid not null,
  debit_amount numeric(18,2) default 0,
  credit_amount numeric(18,2) default 0,
  line_memo text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

차변 합계와 대변 합계는 항상 같아야 한다.

## 6. 결제/정산

```sql
payment_events (
  id uuid primary key,
  business_id uuid not null,
  payment_date date not null,
  payment_method text,
  direction text not null,
  amount numeric(18,2) not null,
  account_label text,
  counterparty_id uuid,
  source_channel text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
payment_allocations (
  id uuid primary key,
  business_id uuid not null,
  payment_event_id uuid not null,
  source_transaction_id uuid not null,
  allocated_amount numeric(18,2) not null,
  allocation_type text not null,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

카드대금 출금, 은행출금, PG 입금은 신규 손익을 만들지 않고 기존 채권/채무를 상환하거나 수수료 등을 분리한다.

## 7. 증빙

```sql
evidence_documents (
  id uuid primary key,
  business_id uuid not null,
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
```

```sql
evidence_files (
  id uuid primary key,
  business_id uuid not null,
  evidence_document_id uuid,
  source_transaction_id uuid,
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
```

## 8. import/export

```sql
imports (
  id uuid primary key,
  business_id uuid not null,
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
```

```sql
import_rows (
  id uuid primary key,
  business_id uuid not null,
  import_id uuid not null,
  row_number int not null,
  row_hash text,
  raw_row jsonb not null,
  parsed_row jsonb,
  match_status text default 'pending',
  source_transaction_id uuid,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 9. 자산/감가상각

```sql
assets (
  id uuid primary key,
  business_id uuid not null,
  source_transaction_id uuid,
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
```

```sql
depreciation_schedules (
  id uuid primary key,
  business_id uuid not null,
  asset_id uuid not null,
  tax_year int not null,
  depreciation_amount numeric(18,2),
  accumulated_depreciation numeric(18,2),
  report_candidate boolean default true,
  user_confirmed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 10. 세무 기준/리포트

```sql
tax_year_rules (
  id uuid primary key,
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
```

```sql
legal_reference_checks (
  id uuid primary key,
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
  raw_snapshot jsonb
);
```

```sql
legal_form_snapshots (
  id uuid primary key,
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
  source_check_id uuid,
  snapshot_hash text not null,
  raw_snapshot jsonb not null,
  is_current_for_tax_year boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
income_tax_report_drafts (
  id uuid primary key,
  business_id uuid not null,
  tax_year int not null,
  filing_type_candidate text,
  book_obligation_candidate text,
  gross_revenue numeric(18,2),
  necessary_expenses numeric(18,2),
  income_amount numeric(18,2),
  requires_review boolean default true,
  source_check_id uuid,
  form_snapshot_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

```sql
vat_summary_drafts (
  id uuid primary key,
  business_id uuid not null,
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
```

## 11. 메모/감사/마감

```sql
decision_notes (
  id uuid primary key,
  business_id uuid not null,
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
```

```sql
app_research_notes (
  id uuid primary key,
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
```

```sql
audit_logs (
  id uuid primary key,
  business_id uuid,
  actor_user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz default now()
);
```

```sql
period_closings (
  id uuid primary key,
  business_id uuid not null,
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
```

## 12. 동기화 메타/대기열

```sql
accounting_sync_meta (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
```

```sql
sync_queue (
  id uuid primary key,
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
```

```sql
tombstones (
  id uuid primary key,
  entity_type text not null,
  entity_id uuid not null,
  business_id uuid,
  deleted_at timestamptz not null,
  deleted_by_device_id text,
  reason text,
  created_at timestamptz default now()
);
```

## 13. IndexedDB store 설계

IndexedDB store 이름은 Supabase 테이블명과 최대한 맞춘다.

| Store | 역할 |
|---|---|
| `businesses` | 사업자 캐시 |
| `business_sites` | 사업장 캐시 |
| `source_transactions` | 원천거래 |
| `journal_entries` | 전표 |
| `journal_entry_lines` | 전표라인 |
| `payment_events` | 결제/수금 |
| `payment_allocations` | 결제 배분 |
| `evidence_documents` | 증빙 문서 메타 |
| `evidence_files` | Cloudinary 파일 메타 |
| `imports` | import 작업 |
| `import_rows` | 원본 행 |
| `assets` | 자산대장 |
| `tax_year_rules` | 세무 기준 캐시 |
| `legal_form_snapshots` | 법정서식 스냅샷 |
| `decision_notes` | 거래 판단메모 |
| `sync_queue` | 오프라인 작업 대기열 |
| `tombstones` | 삭제 동기화 |

## 14. RLS 설계 초안

V1은 owner 1명 중심이다. 모든 사업장 데이터는 `business_id`를 통해 owner가 확인되어야 한다.

정책 방향:

1. `app_allowed_users.email = auth.jwt()->>'email'`이고 `status='active'`인 사용자만 접근 가능.
2. `businesses.owner_user_id = auth.uid()`인 사업자만 조회/수정 가능.
3. 하위 테이블은 `business_id`로 `businesses`에 연결해 owner를 확인한다.
4. service role 전용 작업은 클라이언트 HTML에서 호출하지 않는다.

RLS 구현은 별도 SQL migration에서 확정한다.

## 15. 백업 포맷

JSON 백업 최상위 구조:

```json
{
  "backupSchemaVersion": "0.01",
  "appVersion": "0.00",
  "createdAt": "2026-07-09T00:00:00.000Z",
  "deviceId": "device-id",
  "tables": {
    "businesses": [],
    "source_transactions": [],
    "journal_entries": [],
    "evidence_files": []
  },
  "tombstones": [],
  "legalSnapshots": [],
  "warnings": []
}
```

V1 백업은 암호화하지 않는다. 대신 파일 생성 시 민감자료 보관 경고를 표시한다.

## 16. 실제 SQL 적용본

2026-07-09 기준 Supabase `News&Accounting` 프로젝트(`ihxiywffzmvrwmqvatzt`)에 아래 migration을 적용했다.

| 로컬 파일 | 원격 migration name | 원격 version |
|---|---|---|
| `supabase/migrations/20260709000100_accounting_v1_initial_schema.sql` | `accounting_v1_initial_schema` | `20260709123018` |
| `supabase/migrations/20260709000200_accounting_v1_indexes_and_rls_tuning.sql` | `accounting_v1_indexes_and_rls_tuning` | `20260709123349` |
| `supabase/migrations/20260709000300_accounting_v1_drop_duplicate_indexes.sql` | `accounting_v1_drop_duplicate_indexes` | `20260709123504` |
| `supabase/migrations/20260709000400_accounting_v1_schema_meta_003.sql` | `accounting_v1_schema_meta_003` | `20260709123556` |

검증 기준:

| 항목 | 결과 |
|---|---|
| 회계 테이블 | 38개 |
| RLS 적용 | 38/38 |
| FK 보조 인덱스 누락 | 0개 |
| owner allowlist | `hanwha27@gmail.com` |
| `accounting_sync_meta.last_schema_version` | `0.03` |
| `accounting_sync_meta.canonical_version` | `0` |

Supabase advisor 잔여 항목 중 security ERROR/WARN은 기존 비회계 테이블(`news_items`, `language_sync_meta`, `vocab_items`, `usmle_cards`) 관련이다. 회계 신규 테이블에는 별도 security advisor 이슈가 확인되지 않았다. Performance 잔여 항목은 앱 사용 전 신규 인덱스의 `unused_index` INFO다.
