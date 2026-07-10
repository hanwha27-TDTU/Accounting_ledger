> **📌 Sub_app-research-notes_0.03** · 개정 2026-07-10

# Accounting Ledger App Research Notes

이 문서는 회계장부 앱의 개발, 설계, 업데이트 이력을 남기는 연구노트다. 거래나 세무 판단 근거는 이 문서가 아니라 앱 내부 `decision_notes`에 남긴다.

## 2026-07-09 설계 시작

| 항목 | 내용 |
|---|---|
| app_version | 앱 파일 미작성 상태. 앱 버전 증가 없음 |
| note_type | `design_decision` |
| 제목 | V1 상세 설계 시작 |
| 배경 | 사용자와 1차 범위 23개 항목을 확정했고, 구현 전 상세 설계 산출물 작성이 필요해짐 |
| 결정 | V1 설계를 전체 아키텍처, 스키마, 화면 흐름으로 분리 |
| 생성 문서 | `accounting-ledger-v1-detailed-design.md`, `accounting-ledger-v1-schema-design.md`, `accounting-ledger-v1-screen-flow.md` |
| 관련 스킬 | `Sub_v1-scope_0.01`, `Sub_mobile-apk-readiness_0.02` |

핵심 설계 원칙:

1. 단일 HTML/GitHub Pages를 1차 제품으로 둔다.
2. 내부 원장은 복식부기 SSOT로 유지한다.
3. 간편장부는 입력 UX와 출력 view로만 사용한다.
4. Supabase, IndexedDB, JSON 백업이 같은 도메인 구조를 공유하게 한다.
5. Cloudinary에는 이미지/PDF 증빙 원본을 보관한다.
6. 법정 신고서식은 최신 서식 스냅샷 없이는 확정 출력하지 않는다.
7. 모바일/APK 전환을 위해 platform adapter 구조를 설계 단계부터 둔다.

후속 작업:

| 순서 | 작업 |
|---|---|
| 1 | Supabase SQL migration 초안 작성 |
| 2 | 단일 HTML 앱 셸 설계와 상태관리 구조 구체화 |
| 3 | PostingEngine 자동분개 규칙 설계 |
| 4 | Cloudinary 업로드/증빙대장 상세 설계 |
| 5 | 국세청 간편장부 Excel import/export 매핑 설계 |

## 2026-07-09 Supabase SQL 적용

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| schema_version | `0.03` |
| note_type | `schema_review` |
| 대상 프로젝트 | Supabase `News&Accounting` / `ihxiywffzmvrwmqvatzt` |
| 결정 | 회계장부 V1 초기 스키마를 실제 Supabase 프로젝트에 적용하고, advisor 결과를 반영해 보정 |
| owner allowlist | `hanwha27@gmail.com` 단일 owner로 seed |
| 동기화 기준 | `accounting_sync_meta.canonical_version = 0` 초기화 |

적용된 원격 migration:

| 원격 version | name |
|---|---|
| `20260709123018` | `accounting_v1_initial_schema` |
| `20260709123349` | `accounting_v1_indexes_and_rls_tuning` |
| `20260709123504` | `accounting_v1_drop_duplicate_indexes` |
| `20260709123556` | `accounting_v1_schema_meta_003` |

로컬 migration 파일:

| 순서 | 파일 |
|---|---|
| 1 | `supabase/migrations/20260709000100_accounting_v1_initial_schema.sql` |
| 2 | `supabase/migrations/20260709000200_accounting_v1_indexes_and_rls_tuning.sql` |
| 3 | `supabase/migrations/20260709000300_accounting_v1_drop_duplicate_indexes.sql` |
| 4 | `supabase/migrations/20260709000400_accounting_v1_schema_meta_003.sql` |

검증 결과:

| 검증 | 결과 |
|---|---|
| 회계 테이블 수 | 38개 |
| RLS 적용 | 38/38 |
| FK 보조 인덱스 누락 | 0개 |
| migration 연구노트 row | 4개 |
| `last_schema_version` | `0.03` |

advisor 잔여 항목:

1. Security advisor의 ERROR/WARN은 기존 `news_items`, `language_sync_meta`, `vocab_items`, `usmle_cards` 관련 항목이다. 회계 신규 테이블이 아니므로 이번 회계 SQL 작업에서는 변경하지 않았다.
2. Performance advisor의 잔여 항목은 대부분 새 스키마 인덱스의 `unused_index` INFO다. 앱이 아직 데이터를 읽고 쓰기 전이라 정상적으로 남을 수 있는 항목이다.

## 2026-07-10 개발 운영·품질 게이트 도입

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 역할 기반 개발 운영 및 릴리스 게이트 도입 |
| 배경 | 회계·세무·동기화·증빙·권한 변경은 화면 구현만으로 안전성을 판단할 수 없으므로, 변경 전후의 계약·보안·데이터 이전·검증을 체계화할 필요가 있음 |
| 결정 | Repository Mapper, Planner, Implementer, Test Engineer, Reviewer, Release Manager를 모든 주요 변경의 기본 역할로 채택. Schema/Contract Guardian, Security Reviewer, Migration Agent는 데이터·권한·동기화 변경 시 필수 게이트로 적용 |
| 적용 문서 | `docs/skills/accounting-development-governance-skill.md`, `docs/accounting-ledger-v1-detailed-design.md` |
| 버전 정책 | 앱의 확정 변경은 `0.01` 단위로 증가. 변경된 스킬 문서는 개별 `Sub_` 버전 증가 및 연구노트 연결 |
| 검증 기준 | 범위, 계약, RLS/비밀키, 데이터 이전, 핵심 테스트, 모바일 UI, 문서 일치, 의도한 Git 파일만 커밋 여부를 배포 전 확인 |

적용 원칙:

1. 역할은 앱 사용자에게 보이는 기능이 아니라 개발 품질의 검토 관점으로 운영한다.
2. 각각의 역할을 별도 자동 에이전트로 늘리기보다, 변경 성격에 맞는 체크포인트로 실행하고 결과를 남긴다.
3. 동기화 구조는 `updated_at` 병합과 `canonical_version` 최종본 모드를 계속 분리한다.
4. RLS 제거, 클라이언트 비밀키 보관, 마이그레이션 없는 데이터 계약 변경은 금지한다.
