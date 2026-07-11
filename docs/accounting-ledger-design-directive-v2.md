# Accounting Ledger Design Directive v2

> 개정일: 2026-07-09  
> 목적: 대한민국 개인사업자용 간편장부 + 복식부기 통합 회계 프로그램의 설계 기준을 개발 전 고정한다.  
> 원칙: 초안의 회계 코어는 유지하되, 동기화·증빙 미디어·법령 기준 추적·단일 HTML 운영 구조를 앞단에 보강한다.

## 0. 최상위 결론

### 앱 목적 (미션)

이 앱은 **초등학생도 이해할 수 있을 만큼 쉬운 화면으로 수입·지출을 관리하면서, 그 기록이 내부적으로는 복식부기 SSOT와 최신 법정서식·세법 근거로 뒷받침되어, 사용자가 세무사에게 맡기지 않고도 스스로 국세청에 세무사 수준의 최신 법적 신고자료를 만들 수 있도록 AI의 모든 역량을 총동원해 돕는 것**을 목적으로 한다.

- 쉬움과 정확성 어느 하나도 포기하지 않는다. 화면은 초등학생 눈높이로 쉽게, 근거는 세무사·회계사 수준으로 엄정하게 유지한다.
- AI 역량은 쉬운 용어 안내, 자동 복식분개, 세무 매핑, 법령·서식 최신성 확인, 검증 게이트, 신고 준비 점검에 총동원한다.
- 최종 목표는 사용자가 최신 법령에 맞는 세무 신고자료를 스스로, 자신 있게 국세청에 제출할 수 있게 하는 것이다.
- 단, 이 목표는 안전장치와 함께 간다. 법정 확정 출력은 최신 서식 스냅샷 검증 전에는 확정으로 표시하지 않는다. 쉬움이 정확성을 앞지르지 않는다.

### 구조 결론

이 앱은 **간편장부처럼 입력하지만 내부 원장은 복식부기 기반으로 유지하는 단일 HTML 회계장부 앱**이다.

현재 대상은 본인 개인사업자이지만, 의료·자문 업종, 복수 사업장, 법인 전환, 세무사 전달 자료, 직접 신고 준비까지 확장 가능해야 한다.

핵심 불변조건은 다음이다.

1. 간편장부는 SSOT가 아니라 복식 원장의 출력 view다.
2. 거래 발생, 증빙, 부가세, 결제, 정산, 할부, 자산, 감가상각은 분리 저장한다.
3. 수입·비용·자산거래는 거래 발생일 기준으로 원천거래에 등록한다.
4. 실제 입금·출금·카드대금 결제·PG 정산은 손익을 새로 만들지 않고 채권·채무 회수/상환 이벤트로 처리한다.
5. 같은 거래가 세금계산서, 카드, 현금영수증, 은행거래, PG정산, 증빙 이미지로 여러 번 들어와도 중복 손익으로 잡히지 않아야 한다.
6. 세무 판단은 공식 기준 기반 후보와 경고로 제시하고, 확정 판단처럼 표시하지 않는다.
7. 모든 사용자 데이터는 IndexedDB/localStorage/Supabase/Cloudinary/백업/복원/삭제/동기화 진단까지 말단 배선이 이어져야 한다.

## 1. 초안 변경 요약표

| 영역 | 초안 상태 | v2 변경 | 이유 |
|---|---|---|---|
| 저장/동기화 | 회계 테이블 중심, 동기화 메타 없음 | `sync_meta`, `canonical_version`, `deleted_at`, tombstone 원칙을 모든 변경 대상에 추가 | 기기별 데이터 수량 불일치와 삭제 부활 방지 |
| 단일 HTML 구조 | 구현 형태가 뒤에만 언급됨 | `Phase 0`에 단일 HTML 셸, IndexedDB, localStorage, Supabase 설정, Cloudinary 설정, 백업 골격을 선행 | 회계 코어 전에 앱 운영 기반을 먼저 고정 |
| 결제 이벤트 | `payment_events.source_transaction_id` 1개 연결 | `payment_allocations` 추가 | 카드대금·은행출금 1건이 여러 거래를 상환하는 현실 반영 |
| 증빙 파일 | `evidence_documents.file_url` 중심 | `evidence_documents`와 `evidence_files` 분리, Cloudinary 메타 추가 | 증빙 1건에 여러 파일, 교체, 삭제, 썸네일, OCR 확장 |
| 계정과목 | 사업장별 `accounts` 중심 | `standard_accounts`, `account_explanations`, 사용자 별칭 분리 | 국세청 용어 통일 + 쉬운 설명 + 사용자 커스터마이즈 동시 지원 |
| 법령 기준 | `tax_year_rules`만 있음 | `legal_reference_checks` 또는 `tax_rule_sources` 추가 | 법령 MCP/국세청 확인일, 조문, 출처 스냅샷 추적 |
| Auth/RLS | `owner_user_id`, RLS 요구만 있음 | 개인용 Supabase Auth 또는 명시적 개인키 방식 중 택일. 추천은 Auth 로그인 | GitHub Pages 공개 앱에서 세무 데이터 보호 |
| 전표 재생성 | `source_transactions -> journal_entries` 관계만 있음 | `source_revision`, `posting_rule_version`, `generated_from`, posted 이후 수정 규칙 추가 | 원천거래와 분개 드리프트 방지 |
| 부가세 | 총액 / 1.1 분리 중심 | 사업자 과세유형, 거래별 과세/면세/영세/불공제 사유 필드 보강 | 의료·자문 업종의 면세/과세 혼재 대응 |
| 구현 단계 | Phase 1 회계 코어부터 시작 | Phase 0 운영·저장·동기화·증빙 기반 추가 | 과거 오류인 백업/동기화/첨부 누락 방지 |
| 검증 | 회계 검증 중심 | 회계 검증 + 동기화 검증 + 증빙 수명주기 + 백업 왕복 + 법령기준 출처 검증 추가 | 개발 완료 조건을 말단까지 확장 |

## 2. 앱 정체성

| 항목 | 결정 |
|---|---|
| 사용자 | 본인 개인사업자 1인 사용 |
| 확장 대상 | 의료·자문 업종, 복수 사업장, 법인사업자 전환 |
| 개발 형태 | 단일 HTML + PWA 가능 구조 |
| 배포 | GitHub Pages |
| 향후 모바일 | APK 패키징 가능성을 열어둔 Capacitor-ready 구조 |
| 로컬 저장 | IndexedDB + localStorage |
| 클라우드 기준본 | Supabase Postgres |
| 증빙 이미지/PDF | Cloudinary 1차 포함 |
| 법령/세무 기준 | 국세청, 홈택스, 국가법령정보센터, 법령 MCP 확인값을 출처와 함께 저장 |
| 간편장부 Excel | 국세청 간편장부 서식과 호환되는 import/export |
| 국세청 프로그램 참조 | 국세청 간편장부 작성 프로그램 v3.4의 업무 흐름을 참조하되, 매크로 구조는 따르지 않음 |
| 로그인 | Supabase Auth + Google OAuth 전용 |
| 접근 허용 | 사용자가 허락한 Google 계정만 허용 |
| 업종코드 | 국세청/홈택스 기준·단순경비율 업종코드 기준 |
| 장부 시작 | 2025년 소급 입력 가능 |

### 2.0 모바일/APK 대비 결정

초기 구현은 단일 HTML/GitHub Pages/PWA로 간다. 다만 향후 APK 또는 모바일 앱으로 확장될 수 있으므로 브라우저 전용 구현에 갇히지 않게 설계한다.

권장 방향:

| 항목 | 결정 |
|---|---|
| 1차 구현 | 단일 HTML + PWA 가능 구조 |
| APK 후보 | Capacitor 기반 Web Native 앱 |
| TWA | 단순 PWA 래핑 후보로만 보관. 네이티브 파일/카메라/공유 기능이 필요하면 우선순위 낮음 |
| 공통 코드 | 회계 도메인 로직, 세무 기준, 리포트 계산은 웹/APK 공통 |
| 플랫폼 의존 기능 | 파일 선택, 카메라, 공유, 로컬 잠금, 알림, 백그라운드 동기화는 adapter로 분리 |
| 패키지 ID | APK 전환 전 `appId`를 별도로 확정. 예: `com.<owner>.accountingledger` 형식 |
| 모바일 지침 문서 | `docs/skills/accounting-mobile-apk-readiness-skill.md` |

모바일 대비 불변조건:

1. 회계 계산, 세무 판정, 리포트 생성 로직은 DOM, 브라우저 이벤트, 특정 저장소 API에 직접 묶지 않는다.
2. IndexedDB/localStorage/Supabase/Cloudinary 접근은 작은 wrapper 또는 adapter를 통해 호출한다.
3. APK 안에도 Supabase `service_role`, Cloudinary secret, Google client secret 같은 비밀값을 넣지 않는다.
4. Google OAuth는 웹 리다이렉트와 모바일 리다이렉트가 다를 수 있으므로 auth 설정을 분리 가능하게 둔다.
5. 모바일에서는 기기 분실 위험이 있으므로 앱 잠금, 세션 만료, 로그아웃, 로컬 캐시 삭제를 설계 후보로 둔다.
6. 증빙 첨부는 데스크톱 파일 선택뿐 아니라 모바일 사진/파일 선택을 나중에 붙일 수 있게 `EvidenceCaptureAdapter`로 분리한다.
7. 네트워크가 불안정해도 입력은 로컬에 저장되고, 연결 회복 후 canonical sync 규칙에 따라 동기화되어야 한다.
8. 리포트와 백업 파일은 모바일 공유 시 개인정보/세무자료 노출 경고를 표시한다.

### 2.1 인증·보안 결정

개인용 앱이지만 세무·계좌·증빙 데이터가 들어가므로 Supabase 테이블을 RLS 없이 공개하지 않는다.

권장 구조:

| 항목 | 결정 |
|---|---|
| 로그인 방식 | Google OAuth |
| 초기 소유자 계정 | `hanwha27@gmail.com` |
| 허용 계정 | 사용자가 사전에 허락한 Google 이메일 또는 auth user id |
| 회원가입 UX | 별도 회원가입 화면 없음. "Google로 로그인" 버튼만 제공 |
| RLS | 유지. 단, 개인앱에 맞게 단순 정책으로 구성 |
| 보호 기준 | `businesses.owner_user_id = auth.uid()` 또는 허용 사용자 테이블 기준 |
| 비허용 계정 처리 | 로그인 후 즉시 접근 차단 및 로그아웃. 가능하면 Auth hook으로 생성 전 차단 |
| 허용 계정 추가 권한 | `hanwha27@gmail.com`으로 로그인한 소유자만 추가/해제 가능 |
| 로그인 지침 문서 | `docs/skills/accounting-auth-login-skill.md`에서 별도 관리 |

허용 계정 관리 원칙:

1. `hanwha27@gmail.com`을 bootstrap owner로 둔다.
2. 최초 로그인 시 이 이메일의 Supabase `auth.uid()`를 owner 레코드에 연결한다.
3. 이후 허용 이메일 추가, 권한 변경, 접근 해제는 active owner만 가능하다.
4. owner 전용 관리 화면을 제공하되, 보안은 화면 숨김이 아니라 RLS/DB 정책으로 잠근다.
5. 비허용 Google 계정은 앱 데이터에 접근할 수 없고, 가능하면 Before User Created Hook으로 Auth 사용자 생성 전 차단한다.
6. 허용 계정 변경은 `auth_access_logs` 또는 감사로그에 남긴다.
7. HTML에는 Supabase publishable key만 넣고, service role/secret key는 절대 넣지 않는다.

방어층:

| 층 | 역할 |
|---|---|
| Google OAuth | 비밀번호 관리 부담 제거 |
| 허용 사용자 allowlist | 본인 또는 허락한 계정만 앱 사용 |
| RLS | 브라우저에 public key가 노출되어도 DB row 접근 차단 |
| 클라이언트 가드 | 비허용 계정 로그인 시 사용자에게 명확히 안내 |
| Auth hook | 가능하면 허용되지 않은 이메일의 사용자 생성을 사전에 차단 |
| 감사로그 | 허용 계정 추가/해제와 로그인 차단 이력을 추적 |

금지:

- Supabase `service_role` 또는 secret key를 HTML에 넣지 않는다.
- RLS off + anon 전체 허용으로 세무 테이블을 공개하지 않는다.
- 클라이언트의 이메일 체크만으로 보안이 된다고 보지 않는다.
- owner 권한을 `user_metadata`처럼 사용자가 바꿀 수 있는 값에 의존하지 않는다.

### 2.2 버전관리 결정

앱과 스킬/문서는 서로 다른 버전 체계를 가진다. 둘을 섞지 않는다.

앱 버전:

| 항목 | 결정 |
|---|---|
| 초기 앱 버전 | `0.00` |
| 증가 방식 | 앱 업데이트마다 `0.01`씩 증가 |
| 예시 | `0.00` → `0.01` → `0.02` |
| 표시 위치 | 앱 내부 개발자 정보, 업데이트 이력, 백업 메타데이터 |
| 저장 위치 | 단일 HTML의 `APP_INFO.version` 또는 동등한 상수 |
| 릴리스 기록 | `UPDATE_HISTORY`와 release baseline 문서에 기록 |

앱 버전 증가 기준:

| 변경 | 앱 버전 증가 |
|---|---|
| 단일 HTML 기능 변경 | 증가 |
| UI/문구/검증/동기화 로직 변경 | 증가 |
| Supabase 스키마 변경이 필요한 앱 변경 | 증가 + 별도 schema version 기록 |
| Cloudinary/Supabase 설정 방식 변경 | 증가 |
| 문서만 수정하고 앱 파일은 미변경 | 앱 버전은 증가하지 않음 |
| 스킬 문서만 수정 | 앱 버전은 증가하지 않고 스킬 버전만 증가 |

앱 버전과 별도로 관리할 버전:

| 버전 | 용도 |
|---|---|
| `APP_INFO.version` | 사용자가 보는 앱 릴리스 버전 |
| `SUPABASE_SCHEMA_VERSION` | Supabase 테이블/컬럼/트리거 구조 버전 |
| `BACKUP_SCHEMA_VERSION` | JSON 백업/복원 포맷 버전 |
| `TAX_RULE_VERSION` | 세무 기준/법령 확인 규칙 버전 |
| `canonical_version` | 기기 동기화 최종본 기준 버전 |
| `MOBILE_APP_VERSION` | APK 또는 모바일 wrapper 릴리스 버전 |
| `PLATFORM_ADAPTER_VERSION` | 웹/PWA/APK 플랫폼 adapter 계약 버전 |

스킬/지침 문서 버전:

| 문서 층위 | 버전 규칙 |
|---|---|
| 헌법 문서 | `CO-N.M`, 갱신마다 `+0.1` |
| 그 외 모든 스킬 문서 | `Sub_<문서명>_N.MM`, 갱신마다 `+0.01` |
| SKILL.md | `Sub_SKILL_N.MM`, 갱신마다 `+0.01` |
| 관보/릴리스 기준 | `Sub_release-baseline_N.MM`, 갱신마다 `+0.01`, 과거 기록은 삭제하지 않음 |

스킬/지침 문서 갱신 원칙:

1. 앱 개발 중 새 교훈, 실수, 규칙, 설계결정이 생기면 관련 스킬 문서를 함께 갱신한다.
2. 문서 본문이 바뀌면 상단 버전 태그와 개정일도 함께 바꾼다.
3. 앱 버전과 스킬 버전은 독립적으로 오른다.
4. release baseline은 변경 로그가 아니라 현재 보장되는 상태의 스냅샷으로 기록한다.
5. 완료 보고에는 앱 버전 증가 여부, 스킬/문서 버전 증가 여부, Supabase schema 변경 여부를 반드시 적는다.

## 3. 저장 계층

| 계층 | 역할 | 담는 데이터 |
|---|---|---|
| localStorage | 작고 즉시 필요한 설정·메타 | device_id, Supabase 설정, Cloudinary 설정, canonical_version, 마지막 동기화 상태, UI 설정 |
| IndexedDB | 대용량 로컬 캐시 | 거래, 전표, 계정과목, 증빙 메타, import row, tombstone, 백업 캐시 |
| Supabase Postgres | 클라우드 기준본 | 모든 구조화 회계 데이터, sync meta, 세무 기준표 |
| Cloudinary | 증빙 파일 바이트 | 영수증, 카드전표, 계약서, 세금계산서 이미지와 PDF 원본, 미리보기/썸네일 |
| JSON 백업 | 최후 복구 수단 | 전체 앱 데이터, tombstone, schemaVersion, tax rule source snapshot |

플랫폼 adapter:

| Adapter | 웹/PWA 기본 구현 | APK 확장 후보 |
|---|---|---|
| `StorageAdapter` | IndexedDB/localStorage | 동일 API 유지, 필요 시 네이티브 저장소 보강 |
| `AuthAdapter` | Supabase Google OAuth web redirect | 모바일 redirect scheme 또는 Capacitor 브라우저 플러그인 |
| `EvidenceCaptureAdapter` | 파일 input, 드래그앤드롭 | 카메라, 갤러리, 파일 선택 |
| `ShareExportAdapter` | 파일 다운로드 | Android share sheet |
| `NetworkStatusAdapter` | browser online/offline | 네이티브 네트워크 상태 |
| `LocalLockAdapter` | 선택적 PIN 화면 | 생체인증/PIN 후보 |
| `CloudinaryUploadAdapter` | 제한된 unsigned upload 또는 서버 서명 흐름 | 동일. secret은 앱에 포함 금지 |

## 4. 동기화 불변조건

모든 변경 대상 레코드는 다음 필드를 기본으로 가진다.

| 필드 | 의미 |
|---|---|
| `id` | 앱이 발급하는 안정 식별자 |
| `created_at` | 최초 생성 시각 |
| `updated_at` | 모든 수정, 상태 변경, 연결 변경 시 갱신 |
| `deleted_at` | 삭제 표시. hard delete 금지 |
| `business_id` | 사업장/사업체 소속 |
| `schema_version` 또는 `row_version` | 필요 시 구조 변경 추적 |

동기화 메타 테이블:

```sql
accounting_sync_meta (
  key text primary key,
  value text,
  updated_at timestamptz default now()
)
```

필수 메타 키:

| key | 의미 |
|---|---|
| `canonical_version` | 현재 클라우드 최종본 버전 |
| `canonical_updated_at` | 최종본 지정 시각 |
| `canonical_device_id` | 최종본 지정 기기 |
| `last_schema_version` | 앱 스키마 버전 |

동기화 모드:

| 모드 | 동작 |
|---|---|
| 일반 동기화 | 로컬 + 클라우드를 `updated_at` 기준으로 병합하고 변경분을 upsert |
| 현재 기기 최종본 지정 | 이 기기를 canonical으로 선언. 클라우드에만 있는 활성 항목은 `deleted_at` 처리 |
| 클라우드 최종본으로 이 기기 교체 | canonical 변경을 감지한 기기가 로컬 전용 항목을 보존하지 않고 클라우드 기준으로 맞춤 |

금지:

- `canonical_version` 없이 병합
- 최종본 지정 직후 병합 결과 재업로드
- 삭제를 hard delete로만 처리
- fetch 성공 여부만 보고 batch upsert 성공으로 판단. 반드시 `res.ok` 확인
- 연결 테스트 성공 후 동기화 미실행

## 5. 회계 SSOT 구조

| 계층 | 테이블/모듈 | 역할 |
|---|---|---|
| 원천거래 | `source_transactions` | 거래 발생 사실의 SSOT |
| 증빙 | `evidence_documents`, `evidence_files` | 거래 근거 자료 |
| 결제/수금 | `payment_events`, `payment_allocations` | 실제 입출금과 원천거래의 배분 연결 |
| 복식부기 | `journal_entries`, `journal_entry_lines` | 원천거래에서 생성된 분개 |
| 간편장부 | `simple_book_rows` view | 원천거래와 전표를 간편장부 양식으로 표시 |
| 보고서 | `tax_reports`, `financial_reports` | 세무·재무 출력물 |

SSOT 원칙:

```text
source_transactions
  -> journal_entries
  -> journal_entry_lines
  -> simple_book_rows
  -> tax_reports / financial_reports
```

간편장부를 먼저 저장한 뒤 복식부기로 변환하는 구조는 금지한다.

## 6. 보강할 핵심 테이블

### 6.1 payment_allocations

`payment_events`는 실제 입출금이고, `payment_allocations`는 그 입출금이 어떤 원천거래를 얼마나 상환했는지 나타낸다.

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
)
```

필요 이유:

| 사례 | 왜 필요한가 |
|---|---|
| 카드대금 1건 | 카드승인 여러 건을 한 번에 상환 |
| 은행출금 1건 | 세금계산서 여러 장을 한 번에 지급 |
| 일부 입금 | 외상매출금 일부 회수 |
| PG 입금 | 매출채권, 수수료, 보류금이 섞임 |

### 6.2 evidence_files

`evidence_documents`는 증빙의 세무적 의미, `evidence_files`는 첨부 파일 수명주기를 담당한다.

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
)
```

증빙 보관 불변조건:

1. 증빙 파일은 이미지와 PDF를 모두 지원한다.
2. Cloudinary에는 원본 파일을 올리고, DB에는 `cloudinary_public_id`, `secure_url`, `mime_type`, `file_hash`, 삭제상태를 저장한다.
3. PDF는 원본 보관을 기본으로 하고, 가능하면 첫 페이지 미리보기 또는 썸네일을 별도 메타로 둔다.
4. IndexedDB에는 첨부 메타와 임시 캐시를 둘 수 있지만, 장기 보관 기준은 Cloudinary와 JSON 백업 메타다.
5. 증빙 삭제는 DB soft delete와 Cloudinary public_id 수명주기를 함께 추적한다.
6. 현재 AI API 키가 없으므로 AI 요약/OCR 자동분석은 확정 기능이 아니라 향후 확장 필드로만 둔다.
7. 사용자가 직접 입력한 요약은 `manual_summary`로 저장하고, 향후 AI 결과와 명확히 구분한다.

### 6.3 standard_accounts / account_explanations

국세청 용어와 사용자의 쉬운 이해를 분리한다.

| 테이블 | 역할 |
|---|---|
| `standard_accounts` | 국세청/일반 회계 기준 계정과목 코드·명칭 |
| `accounts` | 사업장별 사용 계정과목 |
| `account_explanations` | 중학생도 이해할 수 있는 쉬운 설명, 예시, 주의사항 |
| `account_aliases` | 사용자가 입력한 표현을 표준 계정과목에 매핑 |

### 6.4 legal_reference_checks

법령 MCP와 공식 사이트 확인 내역을 남긴다.

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
)
```

### 6.5 legal_form_snapshots

리포트 기능은 법정 최신양식을 기본값으로 삼는다. 출력 양식은 앱이 임의로 만든 화면 양식이 아니라 국가법령정보센터 별지서식, 국세청/홈택스 안내, 확인일 기준 스냅샷에 연결한다.

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
)
```

리포트 출력 불변조건:

1. 신고/세무 리포트는 `legal_form_snapshots` 없이 확정 출력하지 않는다.
2. 서식은 법령명, 법령ID, MST, 시행일, 별지서식 번호, 서식명, 개정일, 조회일을 함께 저장한다.
3. 법정서식이 바뀌면 `TAX_RULE_VERSION` 또는 별도 `LEGAL_FORM_VERSION`을 올리고 기존 리포트를 재검토 대상으로 표시한다.
4. 국세청 프로그램/엑셀 양식은 업무 흐름과 입력 호환 기준이고, 법정 신고서식의 최종 기준은 국가법령정보센터 최신 별지서식이다.
5. 홈택스 전자신고 입력 규격이 법령 별지서식과 다를 수 있으므로, 홈택스 제출용 매핑은 별도 검증 대상으로 둔다.

## 7. 날짜 설계

`date` 하나만 두지 않는다.

| 필드 | 의미 | 기본 표시 여부 |
|---|---|---|
| `transaction_date` | 실제 거래 발생일 | 기본 |
| `recognition_date` | 장부 귀속일 | 고급 |
| `document_date` | 증빙 일자 | 고급 |
| `vat_supply_date` | 부가세 공급시기 판단일 | 고급 |
| `payment_due_date` | 지급/수금 예정일 | 고급 |
| `payment_date` | 실제 입금/출금일 | payment_events에서 관리 |
| `settlement_date` | 카드/PG 정산일 | 정산 이벤트에서 관리 |
| `closed_at` | 마감 시각 | 마감 상태에서 관리 |

기본 입력 화면은 거래일자 하나만 보여주고, 외상·할부·PG·선급·선수·장기계약 선택 시 고급 날짜를 열어준다.

### 7.1 장부 시작연도와 소급 입력

장부 시작연도는 2026년으로 고정하지 않는다. 2025년 자료를 소급 입력하거나 기존 엑셀 장부를 가져올 수 있게 설계한다.

| 항목 | 결정 |
|---|---|
| 기본 가능 시작연도 | 2025년 |
| 설정 필드 | `ledger_start_year`, `ledger_start_date` |
| 2025 자료 | 직접 입력, 엑셀 import, 카드/은행/증빙 import 모두 가능 |
| 세무 기준 | 거래 귀속연도별 기준 적용. 2025 거래는 2025 기준, 2026 거래는 2026 기준 |
| 장부의무 판단 | 신고 대상 귀속연도와 직전연도 수입금액 기준을 분리 |
| 기초잔액 | 2025년 시작 시점 또는 앱 도입 직전 시점의 계좌/카드/외상/자산 잔액 입력 가능 |

권장 테이블:

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
)
```

소급 입력 불변조건:

1. 2025년 거래를 2026년에 입력해도 `transaction_date` 기준 귀속연도로 처리한다.
2. 입력일과 거래일을 혼동하지 않는다. `created_at`은 입력 시각이고, `transaction_date`는 장부 귀속일이다.
3. 2025년 자료는 2025년 세무 기준/업종코드/경비율 출처와 연결한다.
4. 2025년 마감 후 수정은 감사로그와 거래 판단메모를 남긴다.
5. 2025년 엑셀 import 원본은 삭제하지 않고 `imports`/`import_rows`에 보존한다.
6. 기초잔액과 소급거래가 중복되지 않도록 검증한다.

## 8. 세무 기준 관리

`tax_year_rules`는 코드에 박으면 낡는 기준값을 저장한다.

보강 필드:

| 필드 | 이유 |
|---|---|
| `basis_year` | 2026 신고가 2025 귀속인지, 직전연도 수입금액 기준이 무엇인지 표시 |
| `source_check_id` | `legal_reference_checks`와 연결 |
| `confidence` | 공식 확인, 사용자 입력, 추정값 구분 |
| `requires_review` | 겸업, 공동사업장, 특수업종 등 경고 |

기장의무 판단 엔진은 다음을 입력받는다.

| 입력값 | 설명 |
|---|---|
| `tax_year` | 신고 대상 귀속연도 |
| `basis_revenue_year` | 직전연도 수입금액 기준연도 |
| `previous_year_revenue` | 직전연도 수입금액 |
| `industry_code` | 업종코드 |
| `industry_group` | 국세청 기준 업종 그룹 |
| `is_new_business` | 신규사업자 여부 |
| `is_professional_business` | 전문직 여부 |
| `has_multiple_businesses` | 복수 사업장/겸업 여부 |
| `has_joint_business` | 공동사업장 여부 |

출력은 확정값이 아니라 자동판정 후보로 표시한다.

### 8.0 국세청 업종코드 원장

업종코드는 앱이 임의로 만든 코드가 아니라 국세청/홈택스의 기준·단순경비율 업종코드를 사용한다.

원칙:

| 항목 | 결정 |
|---|---|
| 업종코드 기준 | 국세청/홈택스 기준·단순경비율 업종코드 |
| 코드 자리수 | 공식 조회값 기준. 통상 6자리 업종코드 |
| 귀속연도 | 반드시 함께 저장 |
| 표준산업분류 | 업종코드-표준산업분류 연계표가 있으면 함께 저장 |
| 수동 별칭 | 사용자 입력 편의를 위한 별칭만 허용. 공식 코드 대체 금지 |
| 출처 | 홈택스 조회, 국세청 게시자료, 첨부파일, 확인일 저장 |

권장 테이블:

```sql
nts_industry_codes (
  id uuid primary key,
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
)
```

업종코드 사용 규칙:

1. `business_activity_profiles.industry_code`는 `nts_industry_codes(tax_year, industry_code)`를 기준으로 선택한다.
2. 업종명을 직접 입력하면 공식 업종코드 후보를 검색해서 연결한다.
3. 기타인적용역자 등 포괄 코드는 다른 정확한 코드가 없을 때만 후보로 둔다.
4. 2025년 소급 장부는 2025 귀속 업종코드/경비율 데이터를 적용한다.
5. 2026년 거래는 2026 귀속 업종코드/경비율 데이터가 확인되면 적용한다.
6. 업종코드가 바뀌면 장부의무, 경비율, VAT, 원천징수, 신고자료를 재검토 대상으로 표시한다.

### 8.1 사업자 유형/과세유형 판정 엔진

현재 사업자 과세유형은 사용자가 처음부터 정확히 알고 입력한다고 가정하지 않는다. 앱 안에 사업자 유형 결정 도구를 두고, 그 판정 결과가 VAT 로직의 기본값을 자동으로 결정하게 한다.

핵심 원칙:

```text
사업자 정보 + 업종 + 매출/공급대가 + 사업장 상태 + 법령 기준
  -> 사업자 유형/과세유형 후보
  -> 사용자 확인
  -> VAT 엔진 기본값
  -> 거래별 과세구분/증빙으로 최종 조정
```

판정 도구가 물어볼 항목:

| 항목 | 이유 |
|---|---|
| 개인/법인 여부 | 간이과세는 기본적으로 개인사업자 기준으로 판정 |
| 사업 개시일 | 신규사업자 환산 기준 판단 |
| 사업장 수 | 복수 사업장 합산/배제 조건 판단 |
| 업종코드/업종명 | 간이과세 배제, 면세/과세, 장부의무 판단 |
| 직전연도 공급대가 | 간이/일반 후보 판단 |
| 당해연도 예상 공급대가 | 신규사업자 후보 판단 |
| 일반과세 포기/간이과세 포기 여부 | 사용자의 신고 선택 이력 반영 |
| 세금계산서 발급 여부 | 간이과세자 신고기간과 거래 처리에 영향 |
| 과세/면세 겸영 여부 | 공통매입세액, 거래별 VAT 검토 필요 |
| 의료/전문직 여부 | 면세 가능성과 간이과세 배제 가능성 동시 검토 |

판정 결과는 아래처럼 저장한다.

```sql
business_tax_profiles (
  id uuid primary key,
  business_id uuid not null,
  tax_year int not null,
  effective_from date,
  effective_to date,
  entity_type text,
  vat_payer_type_candidate text,
  vat_payer_type_confirmed text,
  income_book_obligation_candidate text,
  primary_activity_category text,
  industry_code text,
  industry_name text,
  industry_decision_path jsonb,
  previous_year_supply_consideration numeric(18,2),
  expected_year_supply_consideration numeric(18,2),
  has_multiple_business_sites boolean default false,
  has_taxable_and_exempt_sales boolean default false,
  is_professional_service boolean default false,
  is_medical_service boolean default false,
  has_human_facility boolean,
  has_physical_facility boolean,
  requires_review boolean default true,
  source_check_id uuid,
  user_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

VAT 엔진 연결:

| 판정 후보 | VAT 기본 동작 |
|---|---|
| 일반과세자 | 과세 매출은 공급가액/부가세/합계 분리, 매입세액 공제 후보 계산 |
| 간이과세자 | 간이과세 계산식과 신고기간 기준 적용, 세금계산서 발급 여부 별도 확인 |
| 면세사업자 | 매출 VAT 0, 매입세액은 비용/불공제 검토 후보로 표시 |
| 과세·면세 겸영 | 거래별 과세구분 필수, 공통매입세액 안분 검토 필요 |
| 법인사업자 | 일반과세 중심으로 보고, 간이과세 후보에서 제외 |
| 검토 필요 | 자동 계산은 하되 신고용 확정값으로 내보내기 전 경고 |

불변조건:

1. 사업자 유형 판정 결과는 확정 세무판단이 아니라 후보와 근거로 표시한다.
2. 사용자가 최종 확인한 값은 `vat_payer_type_confirmed`에 저장한다.
3. 자동 판정이 바뀌면 기존 거래 VAT를 조용히 재작성하지 않고 재계산 후보/경고를 만든다.
4. 거래별 증빙에 표시된 과세구분이 사업자 기본값보다 우선할 수 있다.
5. 모든 판정은 `legal_reference_checks` 또는 공식 출처 스냅샷과 연결한다.
6. 판정 변경은 거래 판단메모/감사로그에 남긴다.
7. 법령 기준이 바뀌면 `TAX_RULE_VERSION`을 올리고 기존 판정을 재검토 대상으로 표시한다.

별도 지침 문서:

| 문서 | 역할 |
|---|---|
| `docs/skills/accounting-tax-vat-classification-skill.md` | 사업자 유형/과세유형 판정, VAT 엔진, 법령 출처 확인 지침 |

### 8.2 업종 입력 기반 좁혀가기 로직

사업 업종 입력은 장부 로직을 결정하는 출발점이다. 사용자가 세법을 몰라도 답할 수 있도록, 앱은 큰 질문에서 시작해 점점 좁혀간다.

결정 트리:

```text
1. 사업자 주체
   개인사업자 / 법인사업자 / 프리랜서형 개인 / 공동사업 / 복수사업장

2. 큰 업종
   의료 / 자문·전문직 / 농업·임업·어업 / 크리에이터 / 도소매 / 제조 / 부동산 / 교육 / 기타 서비스

3. 세부 조건
   인적시설 있음? 물적시설 있음? 면허·자격 기반? 플랫폼 수익? 원천징수 3.3%? 면세 매출?

4. 세무 후보
   일반과세 / 간이과세 / 면세 / 과세·면세 겸영 / 원천징수 사업소득 / 법인 과세

5. 장부 로직
   VAT 입력 방식 / 증빙 필수값 / 원천징수 처리 / 사업장현황신고 / 종합소득세 자료 / 복식부기 후보
```

업종별 1차 라우팅:

| 사용자가 고른 큰 업종 | 추가 질문 | 장부/VAT 기본 후보 |
|---|---|---|
| 의료 | 의사·한의사·약사 등 면허 기반인지, 비급여/자문/강의가 섞이는지 | 의료보건용역 면세 후보 + 전문직/장부의무 검토 + 과세 겸영 경고 |
| 자문·전문직 | 자격사/전문서비스인지, 법인인지 개인인지, 원천징수 대상인지 | 전문직 간이배제 가능성 + 일반과세/면세/원천징수 검토 |
| 프리랜서 | 사업자등록 여부, 3.3% 원천징수 여부, 반복·계속성 여부 | 사업소득 원천징수, 종합소득세 자료, VAT 면세 인적용역 여부 검토 |
| 농업·임업·어업 | 직접 생산인지, 가공·판매인지, 식용 미가공인지, 기자재/면세유 여부 | 면세/영세율/간이 부가가치율 후보를 분리 검토 |
| 크리에이터 | 인적시설 또는 물적시설이 있는지, 플랫폼 광고/후원/협찬인지 | 시설 없음은 면세사업자 후보, 시설 있음은 과세사업자 후보 |
| 도소매 | 일반 소비자 판매인지, 도매/상품중개인지, 온라인몰/플랫폼인지 | 과세사업 기본, 간이과세 배제 여부와 매출 기준 검토 |
| 제조 | 소비자 직접 판매인지, 제조 규모와 업종 세부 분류 | 간이과세 배제/예외 검토 + 재고/원가 장부 필요 |
| 부동산 | 임대/매매/주택임대/상가임대 여부 | 면세/과세/간이배제/사업장별 판단 강한 경고 |
| 교육·강의 | 인허가 교육기관인지, 개인 강의/콘텐츠 판매인지 | 면세 교육용역 또는 과세 콘텐츠/자문 수익 검토 |
| 법인사업 | 업종과 무관하게 법인 여부 우선 | 법인 회계/부가세 신고/복식부기 전제 |

업종 판정 결과는 다음 질문지를 자동으로 바꾼다.

| 판정된 방향 | 앱이 다음에 묻는 것 |
|---|---|
| 의료 가능성 | 의료보건용역인지, 자문/강의/콘텐츠 판매가 섞이는지 |
| 프리랜서 가능성 | 원천징수 3.3%를 떼고 받는지, 계산서/세금계산서를 발급하는지 |
| 크리에이터 가능성 | 직원·외주상주·스튜디오·장비/시설 등 인적/물적 시설이 있는지 |
| 농업 가능성 | 직접 생산인지, 가공품 판매인지, 도소매 성격이 있는지 |
| 법인 가능성 | 법인명, 사업자등록번호, 대표자, 법인계좌, 법인카드 기준 입력 |
| 겸업 가능성 | 사업별 매출을 분리할지, 사업장/업종별 장부 단위를 나눌지 |

저장 구조:

```sql
business_activity_profiles (
  id uuid primary key,
  business_id uuid not null,
  tax_year int not null,
  activity_label text not null,
  activity_category text not null,
  industry_code text,
  industry_name text,
  decision_path jsonb not null default '[]'::jsonb,
  tax_classification_candidate text,
  vat_treatment_candidate text,
  income_treatment_candidate text,
  book_logic_candidate text,
  requires_review boolean default true,
  source_check_id uuid,
  user_note_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

불변조건:

1. 업종 입력값은 하나의 텍스트로 끝내지 않고 결정 경로 `decision_path`를 남긴다.
2. 큰 업종은 다음 질문지를 고르는 라우터다.
3. 세무 판정은 큰 업종만으로 확정하지 않고 세부 조건과 증빙으로 좁힌다.
4. 여러 업종을 겸하면 업종별 활동 프로필을 여러 개 만든다.
5. 업종 판정이 바뀌면 VAT, 원천징수, 계정과목 추천, 신고자료가 모두 재검토 대상이 된다.
6. 의료/전문직/농업/크리에이터/부동산처럼 예외가 많은 업종은 기본적으로 `requires_review=true`로 둔다.

## 9. VAT 설계 보강

모든 거래는 다음 금액을 분리한다.

| 필드 | 의미 |
|---|---|
| `supply_amount` | 공급가액 |
| `vat_amount` | 부가세 |
| `total_amount` | 총액 |

다만 총액 / 1.1 자동분리는 다음 조건에서만 후보로 적용한다.

| 조건 | 처리 |
|---|---|
| 일반과세자 + 과세거래 + 총액만 입력 | 공급가액/부가세 자동분리 후보 |
| 면세사업자 또는 면세거래 | 부가세 0, 사유 표시 |
| 간이과세자 거래 | 공제 검토 필요 |
| 의료/자문 등 과세·면세 혼재 가능 업종 | 거래별 확인 필요 |
| 증빙에 부가세 분리 표시 | 증빙값 우선 |

VAT 계산은 `business_tax_profiles`의 판정 결과를 기본값으로 사용하되, 거래별 과세구분과 증빙값을 우선한다. 즉, 사업자 유형 결정 도구가 VAT 엔진의 출발점이고, 거래 증빙이 최종 검증점이다.

## 10. Import 설계 원칙

import 원본은 삭제하지 않는다.

| 자료 | 기본 해석 |
|---|---|
| 카드 승인내역 | 비용/자산 원천거래 후보 |
| 카드대금 출금 | 비용이 아니라 카드미지급금 상환 후보 |
| 은행 출금 | 미지급금/카드미지급금/외상매입금 지급 후보 우선 |
| 은행 입금 | 외상매출금/카드매출채권/PG정산채권 회수 후보 우선 |
| 세금계산서 | 원천거래 후보 |
| 현금영수증 | 원천거래 후보 + 결제 이벤트 생성 가능 |
| PG 정산 | 총매출, 수수료, 실입금 분리 |
| 엑셀 장부 | 매핑 프리셋 + 사용자 확인 후 import |

AI/Claude/GPT가 향후 만든 import 결과의 id는 믿지 않는다. 현재는 API 키가 없으므로 AI 기능은 확장 가능한 자리만 두고, 앱이 식별자를 발급하며 날짜·금액·거래처·증빙번호·유사도 기준으로 매칭한다.

### 10.1 국세청 간편장부 Excel 호환

간편장부 Excel은 앱이 임의로 만든 양식보다 국세청 간편장부 서식을 기준으로 한다. 앱 내부 SSOT는 복식 원장이고, 국세청 간편장부 Excel은 공식 안내 양식과 호환되는 import/export view다.

확인한 기준 파일:

| 항목 | 내용 |
|---|---|
| 파일 | `간편장부_엑셀2003.xlsx` |
| 시트 | `장부`, `통계` |
| 장부 범위 | `A1:L2062` |
| 통계 범위 | `A1:I24` |
| 데이터 시작행 | `장부!A4` |
| 통계 방식 | `장부!A`의 월 값을 기준으로 `SUMIF` 월별 집계 |

국세청 간편장부 열 매핑:

| Excel 열 | 공식 항목 | 앱 내부 매핑 |
|---|---|---|
| A:B | ① 일자 | `transaction_date`. A=월, B=일 또는 `1.5` 형태를 모두 지원 |
| C | ② 계정과목 | `account_id`, `account_name`, `standard_account_code` |
| D | ③ 거래내용 | `description`, `transaction_summary` |
| E | ④ 거래처 | `counterparty_id`, `counterparty_name` |
| F | ⑤ 수입 금액 | 수입/매출 공급가액 또는 간이·면세 매출액 |
| G | ⑤ 수입 부가세 | 수입/매출 VAT |
| H | ⑥ 비용 금액 | 비용/매입 공급가액 또는 부가세 미구분 지출액 |
| I | ⑥ 비용 부가세 | 비용/매입 VAT |
| J | ⑦ 사업용 유형자산 및 무형자산 금액 | 자산 취득/매각 금액 |
| K | ⑦ 사업용 유형자산 및 무형자산 부가세 | 자산 관련 VAT |
| L | ⑧ 비고 | 증빙 유형, 결제 유형, 재고 메모, 검토 메모 |

Import 규칙:

1. `장부` 시트의 4행 이후를 읽는다.
2. F/G, H/I, J/K 중 어느 구역에 금액이 있는지로 수입, 비용, 자산거래 후보를 나눈다.
3. 한 행에 여러 구역 금액이 동시에 있으면 자동 확정하지 않고 검토 필요로 둔다.
4. A/B 일자와 장부 귀속연도를 결합해 `transaction_date`를 만든다.
5. C 계정과목은 국세청 간편장부 계정과목 후보와 표준 계정과목 매핑을 거친다.
6. L 비고의 `세계`, `계`, `카드`, `현영`, `영`, `현금`, `외상` 등은 증빙/결제 후보로 해석한다.
7. 원본 Excel 행은 `imports`/`import_rows`에 보존한다.
8. import 결과는 즉시 전표로 확정하지 않고 미리보기, 매칭, 사용자 확인 단계를 거친다.

Export 규칙:

1. 세무사 전달과 직접 신고 준비를 위해 국세청 간편장부 서식 호환 Excel을 기본 출력으로 제공한다.
2. 세무사 전달 패키지에는 법정 최신 신고서식 PDF/Excel도 함께 포함한다.
3. 증빙 전달은 Cloudinary 원본 링크/파일목록/증빙대장 형태를 기본으로 하고, 이미지와 PDF를 모두 포함한다.
4. 내부 복식 원장에서 간편장부 view를 생성해 `장부` 시트에 쓴다.
5. `통계` 시트는 월별/분기별/반기별/연 합계가 맞는지 검증한다.
6. 간편장부 export는 내부 원장의 대체물이 아니라 제출/검토용 산출물이다.
7. 사업소득과 부동산임대소득 등 소득 종류가 둘 이상이거나 사업장이 둘 이상이면 별도 장부/별도 시트/별도 파일로 구분할 수 있어야 한다.

별도 지침 문서:

| 문서 | 역할 |
|---|---|
| `docs/skills/accounting-import-export-skill.md` | 국세청 간편장부 Excel, 기존 엑셀 장부, 카드/은행/증빙 import/export 지침 |
| `docs/skills/accounting-evidence-archive-skill.md` | Cloudinary 이미지/PDF 증빙 보관, 증빙대장, 세무사 전달 지침 |
| `docs/skills/accounting-mobile-apk-readiness-skill.md` | PWA/APK 확장, Capacitor-ready adapter, 모바일 보안 지침 |

### 10.2 국세청 간편장부 작성 프로그램 참조

국세청 간편장부 작성 프로그램 v3.4는 Excel VBA 매크로 기반 프로그램이다. 이 앱은 단일 HTML/PWA 구조이므로 매크로 구조를 따르지는 않지만, 공식 프로그램의 업무 흐름은 설계 기준으로 삼는다.

확인한 ZIP 구성:

| 파일 | 설계상 의미 |
|---|---|
| `간편장부 작성 프로그램(version 3.4) 사용자 설명서.pdf` | 공식 프로그램의 입력/수정/출력 업무 흐름 참조 |
| `간편장부 작성 프로그램(version 3.4)_250428.xls` | 매크로 기반 원본 프로그램. 실행하지 않고 구조 참고 대상으로만 취급 |

공식 프로그램에서 반영할 업무 흐름:

| 공식 프로그램 메뉴 | 앱 설계 반영 |
|---|---|
| 내 정보 관리 | `businesses`, `business_sites`, owner profile, 주업종코드 관리 |
| 거래처 관리 | `counterparties`, 사업자등록번호 검증, 거래처 파일 import |
| 개별 입력 | 간편장부식 거래 입력 UX |
| 파일 업로드 | 국세청 간편장부/홈택스/엑셀 import 미리보기 |
| 수정/삭제/복사 입력 | 수정 이력, 삭제 tombstone, 반복거래 복사 |
| 사업용 자산 입력 | `assets`, 취득/매각/부대비용, 자산대장 |
| 감가상각비 입력 | 자산별 감가상각 계산과 장부 반영 |
| 장부 출력 | 국세청 간편장부 호환 Excel/PDF |
| 영업현황표 | 거래유형별, 계정과목별, 기간별 집계 |
| 자산대장 | 자산 목록, 내용연수, 감가상각 현황 |
| 신고서식(소득세) | 간편장부소득금액계산서, 총수입금액 및 필요경비명세서, 감가상각비 조정명세서 출력 |

공식 프로그램 설명서에서 반영할 경고:

1. 주업종코드는 계정과목 판단과 업종별 내용연수 기준에 영향을 주므로 정확히 입력해야 한다.
2. 파일 업로드는 중복 입력 위험이 있으므로 import idempotency와 중복 후보 검출이 필수다.
3. 일반과세자 매출은 공급가액/VAT 분리를 기본으로 하되, 신용카드·현금영수증 총액만 있는 경우 1.1 분리는 후보로만 둔다.
4. 간이과세자와 면세사업자는 VAT 처리 방식이 다르므로 사업자 과세유형 판정 엔진과 연결한다.
5. 감가상각비는 자산대장에서 계산하고, 장부 반영일은 원칙적으로 연말일 후보로 둔다.
6. 기부금, 감가상각비 등 세무조정 항목은 합계만 저장하지 않고 세부 조정내역을 거래 판단메모/조정명세로 별도 관리한다.

### 10.3 복식부기의무자 기준경비율 추계신고 샘플 반영

`7.추계-기준경비율(복식부기의무자) 신고서 작성사례.pdf`는 복식부기의무자인 한식점 사업자가 장부 없이 기준경비율로 추계신고하는 사례다. 이 자료는 앱이 추계신고를 권장하기 위한 자료가 아니라, 장부의무·신고유형·가산세 경고를 설계하기 위한 위험 사례로 다룬다.

샘플에서 확인한 핵심 데이터 흐름:

| 항목 | 설계 반영 |
|---|---|
| 직전연도 수입금액 | 장부의무/기준경비율 적용 판단 |
| 당해연도 수입금액 | 총수입금액 및 신고서식 연결 |
| 영업손실보상금, 신용카드발행세액공제 | 총수입금액 산입 여부 검토 |
| 업종코드 `552101` | 업종코드 기반 경비율/장부의무/신고유형 판단 |
| 주요경비 | 매입비용, 임차료, 인건비 분리 |
| 정규증빙 미수취 | 증빙불비가산세 검토 |
| 복식부기의무자 추계 | 무신고가산세와 장부 기록·보관 불성실 가산세 경고 |
| 신고서 작성 순서 | 기본사항 → 추계소득금액계산서 → 사업소득명세서 → 소득공제 → 세액공제 → 가산세 → 기납부세액 |

앱 설계 원칙:

1. 기본 목표는 장부 기장이고, 추계신고는 예외/위험 검토 모드로 둔다.
2. 복식부기의무자 후보가 간편장부 또는 추계신고 흐름을 선택하면 강한 경고를 표시한다.
3. 기준경비율/단순경비율 계산은 신고 검토용 보조 모듈로 두고 내부 원장을 대체하지 않는다.
4. 주요경비는 매입비용, 임차료, 인건비로 분리 저장할 수 있어야 한다.
5. 정규증빙 미수취 거래는 가산세 검토 후보로 표시한다.
6. 신고서식 출력은 숫자만 출력하지 않고, 계산 근거와 거래 판단메모를 함께 제공한다.

별도 지침 문서:

| 문서 | 역할 |
|---|---|
| `docs/skills/accounting-income-tax-reporting-skill.md` | 종합소득세 신고자료, 간편장부 신고서식, 기준경비율/추계신고 경고 지침 |
| `docs/skills/accounting-legal-forms-skill.md` | 국가법령정보센터 최신 별지서식 확인, 스냅샷, 리포트 양식 버전 지침 |

### 10.4 법정 최신양식 리포트 원칙

리포트 기능을 구현할 때는 법정 최신양식을 기본 전제로 둔다. 앱 내부 집계표나 세무사 전달용 요약표는 보조 산출물이고, 신고자료로 쓰이는 PDF/Excel은 해당 귀속연도와 출력일 기준의 공식 서식 확인값을 물고 있어야 한다.

확인 순서:

1. 국가법령정보센터 또는 법령 MCP에서 현행 법령/시행규칙의 법령ID, MST, 시행일을 확인한다.
2. 별표·서식 조회에서 별지서식 번호, 서식명, `bylSeq`, 파일 형식, 개정일을 확인한다.
3. 확인 결과를 `legal_reference_checks`와 `legal_form_snapshots`에 저장한다.
4. 리포트 생성 시 `form_snapshot_id`를 연결하고, 출력물 하단 또는 메타 정보에 기준 서식 정보를 남긴다.
5. 저장된 서식 스냅샷보다 최신 서식이 발견되면 기존 리포트는 `requires_review`로 표시한다.

2026-07-09 기준 확인 예:

| 항목 | 확인값 |
|---|---|
| 소득세법 시행규칙 | 법령ID `007507`, MST `286379`, 시행일 `2026-07-01` |
| 부가가치세법 시행규칙 | 법령ID `007289`, MST `284995`, 시행일 `2026-04-01` |
| 간편장부소득금액계산서 | 소득세법 시행규칙 별지 제74호서식, `bylSeq=007400`, HWP |
| 총수입금액 및 필요경비명세서 | 별지 제74호서식 부표, 부표 개정 `2025-03-21` 확인 |

금지:

- 앱이 보기 좋게 만든 임의 리포트를 법정 신고서식처럼 표시하지 않는다.
- 서식 번호와 개정일을 확인하지 않은 PDF/Excel을 확정 리포트로 만들지 않는다.
- 오래된 스냅샷을 최신양식으로 표시하지 않는다.
- 홈택스 화면을 보고 추정한 필드만으로 법정서식을 대체하지 않는다.

## 11. 마감과 감사로그

마감 후 직접 수정은 금지한다.

| 작업 | 처리 |
|---|---|
| posted 전 원천거래 수정 | 분개 재생성 가능 |
| posted 후 수정 | reversal 또는 adjustment |
| closed 후 수정 | reopen 권한 + audit log + 사유 필수 |
| 삭제 | `deleted_at` + void/reversal 로그 |
| import 매칭 변경 | audit log에 before/after 저장 |

감사로그는 모든 중요 엔티티에 대해 남긴다.

## 12. 연구노트와 거래 판단메모

이 앱에서 연구노트는 회계 거래 판단 기록이 아니라, 앱 개발·업데이트·설계 변경 이력을 남기는 용도다. 거래와 세무 판단의 근거는 `거래 판단메모`로 별도 관리한다.

### 12.1 앱 연구노트

앱 연구노트 목적:

| 목적 | 설명 |
|---|---|
| 개발 이력 | 어떤 기능을 왜 추가하거나 바꿨는지 기록 |
| 업데이트 근거 | 앱 버전, 스킬 버전, 법령/서식 기준 변경 이유 기록 |
| 오류 재발 방지 | 과거 설계 실수, 버그 원인, 수정 방식을 보존 |
| AI 협업 대비 | Claude/GPT/API 연동을 나중에 붙일 수 있도록 프롬프트와 검토 구조만 보관 |
| 릴리즈 기준 | 앱 업데이트 전후 변경사항과 검증 결과를 남김 |

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
)
```

`note_type` 예시:

| note_type | 의미 |
|---|---|
| `design_decision` | 설계 결정 |
| `update_history` | 업데이트 이력 |
| `bug_lesson` | 오류와 재발 방지 교훈 |
| `legal_form_update` | 법정서식 변경 반영 |
| `skill_update` | 스킬 문서 변경 |
| `future_ai_plan` | 향후 AI/API 연동 계획 |

### 12.2 거래 판단메모

거래 판단메모는 세무사 전달과 직접 신고 준비를 위해 거래·증빙·세무판단의 근거를 남기는 보조 기록이다. 이것은 연구노트가 아니다.

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
)
```

거래 판단메모 유형:

| note_type | 의미 |
|---|---|
| `classification_reason` | 계정과목 또는 거래유형 분류 이유 |
| `tax_judgment` | 부가세, 장부의무, 필요경비성 등 세무 판단 |
| `evidence_review` | 증빙 확인 결과 |
| `import_mapping` | 가져오기/매칭 판단 |
| `legal_basis` | 법령·국세청 기준 확인 |
| `closing_review` | 월마감/연마감 검토 메모 |

AI 관련 원칙:

1. 현재 API 키가 없으므로 AI 기능은 활성 기능으로 설계하지 않는다.
2. 향후 AI 연동을 위해 `future_ai_plan`, 프롬프트 버전, 외부 결과 붙여넣기 자리만 둔다.
3. AI가 나중에 붙더라도 사용자 확인 전까지 신고용 확정값으로 표시하지 않는다.
4. 거래 판단메모는 사용자가 직접 작성하거나 외부 검토 내용을 붙여넣는 수동 흐름을 기본값으로 한다.

UI 원칙:

| 화면 | 표시 방식 |
|---|---|
| 앱 업데이트 화면 | 앱 연구노트와 업데이트 이력 |
| 스킬 문서 화면 | 스킬 버전과 변경 근거 |
| 거래 상세 | 거래 판단메모 탭 |
| 증빙 상세 | 증빙 확인 메모와 수동 요약 |
| 세무 리포트 | 검토 필요 거래와 거래 판단메모 묶음 |
| 내보내기 | 세무사 전달용 판단메모 PDF/Excel 포함 |

## 13. 말단 배선 체크리스트

새 도메인 또는 주요 필드를 추가하면 아래 말단까지 연결됐는지 확인한다.

| 말단 | 확인할 것 |
|---|---|
| 입력 화면 | 필드가 입력 가능하거나 의도적으로 숨겨졌는가 |
| 상세 화면 | 저장된 값이 보이는가 |
| 수정 화면 | 수정 후 `updated_at`이 바뀌는가 |
| 삭제/휴지통 | `deleted_at` 또는 tombstone이 생기는가 |
| 전체 백업 | JSON 백업에 포함되는가 |
| 복원 | 백업에서 되살릴 수 있는가 |
| Supabase upsert | `res.ok` 확인 후 저장되는가 |
| 일반 동기화 | updated_at 최신값이 이기는가 |
| 최종본 지정 | 클라우드에 없는 로컬/원격 차이를 올바르게 처리하는가 |
| 진단표 | 로컬/클라우드 개수와 hash가 표시되는가 |
| Excel/PDF 출력 | 필요한 출력물에 반영되는가 |
| 검증 엔진 | 오류/경고 조건에 걸리는가 |

## 14. 구현 단계 v2

| 단계 | 구현 | 완료 기준 |
|---|---|---|
| Phase 0 운영 기반 | 단일 HTML 셸, IndexedDB/localStorage 래퍼, Supabase 설정, Cloudinary 설정, JSON 백업/복원 골격, sync_meta | 앱 시작/저장/백업/복원/동기화 메타가 먼저 동작 |
| Phase 1 회계 코어 | businesses, business_sites, standard_accounts, accounts, counterparties, source_transactions, journal_entries, journal_entry_lines, payment_events, payment_allocations | 수입/비용/자산구입 입력, 자동분개, 차대변 검증, 간편장부 view |
| Phase 2 증빙/미디어 | evidence_documents, evidence_files, Cloudinary 업로드, 첨부 연결, 수동요약/future OCR 자리 | 거래에 이미지/PDF 증빙 파일 첨부, 삭제/복원/백업 메타 유지 |
| Phase 3 import/매칭 | imports, import_rows, CSV/XLSX import, 국세청 간편장부 Excel import/export, 카드/은행/세금계산서/현금영수증/PG 매칭 | 카드대금·세금계산서·은행출금 중복 비용 방지, 공식 간편장부 산출 가능 |
| Phase 4 할부/정산/자산 | installment_plans, schedule_items, PG settlement, assets, depreciation | 할부 월별 중복비용 없음, 자산/감가상각 분리 |
| Phase 5 세무 기준/리포트 | tax_year_rules, legal_reference_checks, legal_form_snapshots, book obligation engine, VAT engine, income tax reporting, tax reports | 간편장부/복식부기 후보 판정, 신고 준비자료와 법정 최신 신고서식 출력 |
| Phase 6 마감/감사/판단메모/개발 연구노트/고급검증 | period closing, audit_logs, decision_notes, app_research_notes, reversal/adjustment, validation engine | 마감 후 직접수정 방지, 판단 근거와 업데이트 이력 보존, 오류 해결 액션 제시 |
| Phase M 모바일/APK 확장 | Capacitor wrapper, mobile auth redirect, camera/file picker, share export, local lock | 기존 단일 HTML 코어를 유지한 채 APK 빌드 가능 |

## 15. 필수 테스트

| 테스트 | 기대 결과 |
|---|---|
| 카드할부 비용 중복 방지 | 구매일에 비용/자산 인식, 카드대금 출금은 상환 |
| 자산 할부 | 자산 + 부가세대급금 + 카드미지급금, 비용 즉시처리 없음 |
| 외상매입 연도 경계 | 거래 귀속연도와 출금연도 분리 |
| PG 정산 | 총매출과 수수료 분리 |
| 세금계산서 + 은행출금 | 세금계산서는 원천거래, 은행출금은 payment_event |
| 카드대금 출금 | 신규 비용 생성 금지 |
| VAT 검토 필요 | 공제/불공제 후보와 사용자 확인 상태 유지 |
| 계좌 간 이체 | 수입/비용 생성 금지 |
| Cloudinary 증빙 삭제 | DB 메타와 Cloudinary public_id 수명주기 일치 |
| JSON 백업 왕복 | active, deleted, tombstone, tax rules, evidence meta 보존 |
| 최종본 지정 | canonical_version 변경 후 다른 기기는 클라우드 기준 적용 |
| 법령 기준 확인 | tax_year_rules가 legal_reference_checks 출처를 가진다 |
| 법정 최신양식 리포트 | 리포트 출력 전에 legal_form_snapshots가 연결되고 법령ID, MST, 시행일, 별지서식 번호, 개정일이 표시된다 |
| 거래 판단메모 연결 | 거래/증빙/세무판단 메모가 백업, 복원, 동기화, 내보내기에 포함된다 |
| 앱 연구노트 연결 | 앱 개발/업데이트 이력이 앱 버전과 스킬 버전에 연결된다 |
| 모바일 adapter 검증 | Storage/Auth/Evidence/Share adapter가 웹 기본 구현과 APK 후보 구현으로 분리되어 있다 |
| 국세청 간편장부 Excel 왕복 | 국세청 서식 열 구조로 import/export되고 월별 통계 합계가 내부 원장과 일치한다 |
| 국세청 프로그램 흐름 | 내 정보/거래처/장부/자산/감가상각/신고서식 흐름이 앱 기능과 연결된다 |
| 복식부기의무자 추계 경고 | 복식부기의무자 후보가 추계/간편장부 신고 흐름을 선택하면 가산세 위험 경고를 표시한다 |

## 16. 사용자에게 보여줄 핵심 도움말

| 주제 | 쉬운 설명 |
|---|---|
| 거래일 기준 | 돈이 들어오거나 나간 날이 아니라 거래가 실제로 발생한 날을 장부 기준으로 삼습니다. |
| 카드할부 | 할부는 비용을 나누는 기능이 아니라 이미 발생한 비용이나 자산구입 대금을 나누어 갚는 기능입니다. |
| 카드대금 출금 | 카드대금 출금은 새 비용이 아니라 기존 카드 사용액을 갚는 일입니다. |
| PG 정산 | 입금액만 매출로 잡으면 매출과 수수료가 왜곡됩니다. 총매출과 수수료를 분리해야 합니다. |
| 자산구입 | 장비·컴퓨터·차량·시설은 비용이 아니라 자산으로 등록한 뒤 감가상각으로 비용화할 수 있습니다. |
| VAT | 매입세액 공제 여부는 증빙, 거래처, 사업관련성, 지출 성격에 따라 달라지므로 확인이 필요합니다. |
| 판단메모 | 애매한 거래는 왜 그렇게 처리했는지 짧게 남겨두면 나중에 신고자료를 만들 때 훨씬 안전합니다. |
| 연구노트 | 연구노트는 앱 개발과 업데이트 이력을 남기는 기록입니다. |

## 17. 최종 설계 문장

```text
이 앱은 간편장부 입력 UX를 제공하되, 내부 원장은 복식부기 기반으로 유지한다.
거래 발생, 증빙, 부가세, 결제, 정산, 할부, 자산, 감가상각을 분리 저장하여 세무 장부의 정합성을 보장한다.
모든 데이터는 IndexedDB/localStorage/Supabase/Cloudinary/JSON 백업/동기화 진단까지 말단 배선이 이어져야 한다.
세무 기준은 공식 출처와 확인일을 가진 규칙 데이터로 관리하고, 자동판정은 확정값이 아니라 검토 후보로 표시한다.
연구노트는 앱 개발과 업데이트 이력을 남기는 기록으로 두고, 거래와 세무 판단의 근거는 별도 거래 판단메모로 관리한다.
AI는 현재 API 키가 없으므로 향후 확장 가능한 자리만 두고, 활성 판단 기능으로 설계하지 않는다.
```

## 18. 사전 결정 항목 확정 상태

2026-07-09 사용자 확인으로 다음 항목을 1차 설계 기준으로 확정한다. 이후 구현 중 임의로 뒤집지 않는다. 변경이 필요하면 앱 연구노트와 관련 스킬 문서에 변경 이유를 남긴다.

관련 스킬 문서:

| 문서 | 역할 |
|---|---|
| `docs/skills/accounting-v1-scope-skill.md` | 1차 포함/제외 범위, 완료 기준, 범위 판단 규칙 |
| `docs/skills/accounting-app-research-note-skill.md` | 앱 개발/업데이트 연구노트와 버전 변경 사유 기록 |

| 번호 | 항목 | 확정 결정 | 1차 처리 | 2차 이후 |
|---|---|---|---|---|
| 1 | 배포 형태 | 단일 HTML + GitHub Pages 우선 | PWA 설치 가능 구조와 APK 대비 설계 포함 | Capacitor APK |
| 2 | Cloudinary 업로드 보안 | 제한적 unsigned upload preset 우선 | preset 제한, DB 메타 저장, secret 금지 | Supabase Edge Function 서명 업로드 |
| 3 | 백업 파일 보호 | JSON 백업/복원 안정화 우선 | 민감자료 보관 경고 표시 | 암호화 ZIP/비밀번호 백업 |
| 4 | 모바일 잠금 | 1차 제외 | Google 로그인, 세션, 로그아웃, 로컬 캐시 삭제 | PIN/생체인증 |
| 5 | 세무사 전달 패키지 | 1차 기본 기능 | 간편장부 Excel, 법정 신고서식 PDF/Excel, 증빙대장, 판단메모 | 세무사 공유계정 |
| 6 | 모바일 오프라인 | 오프라인 입력 가능 | Supabase/Cloudinary 작업은 대기열 처리 | 백그라운드 동기화 고도화 |
| 7 | 법정서식 최신화 | 리포트 생성 시 검사 | 스냅샷 없으면 확정 출력 금지 | 정기 자동점검 후보 |
| 8 | APK appId | 지금은 후보만 보관 | 후보 `com.hanwha27.accountingledger` | APK 직전 확정 |
| 9 | 알림 | 1차 제외 | 앱 내 마감/신고/백업 체크리스트 | APK 푸시/로컬 알림 |
| 10 | 데이터 입력 | 직접 입력 + 간편장부 Excel + 증빙 첨부 | 은행/카드/PG/홈택스 import는 구조와 메뉴만 | 자동 import |
| 11 | 사업자/사업장 | 구조는 복수 지원, UI는 1개 중심 | 개인사업자 1개 사업장 UI | 복수 사업장 UI |
| 12 | 법인사업자 | 구조와 선택지만 열어둠 | 법인 로직 미구현 | 법인세/법인장부 |
| 13 | 업종코드 | 수동 등록·갱신 구조 | 공식 업종코드 후보 입력/선택 | 온라인 검색/동기화 |
| 14 | AI | 화면 노출 없음 | `future_ai_*` 자리만 둠 | API 키 확보 후 연동 |
| 15 | 사용자 권한 | 소유자 1명 중심 | `hanwha27@gmail.com` owner, 허용 이메일 관리 | 세무사/읽기전용 권한 |
| 16 | 세무사 접근 | 파일 패키지 내보내기만 | 로그인 공유 없음 | 세무사 읽기전용 공유 |
| 17 | 화면 언어 | 한국어 중심 | 국세청 용어 + 쉬운 설명 | 영문 UI |
| 18 | 마감 | 월마감/연마감 상태와 잠금 | 경고, 사유 입력, 감사로그 | 수정분개 자동화 |
| 19 | 자산/감가상각 | 자산대장 + 후보 계산 | 조정명세서 초안, 사용자 확인 | 고급 세무조정 |
| 20 | VAT | 거래분류 + 매출/매입 VAT 집계 | 과세/면세/불공제 후보 표시 | 부가세 신고서/전자파일 |
| 21 | 종합소득세 | 신고 준비자료 생성 | 간편장부소득금액계산서, 필요경비명세서, 감가상각비 조정명세서 초안 | 전자신고 파일 |
| 22 | 입력 UX | 간편장부식 쉬운 입력 | 내부 복식 전표 자동 생성, 고급 전표 화면 제공 | 전표 편집 고도화 |
| 23 | 첫 화면 | 실제 업무 대시보드 | 입력현황, 미첨부 증빙, 검토거래, 동기화, 백업, 체크리스트 | 알림/분석 고도화 |

## 19. 1차 구현 범위 확정

1차 버전은 앱 버전 `0.00`에서 시작한다. 문서만 바뀌는 동안 앱 버전은 올리지 않고, 단일 HTML 앱 파일이 실제로 변경될 때 `0.01`씩 올린다.

### 19.1 플랫폼과 배포

| 항목 | 1차 포함 |
|---|---|
| 앱 형태 | 단일 HTML |
| 배포 | GitHub Pages |
| 설치성 | PWA 가능 구조 |
| 모바일 대비 | Capacitor-ready adapter 구조 |
| APK | 실제 APK 빌드는 1차 제외 |
| APK 후보 appId | `com.hanwha27.accountingledger` 후보만 문서화 |

플랫폼 불변조건:

1. 회계 계산과 세무 판정 로직은 웹/PWA/APK 공통으로 둔다.
2. 브라우저 API는 adapter를 통해 호출한다.
3. `service_role`, Cloudinary secret, Google client secret은 HTML/APK에 넣지 않는다.
4. 모바일 오프라인 입력을 고려해 저장과 동기화는 분리한다.

### 19.2 로그인과 권한

| 항목 | 1차 포함 |
|---|---|
| 로그인 | Supabase Auth + Google OAuth |
| 초기 owner | `hanwha27@gmail.com` |
| 권한 모델 | owner 1명 중심 |
| 허용 이메일 관리 | owner 로그인 시 추가/해제 가능 |
| 세무사 계정 | 1차 제외 |
| RLS | 유지 |

보안 불변조건:

1. 클라이언트 이메일 체크만으로 접근제어를 끝내지 않는다.
2. RLS와 허용 사용자 테이블을 기준으로 접근을 막는다.
3. 로그아웃과 로컬 캐시 삭제 기능을 제공한다.
4. 모바일 PIN/생체인증은 APK 단계로 보류한다.

### 19.3 저장, 동기화, 백업

| 항목 | 1차 포함 |
|---|---|
| 로컬 구조화 데이터 | IndexedDB |
| 즉시 설정값 | localStorage |
| 클라우드 기준본 | Supabase Postgres |
| 최종본 동기화 | `canonical_version` 포함 |
| 백업 | JSON 백업/복원 |
| 백업 암호화 | 1차 제외, 경고 표시 |

동기화 불변조건:

1. 모든 주요 레코드는 `id`, `created_at`, `updated_at`, `deleted_at`을 가진다.
2. 일반 동기화는 `updated_at` 최신값 기준으로 병합한다.
3. 최종본 지정은 단순 병합이 아니라 `canonical_version` 변경이다.
4. 연결 테스트 성공 시 즉시 동기화를 실행한다.
5. batch upsert는 반드시 `res.ok`를 확인한다.

### 19.4 증빙 보관

| 항목 | 1차 포함 |
|---|---|
| 증빙 파일 | 이미지와 PDF |
| 원본 저장 | Cloudinary |
| 메타 저장 | Supabase/IndexedDB |
| 업로드 방식 | 제한적 unsigned upload preset |
| 증빙대장 | 세무사 전달 패키지 포함 |
| AI/OCR | 화면 노출 없음, `future_ocr_text`, `future_ai_summary` 자리만 |

증빙 불변조건:

1. Cloudinary에는 원본 이미지/PDF를 올린다.
2. DB에는 `cloudinary_public_id`, `secure_url`, `mime_type`, `file_hash`, 삭제상태를 저장한다.
3. PDF 미리보기 실패가 원본 보관 실패를 의미하지 않는다.
4. secret이 필요한 업로드 서명은 2차의 Supabase Edge Function에서 다룬다.

### 19.5 입력과 import/export

| 항목 | 1차 포함 |
|---|---|
| 직접 입력 | 간편장부식 쉬운 입력 |
| 내부 처리 | 복식부기 전표 자동 생성 |
| 전표 화면 | 고급/검토용으로 제공 |
| 국세청 간편장부 Excel | import/export |
| 은행/카드/PG/홈택스 import | 구조와 메뉴 자리만 |
| 중복 방지 | 카드대금, 세금계산서, 은행출금 중복 비용 방지 |

입력 불변조건:

1. 사용자는 쉽게 입력하지만 내부 원장은 복식부기 SSOT를 유지한다.
2. 간편장부 Excel은 내부 원장의 대체물이 아니라 import/export view다.
3. import 직후 자동 확정하지 않고 미리보기와 사용자 확인을 거친다.
4. AI가 없는 1차에서는 외부 AI 결과 id를 신뢰하지 않는다.

### 19.6 사업자, 사업장, 업종

| 항목 | 1차 포함 |
|---|---|
| 현재 UI | 개인사업자 1개 사업장 중심 |
| DB 구조 | 복수 사업자/복수 사업장/법인 전환 가능 |
| 법인사업자 | 선택지와 구조만 |
| 업종코드 | 공식 업종코드 수동 등록·갱신 구조 |
| 업종 판단 | 큰 업종에서 세부 조건으로 좁혀가기 |

업종 불변조건:

1. 앱 자체 업종 분류는 UI 질문지를 고르는 용도다.
2. 세무 판단 기준은 국세청/홈택스 공식 업종코드다.
3. 업종코드는 귀속연도와 출처 확인일을 함께 저장한다.

### 19.7 세무 기준과 리포트

| 항목 | 1차 포함 |
|---|---|
| VAT | 거래분류, 매출/매입 VAT 집계, 과세/면세/불공제 후보 |
| 부가세 신고서 | 1차 제외 |
| 종합소득세 | 신고 준비자료 |
| 소득세 서식 | 간편장부소득금액계산서, 총수입금액 및 필요경비명세서 |
| 자산/감가상각 | 자산대장, 감가상각 후보 계산, 조정명세서 초안 |
| 법정서식 최신화 | 리포트 생성 시 스냅샷 검사 |

리포트 불변조건:

1. 법정 최신 서식 스냅샷 없이는 확정 리포트를 출력하지 않는다.
2. 국세청 간편장부 호환 Excel과 법정 신고서식 PDF/Excel을 구분한다.
3. 세무조정은 자동 확정하지 않고 사용자 확인 후보로 둔다.
4. 전자신고 파일 생성은 2차 이후로 보류한다.

### 19.8 세무사 전달 패키지

1차부터 세무사 전달 패키지를 기본 기능으로 둔다.

| 산출물 | 포함 내용 |
|---|---|
| 국세청 간편장부 호환 Excel | 장부 원자료, 월별/계정별 검토 |
| 법정 최신 신고서식 PDF/Excel | 최신 서식 스냅샷 기준 신고서식 |
| 증빙대장 | 거래일, 거래처, 금액, 증빙유형, Cloudinary 링크, 파일 해시 |
| 거래 판단메모 | 검토 필요 거래, 세무조정 후보, 미확정 쟁점 |
| 검토 목록 | 미첨부 증빙, VAT 검토 필요, 마감 후 수정, import 미확정 행 |

세무사 전달은 1차에서 파일 내보내기만 제공한다. 세무사 로그인과 읽기 전용 공유는 2차 이후로 둔다.

### 19.9 마감, 감사로그, 연구노트

| 항목 | 1차 포함 |
|---|---|
| 월마감/연마감 | 상태 표시와 잠금 |
| 마감 후 수정 | 경고, 사유 입력, 감사로그 |
| 수정분개 자동화 | 2차 이후 |
| 연구노트 | 앱 개발/업데이트 이력 |
| 거래 판단 기록 | `decision_notes` 거래 판단메모 |

연구노트 불변조건:

1. 연구노트는 앱 개발과 업데이트 이력이다.
2. 거래와 세무 판단 근거는 거래 판단메모로 남긴다.
3. 앱/스킬 문서가 바뀌면 관련 버전과 연구노트 변경 이유를 남긴다.

### 19.10 화면과 UX

| 화면 | 1차 포함 |
|---|---|
| 첫 화면 | 업무 대시보드 |
| 입력 화면 | 간편장부식 입력 |
| 전표 화면 | 고급/검토용 |
| 용어 설명 | 국세청 용어 + 중학생도 이해할 수 있는 설명 |
| 언어 | 한국어 |
| 영문 UI | 2차 이후 |
| 알림 | 1차 제외, 체크리스트 화면 제공 |

대시보드에는 오늘/이번 달 입력 현황, 미첨부 증빙, 검토 필요 거래, 동기화 상태, 백업 상태, 마감/신고 체크리스트를 표시한다.

## 20. 2차 이후 보류 항목

| 항목 | 보류 이유 |
|---|---|
| APK 실제 빌드 | 1차는 단일 HTML 안정화 우선 |
| PIN/생체인증 | APK 단계에서 구현하는 편이 자연스러움 |
| Cloudinary 서명 업로드 | Edge Function 설계 후 강화 |
| 암호화 ZIP/비밀번호 백업 | JSON 백업 안정화 후 추가 |
| 세무사 로그인/읽기전용 공유 | owner 1명 구조 안정화 후 확장 |
| 은행/카드/PG/홈택스 자동 import | 중복 방지와 수동 import 구조 검증 후 자동화 |
| 법인세/법인 신고 로직 | 개인사업자 장부 안정화 후 추가 |
| 부가세 신고서 완성/전자신고 파일 | VAT 집계 검증 후 추가 |
| 종합소득세 전자신고 파일 | 법정서식 출력과 세무사 검토 흐름 안정화 후 추가 |
| 알림 | APK 또는 PWA 알림 권한 설계 후 추가 |
| AI 화면 기능 | API 키와 보안 설계 확보 후 추가 |

## 21. V1 상세 설계 산출물

설계 시작 후 아래 문서를 V1 구현 기준으로 사용한다.

| 문서 | 역할 |
|---|---|
| `docs/accounting-ledger-v1-detailed-design.md` | V1 전체 아키텍처, 모듈, 핵심 데이터 흐름, 완료 기준 |
| `docs/accounting-ledger-v1-schema-design.md` | Supabase/IndexedDB/JSON 백업이 공유할 데이터 모델과 테이블 설계 |
| `docs/accounting-ledger-v1-screen-flow.md` | 화면, 메뉴, 입력/증빙/import/report/마감 흐름 |
| `docs/accounting-ledger-app-research-notes.md` | 앱 개발·설계·업데이트 연구노트 |
