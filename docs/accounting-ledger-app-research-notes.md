> **📌 Sub_app-research-notes_0.10** · 개정 2026-07-11

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

## 2026-07-10 Claude 협업 인수인계 체계 도입

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | Claude 및 AI 협업자용 공유 인수인계 기준 도입 |
| 배경 | 다른 AI가 작업에 참여할 때 대화 기억이 아닌 저장소의 공통 문서로 현재 상태·불변조건·다음 우선순위를 일치시킬 필요가 있음 |
| 결정 | 루트 `CLAUDE.md`를 진입점으로 두고, `docs/claude-handoff.md`에 현재 상태를, `docs/claude-task-template.md`에 작업 요청 형식을, 별도 협업 스킬에 수령·검토 규칙을 기록 |
| 적용 문서 | `AGENTS.md`, `CLAUDE.md`, `docs/claude-handoff.md`, `docs/claude-task-template.md`, `docs/skills/accounting-claude-collaboration-skill.md` |
| 보안 원칙 | API secret, service role, OAuth client secret, 원본 세무자료는 협업 문서·프롬프트에 포함하지 않음 |
| 갱신 기준 | 다음 구현 우선순위, 앱 버전, 스키마·RLS·Auth·동기화·법정서식·증빙 정책이 바뀌면 인수인계와 연구노트를 함께 갱신 |

적용 원칙:

1. Git 최신 커밋과 작업 트리가 실제 상태의 최종 기준이다.
2. Claude 결과는 그대로 반영하지 않고, 현재 저장소 기준의 diff·계약·보안·테스트 검토를 거친다.
3. 원격 push·배포·파괴적 DB 작업은 사용자의 명시적 요청이 있어야 한다.

## 2026-07-10 프로젝트 전용 품질 하네스 도입

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 실행 가능한 AI 협업 품질 하네스와 CI 도입 |
| 기준선 | 런타임 `index.html`, 기존 패키지 명령, 자동 테스트, CI가 없는 설계 단계. Supabase migration 4개와 AI 협업 문서만 존재 |
| 결정 | Node 24 기반 `npm run harness:check`을 공식 순수 검증 명령으로 도입하고, 동일 명령을 GitHub Actions의 main push/PR에서 실행 |
| Required | 공통 문서 계약, migration 계약, 참고 원본·자격증명 추적 방지, Git diff 공백 검사 |
| Baseline/Manual | `index.html` 버전·업데이트 이력 검사, 브라우저 왕복, 원격 Supabase advisor 검증은 실제 기능·도구 도입 전에는 상태를 숨기지 않고 별도 보고 |
| 앱 영향 | 앱 코드·스키마·운영 Supabase 데이터 변경 없음. 문서·검사·CI만 추가 |
| 적용 문서 | `AGENTS.md`, `CLAUDE.md`, `package.json`, `scripts/harness-check.mjs`, `.github/workflows/harness.yml`, `docs/accounting-ledger-harness-baseline.md`, `docs/skills/accounting-harness-quality-gate-skill.md` |

적용 원칙:

1. Required 실패가 있으면 완료 선언을 하지 않는다.
2. Baseline과 Manual은 통과로 가장하지 않고, 기능 도입 시 Required 승격 여부를 검토한다.
3. 기존 검사·코드가 없는 상태에서 `DOMAIN_REGISTRY`, 브라우저 테스트, 백업 포맷을 추측해 만들지 않는다.
4. 하네스 작업은 앱 버전을 올리지 않으며, 앱 `index.html` 변경부터 `0.01` 증가 규칙을 적용한다.

## 2026-07-11 회계 도메인 Guardian 체계 도입

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 복식부기·분개·계정과목·세무 매핑 검증 Guardian 체계 도입 |
| 배경 | 기존 개발 품질 에이전트는 코드·스키마·배포 품질을 보지만, 장부 데이터가 회계적으로 성립하는지 별도 검증 축이 필요함 |
| 결정 | Double-Entry Guardian, Journal Entry Validator, Chart of Accounts Guardian, Ledger Reconciliation Agent, Period Close Guardian, Audit Trail Guardian, Import Normalization Agent, Financial Statement Generator, Tax Mapping Reviewer, Anomaly Detection Agent를 회계 도메인 검증 에이전트로 채택 |
| 법령 체계도 연결 | Tax Mapping, Financial Statement, Chart of Accounts, Period Close, Audit Trail 검증은 법령·서식 snapshot과 연결 |
| 적용 문서 | `docs/skills/accounting-domain-guardians-skill.md`, `docs/skills/accounting-legal-forms-skill.md`, `docs/skills/accounting-development-governance-skill.md`, `docs/claude-handoff.md` |
| 버전 영향 | 앱 버전 변경 없음. `Sub_domain-guardians_0.01`, `Sub_legal-forms_0.02`, `Sub_development-governance_0.04`, `Sub_app-research-notes_0.06` |

적용 원칙:

1. 입력 UX가 간편장부처럼 보여도 내부 검증은 복식부기 기준으로 수행한다.
2. 법정 신고·세무사 전달 리포트는 최신 법령·서식 snapshot 확인 없이는 확정 출력으로 표시하지 않는다.
3. import, 자동분개, 세무 매핑, 마감, 감사 이력은 각각 담당 Guardian의 검증 결과를 남긴다.
4. V1의 이상탐지는 AI 추론이 아니라 규칙 기반 finding으로 시작한다.

## 2026-07-11 개발자 모드용 Guardian 표시 레지스트리 추가

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 앱 개발자 모드에서 확인할 회계 Guardian 역할·기능 목록 추가 |
| 배경 | 향후 앱 개발자 모드에 버튼을 만들어 현재 적용된 회계 검증 에이전트의 역할과 기능을 확인할 수 있게 할 예정 |
| 결정 | `accounting-domain-guardians-skill.md`에 사람용 표와 앱 이식용 JSON 레지스트리를 함께 기록 |
| 표시 대상 | Double-Entry, Journal Entry, Chart of Accounts, Ledger Reconciliation, Period Close, Audit Trail, Import Normalization, Financial Statement, Tax Mapping, Anomaly Detection |
| 구현 원칙 | 실제 앱에서는 레지스트리 표시와 구현 상태를 분리하고, `implemented`, `manual_only`, `planned` 같은 상태값을 별도 관리 |
| 버전 영향 | 앱 버전 변경 없음. `Sub_domain-guardians_0.02`, `Sub_app-research-notes_0.07` |

## 2026-07-11 회계 Guardian 확장 에이전트 추가

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 증빙·VAT·사업유형·신고준비·백업복원 중심 확장 Guardian 추가 |
| 배경 | 기존 10개 Guardian은 원장·분개·계정과목 중심이므로, 실제 세무 실무와 운영 안정성을 위해 증빙, 부가세, 사업유형, 신고준비, 백업·복원, 권한, 법령 업데이트 확인 축이 필요함 |
| 결정 | Evidence Compliance, VAT Consistency, Depreciation & Asset, Business Classification, Filing Readiness, Cashflow & Liquidity, Backup & Restore, Permission & Owner, Legal Update Watcher, Developer Mode Registry를 확장 Guardian으로 추가 |
| 1차 중요 축 | 증빙, VAT, 사업유형, 신고준비, 백업·복원은 앱 구조 초기에 검증 축으로 반영 |
| 표시 대상 | 개발자 모드 레지스트리 총 20개 Guardian |
| 버전 영향 | 앱 버전 변경 없음. `Sub_domain-guardians_0.03`, `Sub_app-research-notes_0.08` |

## 2026-07-11 코드 설계 효율화 Guardian 체계 추가

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 단일 HTML 앱 구조를 위한 코드 설계 Guardian 추가 |
| 배경 | 단일 HTML 앱은 빠르게 만들 수 있지만 UI, 상태, 도메인, 저장소, 원격 adapter가 한 파일 안에서 섞이면 유지보수가 급격히 어려워짐 |
| 결정 | Single HTML Architecture, State Management, Domain Boundary, Adapter Layer, Complexity Budget, Refactor Safety, Performance Budget, Dependency Minimalism, Error Handling, Developer Experience Agent를 코드 설계 효율화 Guardian으로 채택 |
| 적용 문서 | `docs/skills/accounting-code-architecture-guardians-skill.md`, `AGENTS.md`, `CLAUDE.md`, `docs/claude-handoff.md`, `docs/skills/accounting-development-governance-skill.md` |
| 하네스 영향 | 새 코드 설계 Guardian 스킬을 project-contract와 instruction-contract 필수 검사에 포함 |
| 버전 영향 | 앱 버전 변경 없음. `Sub_code-architecture-guardians_0.01`, `Sub_development-governance_0.05`, `Sub_harness-baseline_0.03`, `Sub_harness-quality-gate_0.03`, `Sub_app-research-notes_0.09` |

적용 원칙:

1. `index.html` 작업은 UI, State, Domain, Persistence, Remote Adapter, Validation, Report 레이어를 의식해 진행한다.
2. 회계·세무 판단 로직을 DOM 이벤트 핸들러나 Supabase 호출 안에 직접 넣지 않는다.
3. 저장·동기화·로그인·import 실패는 Error Handling Guardian 기준으로 사용자 메시지와 내부 진단을 분리한다.
4. 외부 라이브러리 추가는 단일 HTML 유지성, 오프라인 영향, 보안 영향, 대체 가능성을 기록한 뒤 결정한다.

## 2026-07-11 배포 명령 의미 확정

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | “배포해주세요” 명령의 작업 범위 확정 |
| 결정 | 사용자가 “배포해주세요”라고 말하면 검증, 필요한 커밋, main 반영, 원격 push, 가능한 호스팅 배포, Claude 인수인계 메시지 작성을 포함해 진행 |
| 적용 문서 | `AGENTS.md`, `CLAUDE.md`, `docs/claude-handoff.md` |
| 제한 | 원본 참고 Excel·PDF·ZIP, 비밀키, service role, OAuth secret, Cloudinary secret은 배포 범위에서 제외 |
| 버전 영향 | 앱 버전 변경 없음. `Sub_app-research-notes_0.10` |
