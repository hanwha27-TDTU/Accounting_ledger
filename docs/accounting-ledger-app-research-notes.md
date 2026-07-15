> **📌 Sub_app-research-notes_0.45** · 개정 2026-07-12

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

## 2026-07-11 개인정보·오프라인·리포트 설명성 Guardian 추가

| 항목 | 내용 |
|---|---|
| app_version | `0.00` |
| note_type | `design_decision` |
| 제목 | 민감정보, 법정서식 필드 매핑, 리포트 설명성, 오프라인·충돌, 테스트 데이터 Guardian 추가 |
| 배경 | 기존 Guardian 체계가 회계 정확성·코드 구조를 포괄하지만, 개인정보 노출, 서식 필드 매핑, 리포트 숫자 추적성, 오프라인 UX, 충돌 해결, 보관/삭제, fixture 품질을 별도 검토 축으로 둘 필요가 있음 |
| 도메인 추가 | Form Field Mapping Guardian, Report Explainability Agent, Data Export Portability Guardian |
| 코드 설계 추가 | Data Privacy Guardian, User Guidance Copy Reviewer, Accessibility Guardian, Offline-First UX Guardian, Conflict Resolution Guardian |
| 개발 운영 추가 | Retention & Deletion Guardian, Test Data & Fixture Guardian |
| 버전 영향 | 앱 버전 변경 없음. `Sub_domain-guardians_0.04`, `Sub_code-architecture-guardians_0.02`, `Sub_development-governance_0.06`, `Sub_app-research-notes_0.11` |

적용 원칙:

1. 리포트 숫자는 원천 거래와 분개까지 추적 가능해야 한다.
2. 법정서식과 앱 데이터 필드의 미매핑 항목은 확정 출력 전에 차단한다.
3. 개인정보와 세무자료는 화면, 로그, export, 개발자 모드에서 각각 노출 경로를 점검한다.
4. 오프라인 상태와 동기화 충돌은 오류로 숨기지 않고 사용자에게 상태와 복구 경로를 표시한다.
5. 테스트 fixture에는 실제 개인정보와 실제 증빙 원본을 사용하지 않는다.

## 2026-07-11 앱 0.01 첫 런타임 구현

| 항목 | 내용 |
|---|---|
| app_version | `0.01` |
| note_type | `feature_release` |
| 제목 | 단일 HTML 업무 앱과 로컬 복식부기 기준선 구현 |
| 사용자 변화 | 대시보드에서 사업자 설정, 2025 소급 거래 입력, 장부와 복식 전표 검토를 실제로 사용할 수 있음 |
| 내부 변화 | UI·State·Domain·Persistence·Remote Adapter·Validation·Report 경계를 단일 `index.html` 안에 분리 |
| 데이터 | IndexedDB 13개 store, 공통 UUID·created_at·updated_at·deleted_at, sync queue, JSON 백업·복원 |
| 회계 | 총액 VAT 후보 분리, 수입·비용·자산 자동분개, 차변·대변 균형 차단, 원천거래 추적 |
| 원격 | Supabase JS `2.110.2` Google OAuth adapter, allowlist 확인, REST `response.ok`, updated_at 병합, canonical version 변경 감지 구조 |
| 개발자 모드 | 회계 Guardian 23개, 코드 설계 Guardian 15개, 개발 운영 역할 14개의 실제 구현 상태 표시 |
| 적용 역할 | Repository Mapper, Planner, Implementer, Test Engineer, Reviewer, Schema/Contract, UI/UX, Security, Migration, Release, Domain·Architecture Guardians |
| 변경 문서 | `index.html`, `CLAUDE.md`, `docs/claude-handoff.md`, 하네스 기준선, V1 범위·코드 구조·하네스 스킬 |
| 스킬 버전 | `Sub_v1-scope_0.02`, `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.04`, `Sub_harness-baseline_0.04` |

검증 결과:

1. `npm run harness:check`의 Required 게이트가 모두 통과했다.
2. 실제 브라우저에서 테스트 사업자와 2025-03-15 비용 110,000원을 저장했다.
3. 공급가액 100,000원, 부가세대급금 10,000원, 보통예금 대변 110,000원으로 전표가 생성되었다.
4. 전표 차변 합계와 대변 합계가 각각 110,000원으로 일치했다.
5. 390x844 모바일 viewport에서 문서 가로 overflow가 없고 모바일 메뉴가 정상 열렸다.
6. 개발자 모드에서 52개 역할·Guardian 상태가 표시되며 브라우저 console error는 없었다.

남은 위험과 다음 단계:

1. 실제 publishable key와 Redirect URL이 없어 Google OAuth·allowlist·RLS 왕복은 아직 검증하지 않았다.
2. Cloudinary 이미지/PDF 업로드, 국세청 Excel import/export, 법정서식 snapshot 출력은 완료 기능이 아니다.
3. canonical version 변경 수렴 구조는 구현했지만 두 기기·원격 DB 자동 시나리오 테스트와 현재 기기 최종본 지정 UI가 남아 있다.
4. JSON 백업 생성 구조는 구현했지만 브라우저 다운로드·복원 왕복의 자동 테스트를 추가해야 한다.

## 2026-07-11 앱 0.02 Supabase 공개 연결·인증 사전 진단

| 항목 | 내용 |
|---|---|
| app_version | `0.02` |
| note_type | `feature_release`, `security_review` |
| 제목 | 운영 Supabase publishable 연결과 Google provider 준비 상태 진단 |
| 사용자 변화 | 별도 키 입력 없이 운영 프로젝트 연결 상태를 확인하고, Google provider가 준비되지 않으면 로그인 시도를 차단 |
| 보안 변화 | 로그인 전 `businesses` 조회가 비어 있는지 확인해 익명 회계자료 노출 시 연결을 중단 |
| 데이터 영향 | Supabase schema와 row 변경 없음. 진단은 read-only 요청만 사용 |
| 스킬 버전 | `Sub_auth-login_0.02`, `Sub_v1-scope_0.03`, `Sub_harness-quality-gate_0.05`, `Sub_harness-baseline_0.05`, `Sub_app-research-notes_0.13` |

원격 확인 결과:

1. 운영 프로젝트 `ihxiywffzmvrwmqvatzt`는 정상 상태이며 modern publishable key를 브라우저 공개 연결에 사용한다.
2. owner allowlist는 `hanwha27@gmail.com` 1건, Auth 사용자와 Google identity는 각각 0건이다.
3. `accounting_sync_meta.canonical_version`은 `0`, `last_schema_version`은 `0.03`이다.
4. 익명 REST `businesses?select=id&limit=1`은 HTTP 200과 빈 배열을 반환한다. 현재 `businesses`가 0건이므로 이 결과는 노출 감지 canary로 기록한다.
5. SQL에서 `businesses` SELECT 정책은 `authenticated` 역할에만 적용되고 `owner_user_id = auth.uid()`와 `deleted_at is null`을 요구한다. 익명 격리 판정은 이 정책 검증과 REST 결과를 합쳐 내렸다.
6. Google authorize endpoint는 provider 비활성으로 HTTP 400을 반환한다. 따라서 실로그인 완료로 간주하지 않는다.
7. 기존 비회계 테이블의 advisor 경고는 이번 범위에서 수정하지 않았다.

브라우저 확인 결과:

1. Data API `정상`, 익명 회계자료 `차단 정상`, Google OAuth `설정 필요`가 표시된다.
2. Google 로그인 버튼은 비활성이고 Supabase provider 설정 링크가 표시된다.
3. 수동 `연결 진단`을 다시 실행해도 같은 상태로 수렴한다.
4. 390px 모바일 폭에서 가로 overflow가 없고 console error가 없다.

다음 단계는 Google Cloud 웹 OAuth Client ID와 Client Secret을 Supabase Dashboard에만 등록하고, Redirect URL을 설정한 뒤 `hanwha27@gmail.com` 실제 로그인·allowlist 연결·인증 RLS·로그아웃을 왕복 검증하는 것이다.

## 2026-07-11 앱 0.03 Google OAuth 실로그인·동적 연결 가이드

| 항목 | 내용 |
|---|---|
| app_version | `0.03` |
| note_type | `feature_release`, `security_review`, `user_guidance` |
| 제목 | Google OAuth 실로그인 검증과 설정 SSOT 기반 연결 가이드 |
| 사용자 변화 | 사이드바 `가이드`에서 `구글클라우드 연결방법`을 열고 프로젝트 생성부터 앱 로그인까지 단계별로 확인 가능 |
| 자동 연동 | 앱 버전, owner 이메일, Google Cloud 프로젝트, GitHub Pages URL, 현재 Supabase URL·callback, 연결 진단과 로그인 상태를 런타임 기준값에서 읽음 |
| 보안 | Client Secret을 가이드·앱 상태·문서·Git에 저장하지 않으며 Supabase Dashboard에만 입력하도록 명시 |
| 데이터 영향 | Supabase 스키마·row 변경 없음. 원격 확인은 read-only SQL만 사용 |
| 스킬 버전 | `Sub_auth-login_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_harness-baseline_0.06`, `Sub_app-research-notes_0.14` |

원격·브라우저 확인 결과:

1. Google provider가 활성화됐고 앱 진단에서 Data API `정상`, 익명 회계자료 `차단 정상`, Google OAuth `사용 가능`을 확인했다.
2. `hanwha27@gmail.com` 실제 OAuth 왕복 뒤 앱이 `동기화 완료` 상태로 전환됐다.
3. Supabase `auth.users`에 owner 계정 1명, `auth.identities`에 Google identity 연결 1건을 read-only SQL로 확인했다.
4. `app_allowed_users`의 owner row는 `role='owner'`, `status='active'`, `deleted_at is null`이다.
5. 운영 스키마는 allowlist 이메일과 검증된 JWT 이메일을 대조하며, 사업장 소유권은 `businesses.owner_user_id = auth.uid()`로 통제한다. 초기 설계 문서의 `auth_user_id` 연결 설명은 현행 계약에 맞춰 수정했다.
6. 로컬 앱의 1280px desktop과 390x844 mobile에서 가이드 route, 주제 열기, 모바일 메뉴의 가이드 위치, 긴 URL 줄바꿈과 가로 overflow 없음, 복사 성공 알림을 확인했다.
7. 가이드 브라우저 검증 중 console error는 0건이었다.

가이드 자동 연동 원칙:

1. 안내 절차와 값은 같은 화면 안에서도 분리한다. 절차 문장은 검토 가능한 콘텐츠이고, 주소·이메일·버전·상태는 `APP_INFO`, `GuideService`, 런타임 state에서 계산한다.
2. Google 승인 원본은 경로 없는 origin을, Supabase Site/Redirect URL은 저장소 경로와 끝 `/`를 포함한 완전한 앱 URL을 사용한다.
3. 복사 버튼은 공개 설정값만 제공하고 publishable key와 Client Secret은 가이드에 표시하지 않는다.
4. 런타임 하네스가 가이드 route, `GuideService`, 복사 표식, Google 프로젝트·GitHub Pages SSOT 존재를 Required로 확인한다.

남은 검증:

1. 사업자 정보를 저장한 뒤 인증 사용자 기준 `businesses` 생성·조회·수정 RLS 왕복을 확인한다.
2. 비허용 Google 계정의 접근 차단과 로그아웃을 확인한다.
3. GitHub Pages에 앱 0.03을 배포한 뒤 배포 URL에서 OAuth·가이드·모바일 화면을 다시 확인한다.

## 2026-07-11 앱 0.04 businesses CRUD·RLS 왕복 자가검증

| 항목 | 내용 |
|---|---|
| app_version | `0.04` |
| schema_version | `0.03` (DB 스키마·migration 변경 없음) |
| note_type | `feature_release`, `security_review` |
| 제목 | 인증 owner 기준 `businesses` CRUD와 Supabase RLS 왕복 자가검증 |
| 사용자 변화 | 로그인 상태에서 `설정 → 사업자 CRUD·RLS 왕복 검증`을 실행하면 생성·조회·수정·소프트삭제 격리·정리 5단계 결과를 확인 가능 |
| 구현 | `SupabaseAdapter.businessRoundtrip`가 owner 세션 access token으로 격리된 임시 행(`__rls_probe__`)을 REST INSERT·SELECT·PATCH·soft delete·DELETE로 왕복하고, `SyncService.runBusinessRoundtrip`가 state에 결과를 저장, 설정·개발 기록에 표시 |
| 데이터 안전 | 임시 행은 IndexedDB·로컬 state에 저장하지 않고, `finally`에서 항상 DELETE로 정리. 실제 사업자 row는 변경하지 않음 |
| 스킬 버전 | `Sub_auth-login_0.03`, `Sub_domain-guardians_0.04`, `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.15` |

원격 read-only 확인 결과(`ihxiywffzmvrwmqvatzt`):

1. `businesses` RLS 활성, 정책 4개. SELECT `owner_user_id = auth.uid() and deleted_at is null`, INSERT with_check `owner_user_id = auth.uid() and accounting_is_allowed_user()`, UPDATE using·with_check `owner_user_id = auth.uid()`, DELETE using `owner_user_id = auth.uid()`.
2. owner allowlist `hanwha27@gmail.com:owner:active`, `accounting_sync_meta.canonical_version = 0`, `businesses` 실제 row 0건.
3. owner uid `c9ff5188-51a7-4c01-b653-b6e1d73d0790`, `auth.users` 1건 확인.
4. owner uid·email claim으로 시뮬레이션한 `authenticated` 세션(모두 `rollback` 트랜잭션)에서 `auth.uid()`·`auth.jwt()->>'email'`·`accounting_is_allowed_user()`가 기대값을 반환하고, 임시 행 create·read(자기 행 1건)·update(이름 반영) 왕복이 통과했다.
5. soft delete 격리(`deleted_at` 설정 후 SELECT 제외)와 cleanup(DELETE)은 확인된 SELECT `deleted_at is null`·DELETE `owner_user_id = auth.uid()` 정책의 직접 결과다.
6. 모든 시뮬레이션 쓰기는 롤백되어 실제 `businesses`에 잔존 행이 없음을 재확인했다(총 0건, probe 0건).

설계 판단:

1. 왕복 검증은 owner 실데이터를 건드리지 않도록 별도 probe id를 쓰고 로컬에 저장하지 않는다. CRUD 전 단계(생성·조회·수정·삭제)를 포함하되 정리까지 자동화한다.
2. soft delete는 삭제 실패가 아니라 SELECT 정책에서 제외되는 정상 동작으로 검증한다. 완전 삭제 동기화(tombstone)와 canonical 수렴은 이후 단계 과제로 남긴다.
3. adapter 계층만 REST I/O를 담당하고 도메인·UI는 상태와 표시에만 관여한다.

수동 확인(브라우저):

1. 운영 URL에서 owner Google 로그인 후 왕복 검증 5단계가 모두 `통과`인지 확인한다.
2. 검증 후 클라우드 `businesses`에 `__rls_probe__` 잔존 행이 없는지 확인한다.
3. 비허용 계정·비로그인 상태에서는 버튼이 노출되지 않거나 `AUTH_REQUIRED`로 차단되는지 확인한다.

## 2026-07-11 앱 0.05 데이터 관리 화면과 앱 목적 명문화

| 항목 | 내용 |
|---|---|
| app_version | `0.05` |
| schema_version | `0.03` (DB 스키마·migration 변경 없음) |
| note_type | `feature_release`, `product_direction` |
| 제목 | `관리 → 데이터 관리` 화면 추가와 최상위 앱 목적(미션) 명문화 |
| 사용자 변화 | `개발 기록` 아래 `데이터 관리` 메뉴 신설. 로컬 저장 상태 확인, JSON 백업·복원, 클라우드 동기화, 거래 부분 삭제, 이 기기 전체 삭제를 2열 대칭 그리드로 통합 |
| 삭제 설계 | 부분 삭제는 `AppService.deleteTransaction`가 원천거래·전표·전표라인을 함께 `deleted_at` 소프트삭제하고 `tombstones`·`audit_logs`·`sync_queue`에 반영. 일괄 삭제는 `clearLocalData`가 IndexedDB store만 비우고 Supabase 연결 설정·기기 식별자(localStorage)는 유지 |
| 목적 명문화 | `accounting-ledger-design-directive-v2.md` `0. 최상위 결론`에 앱 목적(미션)을 추가하고 `AGENTS.md`·`CLAUDE.md`·핸드오프에 요약 반영. 초등학생 눈높이의 쉬움과 세무사 수준의 정확성을 동시에 지향하되, 법정 확정 출력은 최신 서식 스냅샷 검증 전에는 확정 표시하지 않는다 |
| 디자인 | `.data-grid` 2열 대칭 그리드와 `.data-card` flex 컬럼(액션 하단 정렬)로 6개 카드가 동일 구조·높이를 갖도록 통일. 780px 이하에서 1열로 접힘 |
| 스킬 버전 | `Sub_domain-guardians_0.04`, `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.16` |

검증:

1. `npm run harness:check` Required 0 fail, runtime version `0.04 → 0.05` 통과, `git diff --check` 공백 오류 없음.
2. 인라인 앱 스크립트 `vm.Script` 파싱 통과.
3. 백업·복원 로직은 설정 화면에서 데이터 관리로 이동(중복 제거), 관련 이벤트 핸들러 id를 `data*`로 정리.

남은 위험/미완:

1. 다기기 삭제 수렴을 위한 `tombstones` pull 처리는 미구현이다. 현재는 삭제 기기의 소프트삭제 행을 `sync_queue` upsert로 클라우드에 반영하는 수준이다. → **0.06에서 구현 완료.**
2. 실제 브라우저에서 부분/일괄 삭제 후 IndexedDB 상태와 동기화 큐, 복원 왕복은 수동 확인이 필요하다.

## 2026-07-11 앱 0.06 tombstone 기반 다기기 삭제 수렴 (좀비 데이터 방지)

| 항목 | 내용 |
|---|---|
| app_version | `0.06` |
| schema_version | `0.03` (DB 스키마·migration 변경 없음, 기존 `tombstones` 테이블 사용) |
| note_type | `feature_release`, `sync_review`, `security_review` |
| 제목 | 삭제한 데이터가 다른 기기에서 되살아나지 않도록 tombstone 동기화 수렴 |
| 배경 | 삭제 후 RLS SELECT(`deleted_at is null`)가 삭제 행을 숨겨 pull로는 삭제가 다른 기기로 전파되지 않았다. `tombstones` 스토어는 기록만 하고 읽지 않는 죽은 코드였다. |
| 구현 | `SupabaseAdapter.pullTombstones`/`pushTombstones`(append-only, `resolution=ignore-duplicates`)와 `SyncService.convergeTombstones`. 동기화 정상·canonical 경로 모두에서 cloud tombstone pull → 로컬에 없던 것 push → 모든 tombstone을 대상 store 로컬 행에 멱등 소프트삭제 적용. |
| 좀비 방지 근거 | (a) 삭제 행은 `updated_at` 최신값 승리 병합에서 활성 복사본에 덮이지 않음. (b) 동기화는 `sync_queue` pending만 업로드해 비-큐 로컬 행을 재업로드하지 않음. (c) 삭제 전파는 tombstone 채널로만. 삭제한 기기·클라우드에서 자기복구되는 경로 없음. |
| RLS 확인 | `tombstones` 컬럼 8개. SELECT·INSERT = `(business_id is null and accounting_is_allowed_user()) or accounting_can_access_business(business_id)`, UPDATE/DELETE 정책 없음(append-only). owner uid `c9ff5188-...`로 인증 세션 시뮬레이션(롤백)에서 tombstone INSERT·SELECT 통과. 잔존 행 0(businesses 0, tombstones 0) 재확인. |
| 테스트 | 수렴 알고리즘 로직 테스트 7/7: 다기기 수렴(B가 A의 삭제 학습), 멱등성, 삭제 기기 무재생성, untombstoned 행 유지, 미지 store 안전. |
| 스킬 버전 | `Sub_domain-guardians_0.04`, `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.17` |

남은 위험/미완:

1. **잠재 좀비 트랩**: 향후 거래 수정(update) 기능을 추가하면, 다른 기기에서 이미 삭제됐지만 tombstone을 못 받은 행을 편집·재업로드해 되살릴 수 있다. 수정 기능 구현 시 upsert 전에 `tombstones`/`deleted_at` 확인 가드 필수. 현재는 수정 UI가 없어 트리거되지 않는다.
2. canonical version 강제 최종본 지정은 아직 UI/코드로 배선되지 않았다(어디서도 cloud canonical을 증가시키지 않음).
3. 실제 브라우저 2대에서의 삭제→동기화→타기기 소멸 왕복은 수동 확인 대상이다.
4. 매 동기화에서 cloud에 없는 로컬 tombstone을 push할 때 전체를 훑는다(V1 개인 규모에서 문제없음). 대량화 시 업로드 완료 표식 최적화 여지.

## 2026-07-11 앱 0.07 소유자 전용 허용 사용자(allowlist) 관리와 계정 차단 검증

| 항목 | 내용 |
|---|---|
| app_version | `0.07` |
| schema_version | `0.03` (DB 스키마·migration 변경 없음, 기존 `app_allowed_users`·`auth_access_logs` 사용) |
| note_type | `feature_release`, `security_review` |
| 제목 | 비허용 Google 계정 차단 확인과 owner 허용 사용자 관리 흐름 |
| 사용자 변화 | 설정에 `허용 사용자 관리(owner 전용)` 패널 추가. bootstrap owner만 보이며 허용 이메일 조회·추가·차단(blocked)·재허용(active) 가능. 변경은 `auth_access_logs`에 기록 |
| 구현 | `SupabaseAdapter.listAllowedUsers/insertAllowedUser/updateAllowedUser/logAccessEvent`, `SyncService.loadAllowedUsers/addAllowedUser/setAllowedUserStatus/accessEvent`, `isBootstrapOwner()`, `renderAllowlist()`. 로그인·동기화 시 `loadAllowedUsers` 호출 |
| 차단 경로 | 비허용/차단 계정은 기존 `checkAllowed`가 `status='active'` 아니면 `AUTH_EMAIL_NOT_ALLOWED`로 차단하고 `initializeAuth`가 로그아웃 처리 |
| 스키마 계약 발견 | `app_allowed_users` CHECK: role ∈ {owner, editor, viewer}, status ∈ {active, blocked, pending}. 초안이 쓰던 `member`/`revoked`는 제약 위반 → 앱을 viewer/editor·blocked로 수정(추가 시 화이트리스트 검증). DB에서 먼저 확인해 런타임 실패를 예방 |
| 보안 가드 | `renderAllowlist`는 `isBootstrapOwner()`에서만 노출. 소유자 자기 차단은 `ALLOWLIST_OWNER_PROTECTED`로 차단. 감사 로그는 best-effort(실패해도 관리 동작 비차단) |
| DB 검증 (전부 롤백) | owner 세션: insert(viewer/active)·update(blocked)·`auth_access_logs` insert·전체 조회(2행) 통과. 비-owner(`intruder@example.com`) 세션: `accounting_is_bootstrap_owner()=false`, 가시 행 0, insert RLS 42501 차단. 잔존 행 없음(app_allowed_users 1=seed owner, auth_access_logs 0) |
| 스킬 버전 | `Sub_auth-login_0.03`, `Sub_domain-guardians_0.04`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.18` |

남은 위험/미완:

1. V1은 단일 owner 모델이라 추가 허용 사용자는 앱 로그인만 가능하고 owner의 `businesses`(owner_user_id 기준 RLS)에는 접근하지 못한다. 다중 사용자 공유는 후속 범위다.
2. 실제 브라우저에서 비허용 계정 로그인 차단·owner 패널 노출·추가/차단 왕복은 수동 확인 대상이다(`docs/accounting-ledger-browser-checklist.md`).

## 2026-07-11 앱 0.08 canonical version 최종본 지정과 다기기 수렴 자동 테스트

| 항목 | 내용 |
|---|---|
| app_version | `0.08` |
| schema_version | `0.03` (DB 스키마·migration 변경 없음) |
| note_type | `feature_release`, `sync_review` |
| 제목 | canonical version 최종본 지정 배선과 다기기 수렴 자동 테스트 |
| 배경 | 소비 경로(`cloudCanonical > localCanonical` → 전체 replace)는 0.01부터 있었으나, cloud `canonical_version`을 올리는 생산 경로가 없어 잠들어 있었다(AGENTS 동기화 6-9의 최종본 지정 미배선). |
| 구현 | `SupabaseAdapter.upsertMany`/`setSyncMeta`, `SyncService.designateCanonical`. owner가 데이터 관리 동기화 카드의 `이 기기를 최종본으로` 실행 → 전체 로컬 행(accounts는 remoteSafe)·tombstone 업로드 → `accounting_sync_meta.canonical_version = max(cloud, local)+1` → 로컬 canonical 채택, 대기 큐 superseded. owner 전용(`CANONICAL_OWNER_ONLY` 가드 + RLS). |
| RLS | `accounting_sync_meta`: SELECT=`accounting_is_allowed_user()`, INSERT/UPDATE/DELETE=`accounting_is_bootstrap_owner()`. owner canonical upsert DB 검증(롤백) 통과, 실제 canonical 0 유지. |
| 자동 테스트 | 두 기기+가짜 클라우드 시뮬레이션(syncNow/convergeTombstones/designateCanonical 로직 복제) 9/9: 일반 병합 수렴, 삭제 수렴·무재생성, canonical 지정 시 소비 기기가 로컬 전용 미동기화 행을 버리고 수렴·canonical 채택, 지정 기기가 삭제를 되살리지 않음. |
| 안전 | 최종본 지정은 다른 기기의 로컬 전용 변경을 덮으므로 강한 확인창 + owner 전용. canonical이 바뀐 소비 기기는 병합 결과를 재업로드하지 않는다(AGENTS #9). |
| 스킬 버전 | `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.19` |

남은 위험/미완:

1. 실제 브라우저 2대에서의 최종본 지정→타기기 수렴 왕복은 수동 확인 대상이다.
2. `designateCanonical`은 전체 로컬 행을 업로드한다(V1 개인 규모 적합). 대량화 시 청크 업로드·부분 실패 재시도 보강 여지.
3. canonical 충돌(두 기기가 거의 동시에 지정)은 V1 단일 owner 가정에서 드물며, `max+1`로 단조 증가만 보장한다. 다중 동시 지정 조정은 후속 범위.

## 2026-07-11 앱 0.09 Cloudinary 증빙 첨부와 evidence_files 메타 동기화

| 항목 | 내용 |
|---|---|
| app_version | `0.09` |
| schema_version | `0.03` (Supabase 스키마·migration 변경 없음). IDB는 버전 1→2로 `evidence_files` store 추가(추가형) |
| note_type | `feature_release`, `security_review`, `data_contract` |
| 제목 | Cloudinary unsigned 증빙 업로드와 파일 메타 장부·Supabase 연결 |
| 사용자 변화 | 증빙 화면에서 거래별 `파일 첨부`로 이미지·PDF 업로드, 썸네일·원본 링크 표시, 미첨부 배지. 설정에 Cloudinary cloud name·unsigned preset 입력 폼 |
| 보안(하드룰) | 업로드는 브라우저에서 제한된 **unsigned upload preset**으로만(`https://api.cloudinary.com/v1_1/{cloud}/{image\|auto}/upload` + `upload_preset`). API secret·서명은 사용/저장하지 않으며 `isSecretKey`로 preset·cloud 입력을 차단. 감사로그는 secure_url 대신 `cloudinary_public_id`만 보관 |
| 데이터 계약 | `evidence_files`(24열)를 `SYNC_TABLE_ORDER`(source_transactions 뒤)와 IDB store에 편입. IDB `version` 1→2, `onupgradeneeded`는 누락 store만 생성해 기존 데이터 보존. business_id·source_transaction_id 인덱스 추가. 백업/복원은 `LOCAL_STORES` 기반이라 자동 포함 |
| 흐름 | `CloudinaryAdapter.upload` → `AppService.attachEvidence`가 `evidence_files` 로컬 저장 + `source_transactions` attached + 감사 + 동기화 큐. 첨부는 오프라인 가능, 로그인 시 동기화 |
| 검증 | 로직 15/15(썸네일 URL 변환·image만 변환·null 안전, isConfigured, 업로드 URL·resource_type image/auto, upload_preset 전송, secret 차단, 메타 구성·tx attached·감사 public_id). owner `evidence_files` insert/read DB 검증(business-scoped RLS, 롤백, 잔존 0). 하네스 Required 0, 스크립트 파싱 OK |
| 스킬 버전 | `Sub_evidence-archive_0.01`, `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.20` |

남은 위험/미완:

1. **실제 파일 업로드 왕복은 MANUAL**이다. 사용자의 Cloudinary cloud name·제한 unsigned preset과 브라우저가 있어야 하며, 이 환경에서는 E2E 업로드를 검증할 수 없다(로직·요청 구성·RLS만 검증). `docs/accounting-ledger-browser-checklist.md`로 확인.
2. 증빙 삭제·교체 UI 없음. Cloudinary 원본 삭제는 서명 API(secret) 필요라 브라우저 직접 불가 → 후속 Edge Function 후보. 현재는 첨부·조회만.
3. `evidence_documents` 그룹핑, 파일 해시(`file_hash`), 미리보기 상태 고도화는 후속.
4. unsigned preset은 공개 업로드라 남용 방지를 위해 Cloudinary에서 허용 형식·폴더·최대 크기·모더레이션을 제한하도록 안내한다.

## 2026-07-11 앱 0.10 동기화 무손실 하드닝 (다른 앱 교훈 6건 반영)

| 항목 | 내용 |
|---|---|
| app_version | `0.10` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `bugfix`, `architecture`, `product_direction` |
| 제목 | 다른 앱에서 얻은 교훈 6건을 우리 앱에 대조·반영 |
| 교훈 대조 | ① SSOT 자동생성 ② 도메인×생명주기 매트릭스 ③ 다기기 동기화(LWW·tombstone·빈클라우드 가드) ④ 저장·복원 무손실 ⑤ 백업·복원 대칭 봉합점 ⑥ North Star. ②③④⑤가 0.06~0.09에서 만든 동기화·백업·증빙 계층을 직접 겨냥 |
| 크리티컬 버그 수정 | ③ 빈 클라우드 가드. `syncNow`의 canonical replace가 `pullTable`이 `[]`(RLS/인증 오류)를 주면 로컬 전체를 wipe하던 위험을 발견. 클라우드 businesses 0 + 로컬 활성 business 존재 → `EMPTY_CLOUD_GUARD`로 중단. 일반 merge 경로는 로컬 Map 유지로 이미 안전 |
| 매트릭스 게이트 | ①② `docs/accounting-ledger-data-lifecycle-matrix.md` 신설(11 동기화 도메인 + infra × 로컬저장·로드·백업·복원·push·merge·최종본·삭제tombstone). 하네스 `data-lifecycle-matrix` Required 게이트가 SYNC_TABLE_ORDER 도메인이 매트릭스에 없으면 실패 → 새 동기화 테이블 추가 시 생명주기 검토 강제 |
| North Star | ⑥ 설계지침 §0에 비타협 원칙(사실 정확성·데이터 무결성·정직한 완료·보안·권한)을 "목적의 일부"로 명문화. 모든 규칙·게이트가 이를 섬기는 수단임을 선언 |
| 가시화된 gap | evidence_files 삭제→tombstone 미배선(중간), counterparties 삭제 없음(낮음), import 미리보기 부재(중간), 새 sync 테이블 추가 시 SYNC_TABLE_ORDER·IDB·reload 손편집 중복(SSOT 자동생성 후속) |
| 검증 | 빈 클라우드 가드 로직 5/5(RLS 실패→중단·로컬 보존, 정상 canonical→replace, 신규 기기→adopt, soft-deleted만→미차단). 하네스 8게이트 Required 0, 신규 매트릭스 게이트 통과(11/11), 스크립트 파싱 OK |
| 스킬 버전 | `Sub_code-architecture-guardians_0.03`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.21` |

남은 위험/미완:

1. SSOT 완전 자동생성(writer 스크립트로 `SYNC_TABLE_ORDER`→IDB·reload 파생)은 미구현. 현재는 매트릭스 게이트가 문서 누락만 강제한다.
2. evidence_files·counterparties 삭제 흐름, import 미리보기(백업 5봉합점 대칭)는 매트릭스에 gap으로 기록, 후속 구현.
3. 빈 클라우드 가드의 실브라우저 재현(권한 오류 시 wipe 안 됨)은 수동 확인 대상.

## 2026-07-11 앱 0.11 국세청 업종코드 검색·선택 자동화

| 항목 | 내용 |
|---|---|
| app_version | `0.11` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `tax_data`, `product_direction` |
| 제목 | 블라인드 6자리 입력 → 업종명·코드 검색 선택 |
| 출처(근거) | 국세청 「업종코드-11차 표준산업분류 연계표」(2023년 귀속), teht.hometax.go.kr 게시 xlsx. 경비율 근거: law.go.kr admRulSeq=2100000276582(귀속 경비율 고시). 사용자가 직접 제공 |
| 구현 | 사용자 제공 Excel을 `scripts/build-industry-codes.py`로 파싱(zipfile+xml, 라이브러리 무의존)해 코드·세세분류명(+세부설명)·대분류를 추출. 대분류를 인덱스화한 `NTS_INDUSTRY_CODES`(1,784행, 88KB) 파생 상수를 index.html에 임베드. `IndustryCodes.search/find`로 키워드·코드 검색. 설정 업종코드 필드를 검색 입력+결과 클릭→코드·업종명 자동 채움으로 교체 |
| 정확성(North Star) | 내가 코드를 지어내면 틀린 신고가 되므로, 사용자 공식 자료만 출처와 함께 탑재. 선택값은 확정이 아니라 **후보**로 표시하고 홈택스 공식 조회·경비율 고시 링크로 검증하도록 안내. 수동 코드 입력 fallback 유지 |
| SSOT(하드룰) | 원본 xlsx는 참고자료라 Git 미커밋. 재생성 writer 스크립트만 커밋(Excel=출처, 스크립트=writer, 임베드 상수=파생물). 연도 갱신 시 `python3 scripts/build-industry-codes.py <xlsx> --inject`로 재생성 |
| 검증 | 검색 로직 자동 테스트 7/7: 행수 1784, taxYear 2023, 컨설팅→741400 경영 컨설팅업, 의원→851201 일반의원, 숫자 741→코드 매칭, 빈/무매칭→[]. 하네스 8게이트 Required 0(대용량 상수에도 tracked-secrets·whitespace 통과), 스크립트 파싱 OK |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.22` |

남은 위험/미완:

1. 실제 브라우저에서 검색→선택→코드 채움→저장 왕복은 수동 확인 대상(`docs/accounting-ledger-browser-checklist.md`).
2. 임베드 88KB로 index.html이 커졌다(gzip 완화, 오프라인 완전 동작). 추후 대량화 시 IndexedDB 참조 스토어/Supabase 참조 데이터로 이전 여지.
3. 연계표는 2023 귀속 스냅샷이다. 귀속연도 변경 시 최신 파일로 재생성해야 하며, 선택값의 requires_review·공식 확인 안내로 오적용을 막는다.
4. 업종코드 선택을 단순/기준경비율·간편장부/복식부기 의무 판정과 연결하는 것은 후속(경비율 데이터·법정 근거 필요).

## 2026-07-11 앱 0.12 증빙 제거 (생명주기 매트릭스 gap 해소)

| 항목 | 내용 |
|---|---|
| app_version | `0.12` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `data_contract` |
| 제목 | 첨부 증빙 제거를 형제 도메인과 대칭으로 배선 |
| 배경 | 0.10 생명주기 매트릭스가 `evidence_files`의 삭제→tombstone 미배선(첨부만 되고 제거 없음)을 gap으로 지목. 형제 `source_transactions`는 `deleteTransaction`으로 완비 |
| 구현 | `AppService.removeEvidence`: evidence_files를 `deleted_at`+`delete_status='unlinked'` 소프트삭제, `tombstones`·`audit_logs`·`sync_queue` 반영. 그 거래에 다른 활성 증빙이 없으면 `source_transactions.evidence_status='not_attached'`로 되돌림. 증빙 화면 파일별 제거 버튼(x) 추가 |
| 다기기 | evidence_files가 `SYNC_TABLE_ORDER`에 있어 `convergeTombstones`가 tombstone을 다른 기기의 로컬 evidence_files에 소프트삭제로 적용 → 제거가 수렴 |
| Cloudinary 원본 | 서명 API(secret) 필요라 브라우저에서 원본 삭제 불가. 링크만 제거하고 `delete_status='unlinked'`로 표시, 서버측(Edge Function) 정리는 후속 |
| 검증 | 제거 로직 자동 테스트 7/7(소프트삭제+unlinked, evidence tombstone, 잔여 없으면 거래 미첨부 복귀·detached=1, 잔여 있으면 거래 미변경·detached=0, 미발견→EVIDENCE_NOT_FOUND). RLS는 기존 business-scoped update/tombstone insert(앞서 검증) 재사용. 하네스 8게이트 Required 0 |
| 스킬 버전 | `Sub_evidence-archive_0.01`, `Sub_code-architecture-guardians_0.03`, `Sub_app-research-notes_0.23` |

남은 매트릭스 gap: counterparties 삭제(낮음), import 미리보기(중간, #5에서 대칭 배선 예정). Cloudinary 원본 서버측 삭제(후속).

## 2026-07-11 앱 0.13 인적용역 지원 + 로직 회귀 게이트 + AI 개발 규율

| 항목 | 내용 |
|---|---|
| app_version | `0.13` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `test_gate`, `governance` |
| 제목 | 다른 앱 프롬프트 교훈 18건 반영 + 인적용역(사업자등록번호 없음) 지원 |
| 인적용역 | 업종코드 94로 시작(114개, 예: 940600 자문·감독·지도료·고문료·교정료, 작가·화가·배우·모델·가수 등)은 3.3% 원천징수 인적용역으로 사업자등록번호가 없을 수 있다. 등록번호 필드를 `(선택)`으로 표시, placeholder·help로 "없으면 비워두세요" 안내. 업종 선택 시 94코드면 `industryPickedHtml`이 인적용역 힌트 표시. 데이터층은 기존에도 `registration_number` 선택(입력 시에만 10자리 검증) |
| 교훈 반영 | 18건 중 정독·SSOT·정직완료·프로덕션 read-back 증거·최소변경·게이트우선·결함→클래스·단일파일 봉합점·근본원인 실측은 이미 지켜온 규율 → CLAUDE.md `AI 개발 규율`에 포인터로 흡수(중복 정의 없이 강조). 얇은 어댑터·DoD·모델 이식성은 CLAUDE.md 재작성(이전)에서 반영됨 |
| 진짜 gap 수정 | 그동안 "N/N 통과"로 보고한 로직 테스트가 전부 scratchpad(비커밋·비게이트)라 회귀를 못 막았다(특성화 테스트·게이트 우선 교훈이 겨냥한 지점). `scripts/tests/logic.test.mjs` 커밋 + 하네스 `logic-tests` Required 게이트 등록 |
| 테스트 설계 | Part A: 실제 index.html의 앱 IIFE를 VM(DOM/IDB/crypto stub)에 로드해 `window.__ACCOUNTING_APP_TEST__` 노출 순수 함수를 **실코드** 검증 — AccountingDomain.calculateAmounts·validateJournal·buildPosting(복식부기 차대변 균형=North Star 불변조건)·Utils.latestByUpdatedAt·isSecretKey·IndustryCodes.search/find. Part B: 동기화/삭제 알고리즘(convergeTombstones·빈클라우드 가드·removeEvidence 분리) 특성화 replica. 총 18 assertion. `IndustryCodes`를 테스트 훅에 추가 노출 |
| 게이트 검증 | 현재 상태 PASS(18), 고의 파손 시 FAIL(실패 assertion 표시)·복원 시 PASS 양방향 확인(거짓 green 방지) |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_harness-quality-gate_0.06`, `Sub_development-governance_0.06`, `Sub_app-research-notes_0.24` |

남은 위험/미완:

1. Part B 특성화는 서비스 메서드의 replica다(실코드는 DOM/IDB 의존). 실코드와 함께 갱신해야 하며, 주석으로 명시. 향후 서비스 로직을 순수 코어로 더 분리하면 실코드 검증 범위를 넓힐 수 있다.
2. 실브라우저에서 인적용역 안내·업종 선택 힌트·등록번호 미입력 저장 왕복은 수동 확인 대상.
3. 다음 구조 후속: 개념 정의 원장(집행 앵커)+앵커 존재 게이트, 반응형 오버플로 헤드리스 게이트(chromium 사용 가능).

## 2026-07-11 앱 0.14 입력 자동화 ①그룹(휴먼에러 방지)과 자동화 로드맵

| 항목 | 내용 |
|---|---|
| app_version | `0.14` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `product_direction` |
| 제목 | 입력 칸 법적 필요성 재검토 + 자동화 3그룹 분류, ①그룹 구현 |
| 배경 | 사용자 요청: "입력 칸 전체 법적 필요여부 재검토 + 휴먼에러 방지 자동화, 필요한 것 알려줘". 사업자 기본정보·거래입력 폼을 전수 검토 |
| ①그룹 구현(자료 0) | `AccountingDomain.isValidBusinessNumber` 체크섬(가중치 1,3,7,1,3,7,1,3,5, 9번째×5//10 보정)으로 사업자번호 오타 차단(입력 시에만; 인적용역 등 미입력 통과). 대표자명 미입력 시 Google `user_metadata.name/full_name` 자동 채움. 업종코드 선택 시 대분류(94→프리랜서, 그 외 `BROAD_INDUSTRY_BY_MAJOR`)로 큰 업종 자동 설정 |
| ②그룹(자료 필요) | 세무 정확성 직결이라 사용자 공식 자료만 후보(requires_review)+출처로 탑재: 경비율 데이터(단순/기준경비율 by 업종코드·귀속연도), 부가세 면세업종 코드 목록, 기장의무 수입금액 기준표, 간편장부 계정과목 코드표(작성사례 PDF에서 3자리 코드 112·115·120·121·123·125 확인, 인적용역 940903·원천징수 3.3% 사례) |
| ③그룹(API 키) | juso.go.kr 주소 자동완성(브라우저 모드), 공공데이터포털 사업자등록 상태조회(정부 API CORS로 Supabase Edge Function 프록시 필요 가능, 키는 서버 보관 권장) |
| 검증 | 로직 테스트 +3(체크섬 실코드: 2208162517 유효, 2208162518 무효, 5자리 무효), 총 21 assertion 하네스 게이트 통과. 나머지(대표자명 프리필·큰업종 자동)는 실브라우저 확인 대상 |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_business-classification`(도메인 스킬), `Sub_harness-quality-gate_0.06`, `Sub_app-research-notes_0.25` |

남은 위험/미완:

1. 대표자명 Google 자동채움·큰업종 자동설정·인적용역 힌트는 실브라우저 수동 확인 대상(`docs/accounting-ledger-browser-checklist.md`).
2. ②그룹은 사용자 자료 대기. ③그룹은 키 발급 + CORS 확인 필요.
3. 큰업종 매핑(`BROAD_INDUSTRY_BY_MAJOR`)은 23개 대분류 중 주요만 명시 매핑, 나머지는 기타 서비스로 fallback(휴리스틱, 사용자 수정 가능).

## 2026-07-11 앱 0.15 경비율 자동 표시 (②그룹 #1)

| 항목 | 내용 |
|---|---|
| app_version | `0.15` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `tax_data` |
| 제목 | 업종코드 선택 시 국세청 단순·기준경비율 자동 표시 |
| 출처 | 사용자 제공 「국세청 2025년 귀속 단순·기준경비율」 xlsx(1,542개). 근거: law.go.kr admRulSeq=2100000276582(귀속 경비율 고시). 컬럼: 귀속연도·업종코드·업태명·중분류·세분류·세세분류·적용기준내용·단순(일반/초과)·기준(일반) |
| 구현 | `scripts/build-expense-rates.py`(stdlib zip+xml)로 code→[단순일반,단순초과,기준일반] 추출, `NTS_EXPENSE_RATES`(38KB) 파생 상수 임베드. `ExpenseRates.find(code)` 조회. `industryPickedHtml`이 선택 코드의 경비율을 후보로 표시(귀속연도·출처 태그, 초과율 있으면 함께) |
| 정확성(North Star) | 확정 아님. 실제 적용 경비율은 수입 규모(초과율 임계)에 따라 달라 **값만 표시하고 자동 계산은 하지 않음**. 추계소득 계산은 초과율 적용 수입금액 임계표를 받은 뒤 후보로 구현 예정. 원본 xlsx 미커밋(참고자료 하드룰), writer 스크립트만 커밋 |
| 검증 | 실코드 테스트 +3(741400 단순 77.3/기준 23.1, 851201 일반의원 70.5/27.9는 데이터로 확인, 940903 초과율 46.4, 미존재→null, taxYear 2025), 총 24 assertion 게이트 통과. 하네스 Required 0(대용량 상수에도 tracked-secrets·whitespace 통과) |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_legal-forms_0.02`, `Sub_app-research-notes_0.26` |

남은 위험/미완:

1. 초과율 적용 임계(수입금액 기준)가 없어 추계소득 자동계산은 미구현. 임계표 수령 후 후보로 구현.
2. 실브라우저에서 경비율 표시 왕복은 수동 확인 대상.
3. 연계표(0.11)는 2023 귀속, 경비율은 2025 귀속 — 귀속연도 불일치 가능. 코드 체계는 대체로 안정이나, 신고 연도에 맞춰 갱신 필요(둘 다 writer 스크립트로 재생성).

## 2026-07-11 앱 0.16 기장의무·부가세 면세 근거 자동 표시 (②그룹 #2·#3)

| 항목 | 내용 |
|---|---|
| app_version | `0.16` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `tax_data`, `legal_basis` |
| 제목 | 업종코드 선택 시 기장의무 기준금액과 부가세 면세 가능성을 법령 근거로 후보 표시 |
| 출처(SSOT) | 법령 MCP 원문 조회. 기장의무=**소득세법 시행령 제208조 제5항 제2호**(가목 3억·나목 1.5억·다목 7,500만원, 미달=간편장부대상자·이상=복식부기의무자, 신규개시자=간편장부대상자). 면세=**부가가치세법 제26조 제1항**(20개 호). 사용자 엑셀 불요 — 법령이 SSOT라 MCP로 직접 조회 |
| 구현 | `BookkeepingDuty`: NTS 대분류 23개 index를 가/나/다 그룹 배열에 매핑(`GROUP_BY_MAJOR`), `thresholdOf(code)`/`assess(code, 직전수입, 신규여부)`. `VatExemption`: 대분류(보건16→§5, 교육15→§6, 금융10→§11)와 94접두(인적용역→§15)를 면세 후보 호+예외 caveat에 매핑. `industryPickedHtml`이 경비율에 이어 두 줄(기장의무 기준·면세 가능성)을 근거 조문과 함께 표시 |
| 정확성(North Star) | 면세는 공급 재화·용역의 **성질**로 판단하므로 업종코드만으로 확정 불가 → "면세 가능성·개별 판단" 및 예외(미용 의료·무도학원 등 과세) 명시. 기장의무도 겸업·업종 세부(부동산매매 vs 임대)에 따라 달라져 "후보" 태그. 확정 신고값으로 표시하지 않음(하드룰) |
| 검증 | 실코드 테스트 +10(기장의무: 851201 의료→7,500만·501101 도소매→3억·151101 제조→1.5억, 수입≥/<기준 판정, 신규개시자, 미존재 code→null; 면세: 851201→§5·940600→§15·741400 컨설팅→null). 총 34 assertion 게이트 통과. 하네스 Required 0 |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_legal-forms_0.02`, `Sub_app-research-notes_0.27` |

남은 위험/미완:

1. NTS 대분류→가/나/다 매핑은 대분류 단위 근사. 부동산업(임대 다목 vs 매매 가목), 상품중개업(도소매 대분류지만 나목) 등 세분류 경계는 개별 확인 필요 — 현재 "후보" 표기로 위험 고지.
2. 면세 후보는 업종 연결이 뚜렷한 호(의료·교육·금융·인적용역)만 매핑. 미가공식료품(§1)·도서/신문(§8)·주택임대(§12) 등은 공급 단위 판단이라 미매핑(과세로 오인 방지 위해 향후 안내 문구 보강 검토).
3. 실브라우저에서 두 줄 표시 왕복은 수동 확인 대상.

## 2026-07-11 앱 0.17 간편장부 계정과목 분류표 임베드 (②그룹 #4)

| 항목 | 내용 |
|---|---|
| app_version | `0.17` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `tax_data` |
| 제목 | 국세청 간편장부 계정과목 분류표를 임베드하고 가져오기 화면에 표시 |
| 출처(SSOT) | 사용자 제공 「인적용역_학원강사.pdf」 p.6 [참고] 계정과목 분류표(국세청 간편장부 작성요령). 분류·계정과목·설명 3열. **숫자 코드 없음** — 이 참고표는 명칭 기준 |
| 구현 | `SimpleBookAccounts` 서비스: 4개 그룹(수입 2·비용 16·제조비용 3·자산 4=25개) × {name, desc, group, column}. 간편장부 열 매핑(수입→수입금액, 비용·제조비용→비용, 자산→자산). `all()`/`find(name)`/`columnOf(name)`. `renderImports`(가져오기)에 그룹별 분류표 렌더(`simpleBookAccountsHtml`, `.coa-*` CSS) |
| 아키텍처 | 복식부기 내부 원장 COA(101/103/401/811…, state.accounts)와 **별개 계층**. 이 서비스는 CLAUDE.md의 "간편장부=입력 UX·출력 view" 계층 SSOT로, 특히 #5 Excel import의 계정과목→열 매핑에 재사용 예정 |
| 정확성(North Star) | 참고표 원문 그대로(설명 축약만, 금액·기준 무변경). 숫자 코드는 원자료에 없어 만들지 않음(추측 금지) — 코드가 필요하면 코드 표기 서식 수령 후 확장 |
| 검증 | 실코드 테스트 +6(계정 수 25, 매출→수입금액, 소모품비/제조 경비→비용, 비품→자산, 미존재→null), 총 40 assertion 게이트 통과. 하네스 Required 0. 이미지 원본 미커밋(참고자료 하드룰) |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_legal-forms_0.02`, `Sub_app-research-notes_0.28` |

남은 위험/미완:

1. 참고표에 숫자 계정과목 코드가 없어 코드 기반 매핑은 미구현. 간편장부 서식의 코드가 필요하면 코드 표기 자료를 받아 `SimpleBookAccounts`에 code 필드 추가.
2. #5 Excel import는 이 분류표를 매핑 기준으로 사용할 예정(파서는 0.15 실증 완료). import 확정→원장 전기 흐름은 다음 단계.
3. 실브라우저에서 가져오기 분류표 표시·overflow는 수동 확인 대상.

## 2026-07-11 앱 0.18 기준경비율 추계소득 계산 엔진·안내 (②그룹 #5)

| 항목 | 내용 |
|---|---|
| app_version | `0.18` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `tax_data`, `domain_engine` |
| 제목 | 국세청 추계신고(기준경비율) 작성사례 계산식을 검증 엔진으로 구현하고 리포트에 안내 |
| 출처(SSOT) | 사용자 제공 「추계신고_기준경비율 신고서 작성사례(복식부기의무자 한식점)」 PDF. 사례: 홍길동 길동식당, 업종코드 552101, 총수입 120,000천원(94,100 매출+25,000 영업손실보상금+900 신용카드발행공제), 주요경비 92,960천원(매입 53,960+임차 16,000+인건 23,000), 기준경비율 9.7%·단순경비율 89.7% |
| 계산식(정밀분석) | 소득금액 = min(①,②). ① 기준소득금액 = 수입 − 주요경비 − (수입 × 기준경비율 × **복식부기 ½**). ② 비교소득금액 = 수입 × (1 − 단순경비율) × **복식부기 3.4배 / 간편장부 2.8배**. 사례 검증: ①=120,000,000−92,960,000−(120,000,000×9.7%×½)=21,220,000, ②=[120,000,000×(1−89.7%)]×3.4=42,024,000, min=21,220,000, 필요경비=98,780,000(서식 ⑩과 일치) |
| 구현 | `EstimatedIncome.byStandardRate({revenue, mainCosts, stdRate, simpleRate, isDoubleEntry})` → {primary, comparison, income, necessaryExpense}. 리포트 화면(`renderReports`)에 계산식·정규증빙 요건·복식부기의무자 추계 가산세 경고를 **검토용** 카드로 안내. 확정 계산 UI/입력폼은 미구현(다음 단계) |
| 교차검증 | 앱 0.15 경비율 데이터의 552101 = [단순 89.7, 기준 9.7]이 작성사례와 **정확 일치** → 0.15 데이터 정확성 독립 확인. 작성사례의 기장의무 판정("음식점 직전 1.5억 이상 → 복식부기의무자")도 0.16 `BookkeepingDuty` 나목(1.5억)과 일치 |
| 부수 확인(미구현, 향후) | 무신고가산세 max(수입×0.07%, 무신고납부세액×20%)·장부 기록/보관 불성실 가산세(산출세액×무기장비율×20%) 중 큰 금액. 단순경비율 배제(기준경비율) 직전 수입 기준: 가목 6,000만·나목 3,600만·다목 2,400만(사례에서 나목 3,600만 확인). 증빙불비 2% 가산세(직전 수입 4,800만 이상). 총수입금액 산입: 영업손실보상금·신용카드발행세액공제 |
| 검증 | 실코드 테스트 +4(작성사례 수치로 primary·comparison·income·필요경비 고정, 간편장부 2.8배 분기), 총 44 assertion 게이트 통과. 하네스 Required 0. PDF 원본 미커밋(참고자료 하드룰) |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_legal-forms_0.02`, `Sub_app-research-notes_0.29` |

남은 위험/미완:

1. 계산 엔진은 순수 함수만 구현. 실제 소득 자동계산 UI(주요경비 입력·복식부기 여부·경비율 연동)는 미구현 — 검토용 안내 카드만 노출(오도 방지).
2. 단순경비율 일반율↔초과율 전환(당해 수입 임계)과 단순경비율 배제 전 업종 기준표는 자료 수령 후 후보로 구현 예정.
3. 가산세·총수입 산입 항목은 분석만 기록, 엔진 미포함.
4. 실브라우저에서 리포트 카드 표시는 수동 확인 대상.

## 2026-07-11 앱 0.19 기준경비율 추계소득 계산기 UI (②그룹 #5 완성)

| 항목 | 내용 |
|---|---|
| app_version | `0.19` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `ui` |
| 제목 | 0.18 `EstimatedIncome` 엔진 위에 리포트 화면 추계소득 계산기 추가 |
| 구현 | `estimatorPanelHtml(summary)`: 입력(총수입=수입 집계 프리필, 매입·임차·인건비, 기장의무 select, 기준·단순경비율=활성 사업자 업종코드에서 자동 채움·수정 가능) + 출력(주요경비, ①기준소득, ②비교소득, 소득금액 min, 필요경비). `bindViewEvents`에서 input/change → `EstimatedIncome.byStandardRate()` 실시간 호출(재렌더 없이 textContent 갱신, 거래폼 preview 패턴과 대칭). `.estimator*` 반응형 CSS(auto-fit grid, `--brand` 강조) |
| 검증(정직) | **헤드리스 Chromium 왕복 검증**(playwright-core, executablePath=/opt/pw-browsers/chromium-1194): 리포트로 이동 → 작성사례 값 입력 → 출력 확인. 복식부기: 주요경비 92,960,000·①21,220,000·②42,024,000·소득 21,220,000·필요경비 98,780,000(작성사례·서식 ⑩과 일치). 간편장부: ②34,608,000·소득 15,400,000. 앱 JS 콘솔 에러 0(외부 CDN lucide/supabase 차단은 오프라인 샌드박스 특성). 순수 로직 불변으로 logic-tests 44 유지. 하네스 Required 0 |
| 정확성(North Star) | 확정 신고값 아님(`검토용` 배지). 경비율은 후보(0.15)이고 사용자가 수정 가능. 복식부기의무자 추계 가산세 경고 유지 |
| 스킬 버전 | `Sub_income-tax-reporting_0.03`, `Sub_tax-vat-classification_0.04`, `Sub_app-research-notes_0.30` |

남은 위험/미완:

1. 계산기는 검토용. 기장의무 select 기본값은 복식부기의무자(보수적)이며 직전연도 수입 기반 자동 판정은 미연동(직전 수입 미저장). 향후 직전연도 수입 입력 시 `BookkeepingDuty.assess`로 자동 선택 가능.
2. 주요경비는 매입+임차+인건 단순 합. 정규증빙 검증·항목별 한도는 미반영(안내 문구로만 고지).
3. 단순경비율 초과율/배제 임계표는 여전히 자료 대기(0.18 노트 참조).
4. 브라우저 검증은 계산 경로 한정. 시각·레이아웃(모바일 overflow 등)은 수동 확인 대상.

## 2026-07-11 앱 0.20 계산기 자동판정 + 법령 가이드 버튼

| 항목 | 내용 |
|---|---|
| app_version | `0.20` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `ui`, `legal_basis` |
| 제목 | 추계 계산기 직전수입 자동판정 + 가이드 법령 안내(기장의무·면세·추계 경비율) |
| 근거 확인(법령 MCP 원문 대조) | 소득세법 제160조(장부 비치·기록: 복식부기 원칙·간편장부 특례·정의), 소득세법 시행령 제208조 제5항 제2호(기장의무 기준 3억/1.5억/7,500만), 부가가치세법 제26조 제1항(면세 20개 호 전문), 소득세법 시행령 제143조 제3항(추계 계산법)·제4항 제2호(단순/기준 구분 6,000만/3,600만/2,400만). 143④2호 나목은 인적용역(부가세 시행령 §42①1호)을 포함 → 94xxx는 나목(3,600만)으로 §208⑤(다목)과 경계 상이함을 확인 |
| 구현 ① 계산기 | 신규 `ExpenseRateMethod`(단순/기준 판정, §143④2호, 94xxx 특례). `estimatorPanelHtml`에 `직전연도 수입금액` 입력 추가. `bindViewEvents` estRecalc가 `BookkeepingDuty.assess`·`ExpenseRateMethod.method`로 `estDutyAuto`/`estMethodAuto` 태그 갱신, 직전수입 입력 시 estDuty select 자동 선택(사용자 수동 변경은 보존). `.est-judgement`·`.est-tag` CSS |
| 구현 ② 가이드 | `renderGuide`를 `GUIDE_TOPICS` 레지스트리 + `guideTopicButtons()`로 리팩터, google-cloud 상세는 `googleCloudGuideHtml()`로 분리(동작 동일). `legalGuideHtml(topic)`로 기장의무·부가세 면세·추계 경비율 3개 안내(쉬운 설명 + 기준금액 + `근거` 조문 블록 + 앱 화면 링크). `.legal-basis` CSS |
| 검증(정직) | 헤드리스 Chromium: 가이드 4개 토픽 버튼 + 각 법령 근거 블록 렌더 확인(§160·§208⑤·§80③·§143·§26①), 계산기 자동판정 서비스(851201 3천만↑→기준·복식, 2천만→단순·간편) 및 소득 21,220,000 재확인, 앱 JS 콘솔 에러 0. 로직 테스트 +6(ExpenseRateMethod 임계·판정, 총 50). 하네스 Required 0 |
| 정확성(North Star) | 가이드는 이해용 안내(확정 신고 판단 아님). 면세는 20개 호·개별 판단 명시. 계산기 자동판정은 업종코드 설정 시에만 동작(미설정 시 수동) |
| 스킬 버전 | `Sub_income-tax-reporting_0.04`, `Sub_tax-vat-classification_0.04`, `Sub_legal-forms_0.02`, `Sub_app-research-notes_0.31` |

남은 위험/미완:

1. 계산기 자동판정 태그(estDutyAuto/estMethodAuto)의 실제 DOM 표시는 활성 사업자 업종코드가 있어야 하며, file:// 검증에서는 서비스 로직으로만 확인. 로그인·사업자 설정 상태의 실제 표시는 수동 확인 대상.
2. ExpenseRateMethod의 대분류→그룹 매핑은 §208⑤과 마찬가지로 대분류 근사(부동산매매/임대, 상품중개 등 세분류 경계는 개별 확인). 94xxx 인적용역만 특례 처리.
3. 가이드 면세 목록은 대표 호만 노출(전체 20개 호는 조문 참조 안내). 시행령 위임 세부는 미표시.
4. 가산세 자동계산은 여전히 미구현(경고 안내만).

## 2026-07-11 앱 0.21 법령 가이드 눈높이 설명 + 법령 기준 SSOT 스킬 신설

| 항목 | 내용 |
|---|---|
| app_version | `0.21` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `ui`, `skill_doc` |
| 제목 | 가이드 법령 설명에 목적·취지(눈높이) 추가 + 법령 기준 SSOT 문서 신설 |
| 배경(사용자 요청) | 각 법령 설명 밑에 목적·취지를 중학생 눈높이로 추가 제안 + 그동안의 교훈으로 스킬 갱신 + 법적 기준을 정리한 별도 스킬 법령문서 신설 제안 |
| 구현 ① 눈높이 | 가이드 3개 법령 토픽에 `.guide-why` 블록("왜 이렇게 정했을까요?") 추가. 기장의무=규모에 맞게·정확하게, 면세=필수·공익 보호(부가세 역진성), 추계=장부 없는 사업자 배려·원칙은 장부(가산세로 유도). `.guide-why` CSS(warm 콜아웃) |
| 구현 ② 스킬 SSOT | 새 문서 `docs/skills/accounting-legal-basis-reference-skill.md`(`Sub_legal-basis-reference_0.01`): 기장의무(§160·§208⑤2호)·단순/기준경비율 적용(§143④2호)·추계 계산(§143③, 작성사례 552101 검증표)·부가세 면세(§26① 20개 호)·경비율 고시·업종코드·간편장부 계정과목을 조문·값·출처·목적(취지)·앱 서비스 매핑으로 정리. 법령 MST(소득세법 280405·시행령 286211·부가세법 276117)와 대조일 기록. 유지 규율(법령 SSOT·작성사례 고정·교차검증·헤드리스 검증·후보 표기·눈높이 동반) 포함 |
| 구현 ③ 연결 | `Sub_income-tax-reporting_0.04`·`Sub_tax-vat-classification_0.05`가 새 SSOT를 가리키도록 상단 포인터 추가(숫자 중복 정의 금지). CLAUDE.md "먼저 적용할 도메인·코드 스킬"에 SSOT 포인터 1줄 추가 |
| 검증 | 헤드리스 Chromium으로 3개 토픽 `.guide-why` 렌더 확인, 앱 JS 콘솔 에러 0. 하네스 Required 0, 로직 테스트 50 유지(순수 로직 불변). 새 스킬 문서는 하네스 required-files 밖이라 게이트 영향 없음 |
| 정확성(North Star) | 눈높이 설명은 이해용(확정 신고 판단 아님). SSOT는 값·조문의 단일 출처로 향후 연도 갱신·재검증 지점을 하나로 모음 |
| 스킬 버전 | `Sub_legal-basis-reference_0.01`(신규), `Sub_income-tax-reporting_0.04`, `Sub_tax-vat-classification_0.05`, `Sub_app-research-notes_0.32` |

남은 위험/미완:

1. 법령 기준 SSOT는 아직 하네스 게이트로 강제되지 않음(문서 다짐). 값↔코드 상수 일치를 자동 검증하는 게이트는 후속 과제.
2. 눈높이 설명은 3개 법령 토픽에만. 다른 화면(입력·리포트) 용어 눈높이 보강은 후속.
3. 경비율/업종코드 귀속연도 불일치(2025 vs 2023)는 SSOT에 명시했으나 자동 경고는 미구현.

## 2026-07-11 앱 0.22 세법 용어사전 + 대시보드 검색

| 항목 | 내용 |
|---|---|
| app_version | `0.22` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `ui`, `glossary` |
| 제목 | 주요 세법 용어의 법적 정의 + 초등학생 눈높이 설명을 담은 용어사전과 대시보드 검색 |
| 배경(사용자 요청) | 가이드에 주요 용어 버튼을 만들어 세법 용어의 법적 정의를 기술하고, 대시보드에서 검색 가능하게 하며, 초등학생도 이해하기 쉬운 상세 설명을 추가하자는 제안 |
| 구현 | `TAX_TERMS`(28개, {term, cat, law, kid}) + `TermService`(all/find/search). 5개 분류: 장부·기장(8)·소득·세액(9)·경비율·추계(4)·부가가치세(3)·증빙·경비(4). 가이드 토픽 `tax-terms`(`termsGuideHtml`/`termCardHtml`, 분류별 그룹). 대시보드 `세법 용어 검색`(input→`TermService.search`→카드 실시간) + `전체 용어 보기`(`data-open-guide-topic`→가이드 이동 핸들러 신설). `.term-*` CSS |
| 근거 조문(법령 MCP 대조) | 각 용어 law에 근거 명시: 복식부기·간편장부·기장의무 §160, 기장의무 기준 §208⑤, 추계·경비율 §80③·§143, 부가세 면세 §26, 과세표준·종합소득금액 §14②, 총수입금액 §24, 필요경비 §27, 사업소득금액 §19②, 부가세 공급가액 §29·납부세액 §37. §14·§26·§160·§208·§143·§80은 이번·이전 세션에서 원문 대조 완료 |
| 검증(정직) | 헤드리스 Chromium: 대시보드 검색(필요경비→필요경비+소득금액, 법적 정의에 §27; 경비율→추계·단순·기준·주요경비·업종코드; 무매칭 안내), 전체 용어 보기→가이드 28개 카드·5개 그룹 이동 확인, 앱 JS 콘솔 에러 0. 로직 테스트 +6(개수 28·find·search·empty, 총 56). 하네스 Required 0 |
| 정확성(North Star) | 법적 정의는 근거 조문과 함께, 초딩 설명(kid)은 이해용으로 분리 표기. 확정 신고 판단 아님. 법적 정의 SSOT는 legal-basis-reference 스킬과 정합 |
| 스킬 버전 | `Sub_legal-basis-reference_0.01`, `Sub_app-research-notes_0.33` |

남은 위험/미완:

1. `TERM_HELP`(기존 툴팁 9개, 짧은 설명)와 `TAX_TERMS`(28개, 상세)가 일부 용어에서 병존. 툴팁은 짧게, 사전은 상세로 용도가 달라 유지하되, 향후 단일화 검토.
2. 용어 법적 정의는 서술형(조문 인용 아님). §24/§27/§19/§29/§37은 표준 조문번호로 서술했으며 원문 verbatim 대조는 §14·§26·§160·§208·§143·§80에 한정.
3. 대시보드 검색은 클라이언트 필터(부분일치)만. 동의어·오타 보정은 미구현.

## 2026-07-11 앱 0.23 용어 대장 강제 게이트 + 툴팁 단일화 + SSOT 정합

| 항목 | 내용 |
|---|---|
| app_version | `0.23` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `quality_gate`, `refactor` |
| 제목 | 용어·법적근거 등록을 하네스로 강제(컨센트 대장 개념), 세법 용어 툴팁 단일화, 기준값 SSOT 정합 게이트 |
| 배경(사용자 요청) | 기능·용어가 추가될 때마다 용어대장을 만들어 법적정보·용어추가를 자동 강제(컨센트 대장처럼), 그 뒤 툴팁 단일화+SSOT 게이트화(#3), 그리고 0.16~0.23 전체 배포 |
| 구현 ① 용어 대장 | `docs/accounting-ledger-term-ledger.md` 신설(28개 용어 + 분류 + 근거 요약). 하네스 게이트 `term-ledger-contract`(REQUIRED): index.html `TAX_TERMS` 파싱 → 각 용어 `law`·`kid` 비어있으면 FAIL, `TAX_TERMS` 용어집합 ↔ 대장 용어집합 **양방향 일치**(missing/orphan) 검사 |
| 구현 ② SSOT 정합 | `legal-ssot-contract`(REQUIRED): `BookkeepingDuty.THRESHOLDS`=[3억,1.5억,7,500만]·`ExpenseRateMethod.THRESHOLDS`=[6,000만,3,600만,2,400만]을 코드에서 파싱해 고정값과 대조(회귀 가드), legal-basis-reference 문서에 6개 금액 표기 존재 확인(코드↔문서 정합). 임계 변경 시 게이트가 막아 의식적 갱신 강제 |
| 구현 ③ 툴팁 단일화 | `TERM_HELP`에서 세법 용어(복식부기·차변·대변·공급가액·계정과목) 제거 → 앱 고유 용어(부가세·원천거래·전표·canonical_version)만 유지. `showTerm`이 `TermService.find(name)?.kid`(TAX_TERMS SSOT) 우선, 없으면 TERM_HELP 폴백. 세법 용어 정의 중복 제거 |
| 필수파일 | requiredFiles에 `docs/accounting-ledger-term-ledger.md`·`docs/skills/accounting-legal-basis-reference-skill.md` 추가(삭제 방지) |
| 검증(정직·양방향) | 게이트가 실제로 무는지 확인: (1) TAX_TERMS에 유령용어 추가→term-ledger FAIL(missing), (2) law 빈값→FAIL, (3) 임계값 변경→legal-ssot FAIL, 복구 시 전부 PASS. 툴팁 단일화는 헤드리스로 해석 경로 확인(복식부기·공급가액→TAX_TERMS, 부가세·원천거래→TERM_HELP 폴백), 앱 JS 에러 0. 하네스 11개 게이트 Required 0, 로직 테스트 56 유지 |
| 스킬 버전 | `Sub_legal-basis-reference_0.01`, `Sub_app-research-notes_0.34` |

남은 위험/미완:

1. `legal-ssot-contract`의 기대 임계값은 게이트 코드에 하드코딩 — 법 개정 시 게이트+문서+코드를 함께 고쳐야 통과(의도된 강제지만 3중 갱신 필요).
2. 용어 대장 게이트는 `TAX_TERMS` 정규 포맷(한 줄 객체)에 의존. 포맷이 바뀌면 파서 갱신 필요.
3. 툴팁 실제 DOM 노출은 사업자 설정 상태에서 term-button이 렌더되므로 수동 확인 대상(해석 로직은 검증).
4. "기능 추가 시 강제"는 용어·기준값 축에 한정. 임의 신규 기능 전반의 근거 강제는 범위 밖.

## 2026-07-11 전수감사 + 하네스 보강 (앱 버전 변경 없음)

| 항목 | 내용 |
|---|---|
| app_version | `0.23` (런타임 무변경 — 하네스·문서만 갱신) |
| note_type | `audit`, `quality_gate` |
| 제목 | 0.16~0.23 세션 결과물 전수감사 및 하네스 게이트 보강 |
| 감사 범위·결과 | (1) **세무 로직**: BookkeepingDuty·ExpenseRateMethod·EstimatedIncome·VatExemption을 VM에서 8개 대표 코드로 실행 — 501101 가목(3억/6천만)·151101 나목(1.5억/3.6천만)·741400 다목(7,500만/2.4천만)·851201 의료(면세 §5)·940600/940903 인적용역(기장 7,500만 다목 vs 경비율 3,600만 나목 특례)·221100 나목·미존재코드 null. EI 작성사례 21,220,000/98,780,000 재확인. 면세 오탐 없음(컨설팅·제조 null). **버그 0**. (2) **버전 정합**: index/handoff/checklist/term-ledger 모두 0.23, 최신 마커 1개, 버전 문자열 2회. (3) **보안**: 자격증명 값 0(매치는 Supabase grant DDL·탐지 정규식 자체), 참고자료 미추적, RLS·마이그레이션 0.15 이후 무변경. (4) **정합**: 필수파일 14개 존재, 로직 테스트 56개 전부 활성, guide 리팩터 topicOpen 잔재 0 |
| 하네스 보강 | `legal-ssot-contract`에 **추계 배율 잠금** 추가: `EstimatedIncome`의 `isDoubleEntry ? 0.5 : 1`(기준경비율 ½)와 `isDoubleEntry ? 3.4 : 2.8`(비교배율) 리터럴을 코드에서 확인하고, legal-basis 문서의 `3.4배`·`2.8배`·`½` 표기와 대조. 배율 변경 시 게이트가 막음(3.4→3.9 실험 시 FAIL, 복구 PASS로 양방향 검증) |
| 관찰(비버그) | `simple_book_rows` 테이블이 스키마·마이그레이션에 존재하나 index.html 런타임 참조 0 — 간편장부 import(#5)의 예정 대상(이번 세션 산출물 아님). `TERM_HELP`(툴팁)와 `TAX_TERMS`(사전)의 용도 분리 유지. `legal-ssot` 기대값은 게이트에 하드코딩(법 개정 시 3중 갱신 강제, 의도) |
| 스킬 버전 | `Sub_app-research-notes_0.35` |

## 2026-07-11 앱 0.24 간편장부 Excel 미리보기 (#5 파싱+미리보기, 실데이터 검증)

| 항목 | 내용 |
|---|---|
| app_version | `0.24` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `import` |
| 제목 | 국세청 간편장부(.xlsx)를 무 CDN 브라우저 파싱으로 미리보기 |
| 배경(사용자 자료) | 사용자가 실제 입력한 간편장부 샘플(`a4968fab-…2025…xlsx`, 172KB, 945행) 제공 → 실테스트 요청 |
| 실데이터 발견 | 시트 구성: 장부/통계/보조/계정과목/Sheet1. **날짜가 A=월·B=일로 분리**(빈 양식의 A=일자 단일 가정과 다름), M열 이후 사용자 보조열(공제여부·부가세검증·차이·조치필요)은 무시 대상. 계정과목은 전부 `SimpleBookAccounts` 분류표 명칭과 일치(기타(비용)·기업업무추진비·여비교통비·소모품비·매출 등) |
| 구현 | `XlsxReader`(ZIP EOCD→중앙디렉터리→로컬헤더 파싱 + `DecompressionStream('deflate-raw')`로 method 8 해제, TextDecoder). `SimpleBookImport`: 순수 헬퍼(`buildDate` 월/일→ISO·연도 없으면 폴백, `classify` 금액열→종류, `normalizeRow` 빈행 skip·`knownAccount` 표시) + async `parse`(sharedStrings·workbook·rels로 「장부」 시트 경로 해석 후 4행부터 A:L 추출, 연도는 제목 `(YYYY년)`에서). `renderImports`에 파일입력+`importSummaryHtml`+`importPreviewHtml`(상위 200건, 원본 보존, 전기 버튼 비활성). `.import-preview` sticky-header 스크롤표 |
| 검증(정직·실데이터) | 헤드리스 Chromium에서 실제 파일을 `setInputFiles`로 인앱 파서에 투입: **945건·2025년·수입 8/비용 937/자산 0·합계 수입 40,000,000·비용 38,625,037**(Python 프로토타입과 정확 일치), 첫 행 `2025-01-01 여비교통비 버스요금 경기버스 1,450 카드`. 앱 JS 에러 0. 순수 헬퍼 로직 테스트 +5(총 61). DecompressionStream은 Node VM에 없어 파싱은 헤드리스로만 검증(순수 헬퍼는 VM 테스트). 원본 xlsx 미커밋(참고자료 하드룰) |
| 정확성(North Star) | **미리보기 전용, 자동 전기 없음**(장부 반영 버튼 비활성). 원본 행 보존, 계정과목 미분류 표기. 확정 아님 |
| 스킬 버전 | `Sub_import-export_0.02`, `Sub_app-research-notes_0.36` |

남은 위험/미완:

1. 확정→원장 전기(중복 탐지·복식 전표 생성·`simple_book_rows` 저장)는 다음 단계. 현재는 읽기·표시만.
2. 날짜가 월/일 분리가 아니라 단일 일자열(또는 엑셀 date serial)인 다른 양식은 `buildDate` 폴백만 동작 — 서식 변형 추가 대응 필요.
3. 미리보기 200건 상한(대용량 DOM 방지). 전체 반영은 전기 단계에서 처리.
4. ZIP64·암호화 xlsx는 미지원(명확한 오류). 일반 Excel/Hancom 출력은 정상.

## 2026-07-11 앱 0.25 간편장부 가져오기 → 복식부기 원장 전기 (#5 완성)

| 항목 | 내용 |
|---|---|
| app_version | `0.25` |
| schema_version | `0.03` (DB·migration 변경 없음 — 기존 스키마·엔진 재사용) |
| note_type | `feature_release`, `import`, `data_integrity` |
| 제목 | 미리보기한 간편장부 거래를 균형 복식부기 전표로 원장에 반영(멱등) |
| 데이터 계약 확인 | `simple_book_rows`는 **VIEW**(복식부기 원장→간편장부 출력, `coalesce(account.name, standard.name)`) — 임포트 대상 아님. 따라서 전기는 `source_transactions`+`journal_entries`+`journal_entry_lines` 생성. view가 계정 명칭을 링크 계정에서 읽으므로 원 계정과목 명칭 보존을 위해 계정 자동 생성 필요 |
| 좀비 방지 설계 | `Utils.deterministicId`(cyrb128 128비트→UUID v5 포맷, 동기·무 crypto.subtle) 신설. tx id = `deterministicId(businessId+"|sb|"+sourceRow+내용)`, journal/line id도 tx id에서 파생. **같은 파일 재반영 → 동일 id → IndexedDB put 덮어씀(중복 0)**, 내용 동일·sourceRow 다르면 구분(예: 커피 800 2건). 파싱에 `sourceRow`(시트 행번호) 추가 |
| 구현 | `AppService.importSimpleBook(rows)`: 계정과목→type(`SimpleBookAccounts` group: income→revenue·asset→asset·나머지 expense) 판정 후 이름으로 기존 계정 재사용/자동 생성(코드 `SB-…`), 거래처 자동 생성. 행별 tx(supply=금액·vat=부가세·total 합산, `vat_type` vat>0?taxable:exempt, `payment_status='paid'`, 미분류 계정과목→`requires_review`, `source_channel='simple_book_import'`) + `buildPosting`→`validateJournal`(불균형 시 제외 카운트). 단일 putMany+sync 큐, reload 1회. UI: 요약에 `장부에 반영` 버튼→window.confirm→전기→toast(신규/갱신/불균형/건너뜀)→장부 이동 |
| 검증(정직·실데이터·멱등) | 헤드리스 Chromium 전 과정 구동: 사업자 생성(상호만) → 실 샘플(945행) 반영 → **945 거래·2,427 라인·차변=대변 81,651,988(전부 균형)·계정 20개(14 템플릿+6 자동)**. **재반영 → 945 유지·균형 유지(멱등, 중복 0)**. 앱 JS 콘솔 에러 0. 로직 테스트 +3(deterministicId 안정·구분·UUID형, 총 64). 원본 xlsx 미커밋 |
| 정확성(North Star) | 모든 행이 실제 복식부기 균형 전표. `payment_status='paid'`·`vat_type` 추정은 후보(미분류 계정과목은 검토 필요 표시). 확정 신고 아님 |
| 스킬 버전 | `Sub_import-export_0.03`, `Sub_code-architecture-guardians_0.04`, `Sub_app-research-notes_0.37` |

남은 위험/미완:

1. `payment_status`는 일괄 `paid`(간편장부에 미수/미지급 구분 없음), `vat_type`은 부가세 유무로 추정 — 실제 미수금·면세/과세 구분은 사용자 검토 필요.
2. 파일을 수정 후 재반영하면 변경 행은 새 id로 추가(구 행은 잔존) — "같은 파일" 멱등만 보장. 배치 교체(기존 임포트분 삭제 후 재반영) UI는 후속.
3. 자동 생성 계정과목 코드는 `SB-`+해시 — 표준 계정코드 체계와 별개(장부 명칭은 정확). 표준코드 매핑은 후속.
4. 945건 단일 putMany는 대량이지만 일회성 — 성능 관찰 대상. 반영은 헤드리스로만 구동 검증(실기기 체감은 수동).

## 2026-07-12 앱 0.26 가져오기 검증·수정 모달 (제안+승인)

| 항목 | 내용 |
|---|---|
| app_version | `0.26` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `import`, `data_integrity`, `ux` |
| 제목 | 업로드 시 자동 오픈되는 검증 모달로 오류·경고 탐지 후 사용자 승인 수정 |
| 사용자 결정 | "자동 수정" 강도 = **제안+승인**(AskUserQuestion). 값 변경은 사용자 승인, 무손실 정규화만 자동 |
| 비판적 검토(반대 포함) | 금융·세무 데이터의 **침묵 자동수정은 North Star(정확성) 위배** — 자동 탐지+제안, 값 변경은 승인으로 설계. 945행 전체를 모달에 넣지 않고 **문제 행만** 노출 |
| 검증 엔진(순수) | `validate(rows)`: 오류 bad_date(월 1–12·일 1–31 실검증)·no_amount·negative, 경고 unknown_account(+`suggestAccount` 최근접 제안)·ambiguous_kind·vat suspect(부가세가 금액×10%와 다르고 금액÷11에 가까우면 "금액=총액" 오입력 의심). 수정 헬퍼: `remapAccount`(계정과목 일괄 치환), `recomputeVatInclusive`(공급가액=금액−부가세). 전부 값 미변경/불변 반환 |
| 모달 | 기존 미사용 `#modalRoot`+`.modal-*` CSS 활용. `openModal/closeModal/renderImportReview/bindReviewEvents`. 업로드 핸들러가 `state.importReview={rows,fileName}` 세팅 후 자동 오픈. 미분류 계정과목은 `SimpleBookAccounts` 드롭다운으로 치환·적용, 부가세 의심은 일괄 적용, 오류 행 목록(반영 자동 제외). 각 수정 후 재검증·재렌더. 반영은 모달에서 `AppService.importSimpleBook(정상행)` |
| 검증(정직·실데이터) | 헤드리스 Chromium: 사업자 생성→실 샘플 업로드→**모달 자동 오픈, 정상 945·경고 512(부가세)·오류 0**. `일괄 적용`→경고 0(512행 공급가액 재계산)→반영 **945건 균형(차변=대변), debit 80,131,728**(수정 전 81,651,988에서 감소, 승인 수정이 실제 반영됨을 확인). 앱 JS 에러 0. 로직 테스트 +6(validate·suggest·remap·recompute, 총 70) |
| 정확성(North Star) | 값 변경은 전부 사용자 승인. 부가세 의심은 강한 경고지만 자동 변경 금지. 오류 행 자동 제외로 잘못된 데이터가 원장에 들어가지 않음 |
| 스킬 버전 | `Sub_import-export_0.04`, `Sub_app-research-notes_0.38` |

남은 위험/미완:

1. 오류 행(날짜·금액) 인라인 셀 편집은 미구현 — 현재는 목록 표시 후 반영 제외. 편집 후 포함은 후속.
2. 부가세 재계산은 "총액→공급가액" 한 방향만(면세·복합 케이스는 개별 확인). ambiguous_kind는 경고만.
3. `suggestAccount`는 포함관계 기반 근사(형태소 유사도 아님) — 대부분 `기타(비용)` 폴백.
4. 모달 시각·모바일 레이아웃은 수동 확인 대상(로직·플로우는 헤드리스 검증).

## 2026-07-12 앱 0.27 해외 구매·수입 처리 안내

| 항목 | 내용 |
|---|---|
| app_version | `0.27` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `legal_basis` |
| 제목 | 해외 구매(물품 수입·해외 용역·현지 소비)의 부가세·경비 처리를 근거와 함께 안내 |
| 배경(사용자 질문) | "해외에서 구매한 금액은 어떻게 처리하나요? 부가세 등 법적 근거로" |
| 근거(법령 MCP 원문 확인) | 부가가치세법 **제4조**(과세대상 = ①국내 공급 ②재화의 수입) — 물품 수입만 과세대상에 포함, 용역 수입은 없음. **제52조**(대리납부) — 국외사업자 용역 공급 시 받는 자가 부가세 대리납부, 단 "과세사업에 제공하는 경우는 제외"(→ 면세사업자·비사업자·매입세액 불공제분은 대상). 소득세법 §27(필요경비) |
| 핵심 발견 | **면세사업자(의료업 등)의 대리납부 함정** — 해외 SaaS·클라우드를 쓰면 해외 업체가 세금을 안 떼가도 본인이 10% 대리납부 의무. 실무에서 자주 누락 |
| 구현 | 가이드 `overseas` 토픽(3구분 표+대리납부 danger 경고+환율/증빙+눈높이 설명, 근거 §4·§52·§27). 용어 3개: `수입부가세`(§4②)·`대리납부`(§52)·`기준환율`(외화환산). `TAX_TERMS`+`term-ledger.md` 동시 갱신(게이트 31↔31 통과), legal-basis SSOT §8 해외 거래 절 추가 |
| 검증 | 헤드리스: 가이드 6토픽·overseas 근거 렌더·대리납부 danger 경고 존재·용어검색 `대리납부` 노출, 앱 JS 에러 0. term-ledger-contract 31↔31, 로직 테스트 +2(개수 31·대리납부 §52, 총 71) |
| 정확성(North Star) | 이해용 안내(확정 신고 아님). 소액 통관 면세 한도 등 변동 수치는 명시적으로 "관세청·홈택스 최신 확인" 표기(하드코딩 안 함) |
| 스킬 버전 | `Sub_tax-vat-classification_0.06`, `Sub_legal-basis-reference_0.02`, `Sub_app-research-notes_0.39` |

남은 위험/미완:

1. 거래 입력 흐름 연동(해외 거래 토글·외화×환율 자동 원화 환산·면세사업자 자동 대리납부 경고)은 **미구현** — 이번엔 안내(가이드·용어)만. 입력/전기 엔진 변경은 별도 확인 후 진행 권장.
2. 대리납부 세액 자동 계산·부가세 신고자료 반영은 후속.
3. 수입부가세·환율의 실제 장부 기입은 사용자가 수동(부가세란·원화 환산)으로 처리 — 자동화는 후속.

## 2026-07-12 앱 0.28 거래 입력 해외 거래 연동

| 항목 | 내용 |
|---|---|
| app_version | `0.28` |
| schema_version | `0.03` (DB·migration 변경 없음) |
| note_type | `feature_release`, `ui` |
| 제목 | 거래 입력에 해외 거래 토글 + 환율 자동 환산 + 대리납부 경고 (0.27 안내의 입력 연동) |
| 설계(저위험) | 환율 환산은 **입력 보조**로만 — 외화×환율을 원화로 계산해 기존 `#totalAmount`에 채우고, 이후는 기존 `calculateAmounts`→`saveTransaction`→`buildPosting` 경로 그대로. **전기·저장 엔진·스키마 무변경**. 해외 성격은 스키마 필드 대신 거래 내용에 `· 해외 USD 100@1350` 부기로 보존 |
| 구현 | 거래 폼: `해외 거래` 체크박스 → `#overseasBox`(통화·외화금액·환율) 표시. `AccountingDomain.fxToKrw(외화,환율)`=round(Utils.number×Utils.number). `fxAmount`/`fxRate` input·`isOverseas` change에서 `fxConvert()`로 총 금액 자동 채움+preview 갱신. `overseasNoteHtml()`: 수입→영세율 확인 안내, 비용/자산→물품 수입(수입부가세)·용역 안내, **과세유형 `exempt`면 대리납부 danger 경고**(§52). reset 시 박스 접힘. submit에서 해외 부기 |
| 검증 | 헤드리스: 면세사업자(부건의원, exempt) 생성→비용 선택→`해외 거래` 체크(박스 표시)→100×1,350 입력→`#totalAmount`=135000·preview 135,000원→**대리납부 danger 경고 존재**. 앱 JS 에러 0. 로직 테스트 +2(fxToKrw 135,000·반올림·빈값 0, 총 73) |
| 정확성(North Star) | 환율·해외 여부는 사용자 입력 그대로(자동 판정 아님). 대리납부는 경고만(자동 세액 계산 아님). 물품 수입 vs 용역 구분은 사용자 판단(안내로 지원) |
| 스킬 버전 | `Sub_tax-vat-classification_0.06`, `Sub_code-architecture-guardians_0.05`, `Sub_app-research-notes_0.40` |

남은 위험/미완:

1. 해외 여부·외화·환율은 구조적 필드로 저장하지 않고 내용 문자열에 부기 — 리포트 집계·통화별 분석은 스키마 확장(마이그레이션) 후 가능.
2. 대리납부 세액 자동 계산·부가세 신고자료 반영, 수입부가세 자동 분리는 후속.
3. 물품 수입/해외 용역 자동 구분 없음(대리납부 경고는 면세사업자 비용 전반에 노출) — 사용자 판단 안내.
4. 시각·모바일 레이아웃은 수동 확인 대상(플로우·계산은 헤드리스 검증).

## 2026-07-12 앱 0.29 해외 거래 구조화 저장 (스키마 확장·프로덕션 마이그레이션)

| 항목 | 내용 |
|---|---|
| app_version | `0.29` |
| schema_version | `0.03 → 0.04` (마이그레이션 적용) |
| note_type | `feature_release`, `schema_migration`, `data_integrity` |
| 제목 | 해외 거래의 통화·외화·환율·해외여부를 source_transactions 구조화 컬럼으로 저장 |
| 마이그레이션 | `supabase/migrations/20260712000500_accounting_v1_overseas_fields.sql`: `source_transactions`에 `is_overseas`(boolean not null default false)·`foreign_currency`(text)·`foreign_amount`(numeric 18,2)·`exchange_rate`(numeric 18,6) **ADD COLUMN IF NOT EXISTS** + `last_schema_version` 0.04 + 스키마 리뷰 노트. **additive·nullable/default·RLS 무변경·파괴적 아님** |
| 프로덕션 적용(하드룰 증거) | 사용자 명시 승인("2번, 마이그레이션"). **BEFORE**: 대상 4컬럼 미존재·`source_transactions` 0행(빈 테이블 → 기존 데이터 영향 0). `apply_migration`(project ihxiywffzmvrwmqvatzt) `{success:true}`. **read-back**: 4컬럼 존재 확인(is_overseas NOT NULL default false, 나머지 nullable), `last_schema_version`=0.04 |
| 앱 구현 | `saveTransaction`이 input.isOverseas 등으로 구조화 필드 저장(0.28의 description 부기 제거). 거래폼 submit이 구조화 필드 전달. 장부 행에 `🌐 해외` 배지(title=통화·외화·환율). 동기화는 전체 row 업로드(designateCanonical 등)라 새 컬럼 자동 반영 — 컬럼이 먼저 생겼으므로 upsert 실패 없음. 라이브(0.26) 앱은 새 컬럼을 모르지만 nullable이라 무해(하위호환) |
| 하네스 | `expectedMigrations` 5개로 갱신(migration-contract 통과). migration-contract는 첫 마이그레이션의 RLS·canonical 마커만 검사하므로 신규 파일은 존재만 확인 |
| 검증 | 헤드리스: 면세사업자 해외 비용(AWS 서버비, USD 100 @1350) 저장 → IndexedDB 트랜잭션 `is_overseas:true, foreign_currency:"USD", foreign_amount:100, exchange_rate:1350, total:135000`, 내용 클린(부기 제거), 장부 `.fx-tag` 배지 1개. 앱 JS 에러 0. 로직 테스트 73 유지 |
| 정확성(North Star) | 구조화로 향후 통화별 집계·대리납부 자동계산 토대 마련. 값은 사용자 입력 그대로 |
| 스킬 버전 | `Sub_tax-vat-classification_0.06`, `Sub_v1-scope_0.02`, `Sub_app-research-notes_0.41` |

남은 위험/미완:

1. 마이그레이션은 프로덕션 적용됨. 앱(0.29)은 아직 브랜치 — 배포 전까지 이 컬럼을 쓰는 쪽은 없음(컬럼은 nullable로 대기). 배포 시 활성화.
2. `simple_book_rows` view는 통화 컬럼 미노출(간편장부 표시엔 불필요). 필요 시 후속.
3. 대리납부 세액 자동계산·통화별 리포트·환율 자동 조회(API)는 후속 — 이번은 저장 구조까지.
4. import(간편장부) 경로는 해외 필드를 세팅하지 않음(전부 원화 국내 전제) — 필요 시 import에도 확장.

## 2026-07-12 앱 0.30 해외 거래 통화 선택 목록

| 항목 | 내용 |
|---|---|
| app_version | `0.30` |
| schema_version | `0.04` (변경 없음) |
| note_type | `feature_release`, `ux` |
| 제목 | 통화 입력을 ISO 4217 datalist 자동완성으로(기축통화 + UZS 포함) |
| 배경(사용자 질문) | "통화 환율에 기축통화와 우즈베키스탄 숨이 포함되어 있지?" → 기존 통화칸은 목록 없는 자유입력(USD 기본, 3글자)이었음을 정직히 확인 |
| 구현 | `CURRENCIES` 상수(ISO 4217 28개: 기축 USD/EUR/JPY/GBP/CHF, 주요 CNY/HKD/AUD/CAD/SGD/NZD/SEK, 중앙아 **UZS**/KZT/RUB, 동남아 VND/THB/IDR/MYR/PHP/TWD, 기타 INR/AED/TRY/BRL/MXN/SAR). 통화 입력칸에 `list="fxCurrencyList"` + `<datalist>` 렌더 — 목록 선택 또는 3글자 직접 입력 병행(목록 밖 통화 계속 허용). `CURRENCIES` 테스트 훅 노출 |
| 검증 | 헤드리스: datalist 연결·28개 옵션·`UZS:우즈베키스탄 숨` 존재·기축통화 존재, 앱 JS 에러 0. 로직 테스트 +3(UZS 포함·기축통화 5종 포함·전부 3글자 대문자 ISO, 총 76) |
| 정확성 | 목록은 편의(자동완성)일 뿐 입력을 제한하지 않음 — 어떤 통화든 3글자 코드로 입력 가능 |
| 스킬 버전 | `Sub_app-research-notes_0.42` |

남은 위험/미완:

1. 환율 값은 여전히 사용자 직접 입력 — 자동 환율 조회(API)는 후속(외부 네트워크 정책·기준환율 출처 필요).
2. 통화 코드 검증(입력값이 ISO 4217 실존 코드인지)은 미적용 — datalist는 제안만 하고 자유입력 허용.
3. 통화 이름(한글)은 대표 표기 — 정식 통화명·기호는 후속.

## 2026-07-12 앱 0.31 월별 사용현황 (계정과목×월 검토용 표)

| 항목 | 내용 |
|---|---|
| app_version | `0.31` |
| schema_version | `0.04` (변경 없음) |
| note_type | `feature_release`, `ui` |
| 제목 | 계정과목(열)×월(행) 사용금액을 보여주는 검토용 표 |
| 배경(사용자 요청) | 스크린샷(리포트 화면 우측 상단 파란 원 표시) + "간편장부든 복식부기든 계정별(열) 월별(행) 사용금액을 쉽게 확인" — 원 리포트(추계소득 등)는 법정서식이라 어려우니 별도로 |
| 위치 판단 | 스크린샷의 파란 원은 리포트 페이지 내부 pageHeader가 아니라 **전역 topbar**(동기화 배지·거래입력 버튼이 있는 자리) — 모든 화면에서 접근 가능하게 topbar에 배치(리포트 전용으로 한정하지 않음, 사용자 의도상 더 유용) |
| 구현 | `AccountingDomain.monthlyAccountMatrix(transactions, accounts)`(순수): 계정과목별·월별 `total_amount` 합산, months/accounts/matrix/rowTotals/colTotals/grandTotal 반환. `renderMonthlyUsageModal()`: `#modalRoot` 재사용, 연도 select(전체/연도별) + 스크롤 표(`.usage-table`, 첫 열·머리글 sticky, 합계 열/행 강조). topbar 버튼(`#monthlyUsageButton`)은 shell lifecycle에서 1회 바인딩(라우팅과 무관하게 항상 동작), 사업자 미설정 시 toast만 |
| 설계(간편장부·복식부기 통합) | 계정과목 이름은 `state.accounts`(복식부기 COA + import로 자동생성된 간편장부 계정 모두 포함, account_name 그대로) — 별도 관점 분기 없이 **하나의 표가 두 관점 모두 커버** |
| 검증(정직·실데이터) | 헤드리스: 무사업자 상태에서 버튼 클릭 시 모달 안 열림(toast만). 사업자 생성 후 실제 거래 3건(1월 2건 합 1,500·2월 1건 7,000, 서로 다른 계정) 입력 → 모달 표: 1월 행 1,500원, 2월 행 7,000원, **합계 8,500원 정확**. 앱 JS 에러 0. 로직 테스트 +6(월 정렬·계정 수집·행별 합산·열 합계·총합계·빈 입력, 총 82) |
| 정확성(North Star) | 법정서식(리포트의 추계소득 계산 등)과 명확히 분리 — 이 표는 이해용 검토 표라고 문구로 명시. 리포트 화면 로직·법정서식 상태는 무변경 |
| 스킬 버전 | `Sub_app-research-notes_0.43` |

남은 위험/미완:

1. 열(계정과목) 수가 많으면 표가 넓어짐 — 가로 스크롤·sticky 첫 열로 대응했으나 계정 수 상한은 없음(대량 시 성능 미검증).
2. 수입·비용·자산 부호 구분 없이 `total_amount` 단순 합산 — 계정과목 자체가 유형별로 나뉘어 있어 열 단위로는 구분되지만, 한 표 안에서 수입/비용을 시각적으로 더 구분하는 건 후속(예: 색상).
3. 연도 선택만 있고 월 범위·분기 필터는 없음 — 필요 시 후속.
4. 모바일 레이아웃(표 폭·모달 크기)은 수동 확인 대상(플로우·집계는 헤드리스 검증).

## 2026-07-12 앱 0.32 계정과목 선택 가이드

| 항목 | 내용 |
|---|---|
| app_version | `0.32` |
| schema_version | `0.04` (변경 없음) |
| note_type | `feature_release`, `ui` |
| 제목 | 계정과목 25개마다 법적 정의+초등학생 눈높이 설명+예시, 헷갈리는 것 구분법 |
| 배경(사용자 요청) | "계정과목 선택가이드를 초등학생도 이해하기 쉽게 가이드 페이지 안에 추가(법적 정의 + 초등식 설명)" |
| 설계(SSOT 중복 금지) | 새 데이터셋을 만들지 않고 기존 `SimpleBookAccounts.GROUPS`(국세청 간편장부 계정과목 분류표, 가져오기 화면과 공유하는 SSOT)의 각 항목에 `kid`(눈높이 설명)·`examples`(실제 예시 1~3개)만 **추가**. name/desc(법적 정의)는 그대로 재사용 — 두 화면(가져오기·가이드)이 같은 근원 데이터를 다르게 렌더링 |
| 구현 | 가이드 새 토픽 `account-guide`. `accountGuideHtml()`: 그룹별(수입·비용·제조비용·자산) 카드(`accountCardHtml`, 이름+눈높이 설명+법적 정의+예시) + "자주 헷갈리는 것" 안내 박스(소모품비 vs 비품=1년 이상·고가 여부, 기업업무추진비 vs 복리후생비=거래처 vs 직원, 여비교통비 vs 차량유지비=이동비 vs 차량 자체 유지비, 애매하면 기타(비용)이되 가능하면 구체적 계정과목 권장). 거래 입력 화면 계정과목 라벨 옆 `선택 가이드` 링크 버튼 — 기존 범용 `[data-open-guide-topic]` 핸들러를 그대로 재사용(신규 JS 불필요), 클릭 시 가이드로 라우팅+토픽 오픈. `.term-card-examples`·`.guide-link` CSS |
| 검증(정직) | 헤드리스: 가이드 진입 시 토픽 7개(신규 1개 포함)·`account-guide` 클릭 시 **25개 계정 카드** 렌더, 구분법 박스에 "소모품비"·"비품" 문구 존재, 예시 표시 확인. 거래 입력 화면에서 `선택 가이드` 버튼 클릭 → `#guide`로 이동 + 25카드 렌더 확인. 앱 JS 에러 0. 로직 테스트 +2(25개 전부 kid·examples 완결성 — 가이드가 비어있지 않음을 보장, 총 84) |
| 정확성(North Star) | 법적 정의(국세청 원문)와 눈높이 설명을 나란히 표기해 혼동 방지. 구분법은 이해를 돕는 안내이며 확정 세무 판단이 아님 |
| 스킬 버전 | `Sub_import-export_0.05`, `Sub_app-research-notes_0.44` |

남은 위험/미완:

1. 예시(examples)는 대표적인 것만 1~3개 — 모든 실제 사례를 다루지 않음.
2. 구분법 박스는 3가지 대표 쌍만 다룸(전체 25개 조합을 다 다루지 않음) — 자주 헷갈리는 것 위주로 선별.
3. 시각·모바일 레이아웃은 수동 확인 대상(렌더·데이터는 헤드리스 검증).

## 2026-07-12 앱 0.33 개인 가계부 모드

| 항목 | 내용 |
|---|---|
| app_version | `0.33` |
| schema_version | `0.04` (변경 없음 — 순수 앱 레이어) |
| note_type | `feature_release`, `architecture`, `data_integrity` |
| 제목 | 첫 실행 모드 선택(개인 가계부/사업자) + 확장 가능한 계정과목 CRUD |
| 배경(대화 경위) | ① "개인적으로 쓴 것도 이 앱으로 관리하면 제대로 관리될까" → ② 필자 비판적 검토: 복식부기·세무 UI는 개인에게 과함, 카테고리별 월별 집계(0.31)만으로 충분 → ③ 사용자: "복식부기처럼 입력한다기보다 간편장부처럼" → ④ 사용자: "처음 화면에서 모드를 선택, 가계부도 계정과목 도입하면 현금흐름이 한눈에" → ⑤ 사용자: "계정과목은 확장 가능한 구조로" → 필자 코드 조사 후 CRUD 설계 제안 → 구현 |
| 설계 결정 | (1) 스키마 무변경 원칙 고수 — 모드는 `state.config.ledgerMode`(localStorage)로만 관리, `businesses.business_type`은 그대로 `'individual'` 재사용(값 왜곡 없음). (2) 계정과목을 "배관용"(accountMap()이 buildPosting에서 참조하는 현금/예금/미수금/부가세대급금/미지급금/부가세예수금)과 "카테고리"(사용자가 고르는 것)로 분리 — 배관용은 모드 무관 항상 시딩, 카테고리만 모드별로 다름. (3) 계정과목 CRUD를 신설해 "확장 가능한 구조" 요구를 코드로 구현 — 향후 어떤 모드가 추가되든 사용자가 직접 카테고리를 늘릴 수 있음 |
| 사전 조사로 발견한 잠재 버그 2건(구현 전 차단) | ① `accountMap()`이 `ACCOUNT_TEMPLATES`(사업용)만 순회 — 개인 모드에서 배관용 계정을 별도로 안 심으면 `buildPosting`이 `accountsByKey.bank.id`에서 크래시할 뻔함 → CORE_ACCOUNT_TEMPLATES를 모드 무관 항상 시딩하여 차단. ② `accountChoices`의 자산구입 필터가 `local_key==='equipment'`로 하드코딩 — 새 계정과목(개인 자산·사용자 추가 자산)이 있어도 선택 불가할 뻔함 → `account_type==='asset' && !CORE_ACCOUNT_KEYS.includes(local_key)`로 일반화 |
| 구현 | `PERSONAL_ACCOUNT_TEMPLATES`(18: 급여/용돈·부수입·기타수입, 식비·교통비·주거공과금·통신비·의료건강·보험료·교육자기계발·문화여가·의류미용·경조사비·대출이자·기타지출, 예금적금·가전가구·차량). `CORE_ACCOUNT_TEMPLATES`=`ACCOUNT_TEMPLATES.filter(CORE_ACCOUNT_KEYS)`(파생, 중복 정의 아님). `renderModeSelect()`(첫 실행 게이트, `render()` 최상단에서 체크). `AppService.createAccount/deactivateAccount`(기존 `deleteTransaction`과 동일 soft-delete+tombstone+audit+queue 패턴, `SYNC_TABLE_ORDER`에 이미 있던 `accounts` 도메인의 삭제 배선을 처음 채움). `renderAccountManagement()`(설정 화면, 그룹별 목록+추가 폼). `PERSONAL_HIDDEN_NAV`/`PERSONAL_HIDDEN_GUIDE_TOPICS` 필터. 거래폼 부가세 칸·해외 안내 문구·리포트 세무 섹션·대시보드 과세유형 태스크를 모드 조건부 처리(전부 "DOM에 남기고 hidden" 패턴 — el() 참조 안전, 제출 핸들러 무변경) |
| 문서 동기화 | `docs/accounting-ledger-data-lifecycle-matrix.md`의 `accounts` 행 삭제→tombstone을 ⊘→✓로 갱신(실제 배선 반영, 하네스 `data-lifecycle-matrix` 게이트가 요구하는 정직성) |
| 검증(정직·전체 플로우 헤드리스) | 로직 테스트 +7(총 91: 템플릿 개수 15/6/18, 타입 분포 3·12·3, 코드 접두어 P, accountChoices 배관용 제외+개인/사업자/사용자 계정 포함). **헤드리스 Chromium 전체 시나리오**: 모드선택 화면 노출 → 개인 선택 → 사업자등록번호 등 필드 hidden 확인 → 저장 후 계정 24개(6+18) 시딩 확인 → 거래입력 비용 드롭다운에 개인 카테고리 12개만(사업용 없음), 부가세 칸 hidden → 식비 30,000원 저장 → **차변=대변 30,000 균형, 크래시 없음**(사전 발견한 버그가 실제로 안 일어남을 확인) → 자산구입 드롭다운에 예금/적금 등 3개(현금/보통예금 제외) → 계정과목관리에서 "반려동물"(비용) 추가 → 거래폼에 즉시 선택 가능 확인 → 비활성화 → 관리목록·거래폼 양쪽에서 제외 확인 → 네비게이션 9개(전표검토·가져오기·마감 없음) → 가이드 3개 토픽만(기장의무·면세·추계·해외 없음) → 모드전환(사업자) → 네비게이션 12개로 복원. **회귀 시나리오**(별도 처음부터): 사업자 모드 선택 → 계정 15개(무변경) → 비용 드롭다운 6종(무변경: 소모품비·지급수수료·복리후생비·여비교통비·통신비·지급임차료) → 자산 드롭다운 비품만(무변경) → 과세거래 11,000원(공급 10,000+부가세 1,000) 저장 균형 → 리포트에 추계소득 계산·법정서식 섹션 노출(무변경). 전 시나리오 앱 JS 콘솔 에러 0 |
| 정확성(North Star) | 세무 화면은 개인 모드에서 완전히 숨겨 오해 방지(법정서식·경비율·추계·대리납부 등 사업자 개념을 개인에게 노출하지 않음). 사업자 모드는 한 줄도 동작이 바뀌지 않음(회귀 헤드리스로 확인) |
| 스킬 버전 | `Sub_v1-scope_0.03`, `Sub_code-architecture-guardians_0.06`, `Sub_app-research-notes_0.45` |

남은 위험/미완:

1. 모드 선택은 로컬(기기별) 설정이라 다른 기기에서 로그인하면 다시 모드 선택 화면이 뜰 수 있음(클라우드에 businesses가 이미 있으면 `!state.business` 조건이 거짓이 되어 곧바로 넘어가지만, 신규 기기·동기화 전 타이밍에는 잠깐 보일 수 있음) — 기기 간 모드 동기화는 후속 고려.
2. 개인 모드 화면 숨김은 네비게이션·가이드 필터일 뿐, 라우트 자체는 남아있어 해시를 직접 바꾸면 전표검토·가져오기·마감에 여전히 접근됨(기능 삭제가 아니라 노출 축소로 설계, 의도된 절충).
3. 계정과목 비활성화 후 "과거 거래의 계정명이 장부에 그대로 남는지"는 코드 경로상 보장되나(accountName()이 삭제 여부 무관 조회) 실제 화면 확인은 수동 체크리스트로 남김.
4. 개인 모드에서 해외 거래·통화 목록(0.27~0.30)은 그대로 사용 가능하지만 대리납부 경고 문구만 개인용으로 단순화 — 관세·통관 부가세 등 세부 안내는 후속.
5. 모바일 레이아웃(모드 선택 카드, 계정과목 관리 폼)은 수동 확인 대상.

## 2026-07-12 앱 0.34 거래처 소프트삭제 + Excel 읽기 기능탐지 (사용자 제공 36개 개발 규율 프롬프트 감사)

| 항목 | 내용 |
|---|---|
| app_version | `0.34` |
| schema_version | `0.04` (변경 없음 — 순수 앱 레이어) |
| note_type | `feature_release`, `data_integrity`, `robustness`, `process_audit` |
| 제목 | 사용자가 이전 Medical Note 앱 개발 경험에서 뽑은 36개 규율 프롬프트(`appdevpromptsall.md`)를 이 앱에 대조 감사하고, 적용 가능한 항목을 반영 |
| 배경 | 사용자: "내가 만든 프롬프트인데 우리 앱에 녹일 수 있는 건 녹여봐요. 이미 녹인 것도 있을 거예요." 36개 전수 대조 결과 20개 이상은 이미 `CLAUDE.md`·하네스 게이트에 반영돼 있었음(SSOT 원칙, 생명주기 매트릭스, LWW+tombstone+빈클라우드가드, 게이트 우선 개발, 정직한 완료 구분, 프로덕션 전후 증거, 최소변경, 결함 클래스화 등). 신규 적용 대상 4건을 식별해 이번 릴리스에 2건(코드 변경), 별도 감사 1건(버그 없음 확인), 문서화 1건(후속)으로 처리 |
| 신규 적용 ① 거래처 소프트삭제 | 형제 도메인 대조 감사(사전 세션)에서 `data-lifecycle-matrix.md`가 이미 `counterparties` 행을 "삭제 미구현" ✗로 표시해 gap을 알고 있었음. 스키마에 `deleted_at` 컬럼은 이미 존재(초기 마이그레이션) — 앱 레이어만 미구현이었음을 재확인 후 `AppService.deactivateCounterparty`를 `deactivateAccount`와 동일 패턴(soft-delete+tombstone+audit+queue)으로 추가. 설정 화면에 "거래처 관리" 패널 신설(목록+비활성화 버튼, 생성 폼 없음 — 거래 입력이 생성 경로) |
| 신규 적용 ② DecompressionStream 기능탐지 | `XlsxReader.text()`가 미지원 브라우저에서 `new DecompressionStream(...)` 호출 시 이름 모를 TypeError로 죽던 것을, 호출 전 `typeof DecompressionStream === 'undefined'` 체크로 가로채 "최신 Chrome·Edge·Safari로 다시 시도해 주세요" 한국어 안내로 치환. 기존 import 실패 처리 경로(`catch`→`error.message` 그대로 표시)가 이미 있어 별도 UI 배선 불필요 |
| 감사만 수행(버그 없음, 코드 변경 없음) ③ 반응형 오버플로 실측 | 그동안 체크리스트에 누적된 "수동 확인 필요"를 실제 헤드리스 Chromium 측정으로 검증. 375/768/1280 3개 뷰포트 × 대시보드·설정(사업자정보+계정과목관리+거래처관리)·거래입력(해외거래 박스 열림)·장부·리포트+월별사용현황 모달·가이드+가이드토픽(계정과목 선택가이드) = 10개 화면 배합 실측. `document.documentElement`/`body`의 `scrollWidth - clientWidth` 전부 0(가로 overflow 없음). 표(장부·월별사용현황)는 개별 요소 기준 뷰포트를 넘지만(모바일 460px, 태블릿 67px) `.table-wrap`의 `overflow-x:auto` 안에 갇혀 문서 자체는 안 넘침 — 의도된 패턴이 실제로 작동함을 확인. 가져오기 미리보기 표(xlsx 업로드 필요)와 개인 모드 화면은 이번 실측에서 제외(후속) |
| 후속(코드 변경 없음, 다음 세션 과제) ④ 개념 정의 원장 + anchor-existence 게이트 | 도메인·동기화·게이트 핵심 개념을 정의(1줄)/규칙(왜)/집행(코드·게이트 앵커)/자세히(링크) 구조로 문서화하고, 하네스에 각 "집행" 앵커가 실제로 존재하는지 검증하는 게이트를 추가하는 설계는 규모가 있어 별도 커밋으로 분리 |
| 검증 | 로직 테스트 91개 그대로 통과(신규 순수 로직 없음 — CRUD가 기존 `deactivateAccount` 패턴 재사용이라 회귀 테스트로 충분히 커버됨). 헤드리스 Chromium 전체 시나리오: 사업자 모드 선택 → 거래 입력(계정과목 선택 포함, 이전 회차에서 계정 선택 누락으로 검증 실패 1회 재현 후 수정) → 거래처 "검증거래처" 자동 생성 → 설정 화면 거래처 관리 패널에 노출 확인 → 비활성화 클릭(confirm 다이얼로그 accept) → 목록에서 제거 확인. `npm run harness:check` 10 Required 통과(11번째는 여전히 MANUAL) |
| 정확성(North Star) | 두 변경 모두 사용자가 이미 정확히 관리해 온 데이터(거래처 이름, xlsx 원본)를 다루는 최전선 안전장치 — 소프트삭제는 과거 거래 표시를 깨지 않고, 기능탐지는 오류를 숨기지 않고 행동 가능한 한국어 안내로 바꿈 |
| 스킬 버전 | `Sub_app-research-notes_0.46` |

남은 위험/미완(0.34):

1. ~~개념 정의 원장 + anchor-existence 게이트(④)는 다음 세션 과제로 이월.~~ **같은 세션에서 바로 이어 구현**(아래 항목 참조).
2. 가져오기 미리보기 표(수입 xlsx 업로드 시 렌더)의 오버플로는 이번 헤드리스 실측 범위 밖 — 실제 파일 업로드가 필요해 후속 수동 확인 또는 합성 xlsx 버퍼로 재실측 필요.
3. 개인 모드 전용 화면(모드 선택 카드, 개인 카테고리 폼)은 이번 실측에서 별도로 재확인하지 않음 — 사업자 모드의 상위집합이라 위험 낮음으로 판단했으나 확정 아님.

## 2026-07-12 개념 정의 원장 + anchor-existence 게이트 (마이그레이션 없음, 앱 버전 무변경)

| 항목 | 내용 |
|---|---|
| app_version | 무변경(`index.html` 미수정 — 순수 문서 + 하네스 스크립트 레이어) |
| schema_version | 무변경 |
| note_type | `governance`, `tooling` |
| 제목 | 36개 개발 규율 프롬프트 감사에서 식별한 4번째 항목 — 개념 정의 원장 신설 + 하네스 anchor-existence 게이트 |
| 배경 | 용어대장(`term-ledger-contract`)이 **세법 용어**의 법적 정의 드리프트를 막는 것처럼, 저장소 고유의 **설계·운영 개념**(SSOT, 소프트삭제+tombstone, LWW, 빈클라우드가드, 결정적ID 등)도 "문서엔 적혀 있는데 실제로 강제하는 코드가 리팩터로 사라졌다"는 드리프트에 취약함을 사전 감사에서 식별 |
| 구현 | `docs/accounting-ledger-concept-ledger.md` 신설 — 13개 개념을 정의/규칙(왜)/집행/자세히 4칸 표로 정리, "집행" 칸의 백틱 토큰이 anchor. `scripts/harness-check.mjs`에 `concept-ledger-contract` 게이트 추가: 표를 파싱해 각 앵커가 저장소의 **다른** 텍스트 파일(코드·다른 문서)에 실존하는지 검색. `project-contract`의 requiredFiles에 새 문서 등록(15개로 증가) |
| 구현 중 발견·차단한 버그 1건 | 첫 구현에서 haystack에 개념원장 문서 **자기 자신**을 포함시켰더니, 앵커를 오타로 바꿔도(`EMPTY_CLOUD_GUARD_TYPO`) 그 오타 문자열 자체가 문서 안에 있으니 "존재한다"고 오판(자기참조 순환, false positive) — 게이트가 게이트 역할을 못 하는 상태였음. haystack에서 원장 파일 자신을 제외해 수정. 양방향 검증(오타 주입→FAIL, 복구→PASS)으로 실제로 잡는지 확인 후 커밋 |
| 검증 | `npm run harness:check` 12게이트 중 11 Required 통과(신규 게이트 포함), 로직 테스트 91 유지(순수 로직 무변경). 자기참조 버그를 오타 주입 실험으로 재현 후 수정 확인(FAIL→수정→PASS) |
| 정확성(North Star) | 문서가 코드를 정확히 반영하지 못하면 다음에 합류하는 AI·개발자가 존재하지 않는 안전장치를 믿고 작업하게 된다 — 이 게이트는 그 신뢰 격차를 자동으로 좁힌다 |
| 스킬 버전 | `Sub_app-research-notes_0.47` |

## 2026-07-12 앱 0.35 기기간 자동 동기화(기본값)

| 항목 | 내용 |
|---|---|
| app_version | `0.35` |
| schema_version | 무변경(순수 앱 레이어, 마이그레이션 없음) |
| note_type | `feature_release`, `architecture` |
| 제목 | "동기화" 버튼을 눌러야만 다른 기기와 맞춰지던 것을, 로그인·화면 복귀·온라인 복귀·30초 주기 타이머로 자동 트리거하도록 변경 |
| 배경(사용자 요청) | 0.34 배포 보고에서 "개인 가계부 모드가 다른 기기에서 처음 로그인할 때 잠깐 모드 선택 화면이 다시 뜰 수 있음(로컬 설정이라 기기 간 미동기화)"을 남은 위험으로 보고 → 사용자: "기기간 실시간 동기화가 기본으로 가게 해야하는데 방법을 찾아보자" → 필자가 코드 조사 후 "1단계(자동 동기화 기본값, 안전·즉시) vs 2단계(Supabase Realtime push, 진짜 실시간이지만 복잡도↑)"로 나눠 제안 → 사용자: "1단계 진행하자" |
| 조사로 확인한 근본 원인 | `init()`이 로그인 세션은 확인하지만 `syncNow()`를 자동 호출하지 않았고, `online` 이벤트 리스너는 토스트만 띄우고 실제 동기화를 하지 않았음 — 즉 동기화가 100% 수동(버튼 클릭)이었다 |
| 설계 결정 | (1) **폴링·이벤트 기반**을 선택하고 Supabase Realtime(2단계, 채널 구독)은 보류 — 기존 `syncNow`/LWW 병합/빈클라우드가드 로직을 그대로 재사용해 리스크를 낮추고, 이 앱의 실제 사용 패턴(동시 협업이 아니라 한 사람이 기기를 오가며 씀)에서는 수 초~수십 초 지연이면 충분하다고 판단. (2) **디바운스 단일 타이머**(`autoSyncTimer`)로 여러 이벤트(온라인 복귀+포커스가 거의 동시에 오는 경우 등)가 겹쳐도 한 번만 실행. (3) **백그라운드 동기화 후 전체 재렌더 안전장치** — `render()`는 `#app` 전체를 다시 그려 입력 중이던 form 값을 지울 수 있어, 이미 코드에 있던 `runConnectionDiagnostics`의 라우트 allowlist 재렌더 패턴을 참고해 `AUTO_SYNC_UNSAFE_ROUTES`(transactions·settings·imports)를 새 이름 있는 상수로 뽑아 회귀 테스트로 잠금 |
| 구현 | `SyncService.scheduleAutoSync(delayMs=2000)`/`runAutoSync()` 신설(디바운스 스케줄러 + 가드: 세션·설정·온라인·이미 동기화 중 아님 확인 후 `connectAndSync()` 재사용). 트리거 5곳: ① `init()`에서 세션 있으면 부팅 직후, ② `window focus`, ③ `document visibilitychange`(visible), ④ `online`(기존 토스트 뒤에 자동 호출 추가), ⑤ 30초 주기 `setInterval`. `AUTO_SYNC_UNSAFE_ROUTES` 상수로 안전 라우트 목록을 명시적 이름으로 노출(`window.__ACCOUNTING_APP_TEST__`에도 포함). 데이터 관리·대시보드 카피를 "자동으로 동기화됩니다" 톤으로 갱신(기존 "지금 동기화할 수 있습니다"는 더 이상 정확하지 않음) |
| 아키텍처 결정: 어디에 훅을 걸었나 | 로컬 저장 직후 자동 push까지 하려면 `AppService`의 모든 변경 메서드(약 10곳)를 훑어야 했는데, 그러면 (a) `AppService`가 처음으로 `SyncService`를 참조하게 되어 계층 분리가 흐려지고 (b) 봉합점을 하나라도 빠뜨릴 위험이 있었음. 대신 `SyncService`가 자기 완결적으로 트리거만 늘리는 쪽을 택함 — 로컬 변경은 최대 30초(주기 타이머) 안에 자동으로 실려 나간다. 계층 순수성을 지키는 대신 즉시성(최대 수십 초 지연)을 일부 양보한 트레이드오프 |
| 검증 | 로직 테스트 +1(총 92): `AUTO_SYNC_UNSAFE_ROUTES`가 transactions·settings·imports를 포함하는지 회귀 확인(이 목록이 줄어들면 백그라운드 동기화가 입력 중인 화면을 지울 수 있음을 잠그는 가드). VM 샌드박스에 `setInterval`/`clearInterval` 추가(새 코드가 로드 시점에 무조건 실행되므로 없으면 앱 로드 자체가 깨짐 — 실제로 처음 추가 안 했을 때 재현 후 수정). **헤드리스 Chromium**: 앱 로드 후 focus·visibilitychange·online 이벤트를 강제 발생시키고 디바운스(2초) 이후까지 대기해도 콘솔 에러 0(비로그인 상태에서 안전하게 무시됨 확인), 데이터 관리 화면 카피가 "자동으로 동기화" 문구를 포함하는지 확인 |
| 정직하게 표시한 한계 | 실제 두 기기 동시 로그인 상태에서 A의 변경이 B에 자동 반영되는 전체 왕복은 **실제 Supabase 로그인이 필요해 헤드리스로 검증 불가** — `docs/accounting-ledger-browser-checklist.md`에 새 섹션 "5b. 기기간 자동 동기화 — 기본값 (0.35)"로 수동 확인 항목을 남김. 진짜 실시간(초 단위 즉시 반영)은 아니고 최대 30초(주기 타이머) 또는 이벤트 발생 시점까지 지연될 수 있음(2단계 Supabase Realtime을 도입하면 줄일 수 있으나 이번 범위 밖) |
| 정확성(North Star) | 자동 동기화가 사용자의 입력을 조용히 지워버리는 게 가장 나쁜 실패 모드라고 판단해, 그 위험이 있는 화면은 재렌더를 명시적으로 건너뛰고 그 결정을 이름 있는 상수 + 회귀 테스트로 고정했다 — "기본으로 켜지는 자동화"일수록 사용자 눈에 안 보이는 부작용이 없어야 한다 |
| 스킬 버전 | `Sub_app-research-notes_0.48` |

남은 위험/미완(0.35):

1. 진짜 실시간(Supabase Realtime postgres_changes 구독)은 2단계로 보류 — 사용자가 두 기기를 동시에 켜놓고 즉시 반영을 원하면 후속 논의 필요.
2. 두 기기 동시 로그인 실제 왕복은 수동 확인 항목으로 남음(헤드리스 불가, 실제 Google 로그인 필요).
3. 로컬 변경의 클라우드 반영 최대 지연은 30초(주기 타이머) — 사용자가 기기를 켜놓고 아무 것도 안 누른 채 기다리는 극단적 케이스의 체감 지연.

## 2026-07-12 앱 0.36 가계부 여러 개 관리(다중 렛저)

| 항목 | 내용 |
|---|---|
| app_version | `0.36` |
| schema_version | 무변경(순수 앱 레이어, 마이그레이션 없음 — `businesses.owner_user_id`에 유니크 제약이 원래 없어 DB는 이미 사용자당 여러 행을 허용했음) |
| note_type | `feature_release`, `architecture` |
| 제목 | "가계부(사업자) 1개"만 다루던 앱을, 목적이 다른 가계부를 여러 개 만들고 전환할 수 있게 확장 |
| 배경(사용자 요청) | 스크린샷(설정 화면, "우즈벡 유학생활" 개인 가계부)과 함께: "여기에 가계부 영구마감 기능을 추가하는 건 어때? 마감해제 기능도... 그리고 새로운 가계부를 추가하고... 당신 생각은?" → 조사 결과 마감은 아직 표시 전용(실제 잠금 없음)이고, 가계부 추가는 앱이 "가계부 1개"를 전제로 짜여 있어 마감보다 훨씬 큰 구조 변경임을 확인 후 필자가 비판적 검토: (1) "영구마감+마감해제"는 이름과 실제 동작(되돌릴 수 있는 잠금)이 안 맞음, (2) 마감을 먼저 만들면 가계부가 여러 개 생겼을 때 마감 범위를 다시 손봐야 함 → "가계부 추가 → 마감" 순서 제안, 사용자가 그 순서를 선택 |
| 조사로 확인한 현재 상태 | `AppService.reload()`가 `businesses.find(row=>!row.deleted_at)`로 **항상 첫 번째 가계부만** 골라 씀(index.html:1735, 수정 전) — 전환 UI 자체가 없었음. DB 스키마(`businesses.owner_user_id`)엔 유니크 제약이 없어 여러 행이 이미 가능했고, 설계지침(`docs/accounting-ledger-design-directive-v2.md`)도 "구조는 복수 지원, UI는 1개 중심"이라고 명시 — 즉 이번 작업은 DB 마이그레이션 없이 **앱 레이어만** 열면 되는 구조였음 |
| 설계 결정 | (1) **활성 가계부는 로컬 설정**(`state.config.activeBusinessId`, localStorage) — 0.33의 `ledgerMode`와 같은 패턴. 기기마다 "지금 보는 가계부"가 다를 수 있다(은행 앱에서 계좌 탭이 기기마다 다를 수 있는 것과 같은 개념). (2) **필터링은 `reload()` 한 곳에서만** — accounts/transactions/counterparties/journals/journalLines/evidenceFiles/auditLogs/closings를 전부 활성 가계부 id로 걸러 `state.*`에 담아, 25개 넘는 화면 렌더러는 단 한 줄도 안 고쳐도 된다(다들 이미 `state.transactions` 같은 "이 가계부 것"이라고 가정하고 짜여 있었음 — 그 가정이 이제 진짜가 됨). (3) **모드도 가계부별로 분리**(`config.ledgerModeByBusiness`, id→'personal'\|'business') — 안 그러면 사업자 가계부와 개인 가계부를 같이 쓸 때 모드 토글이 뒤섞임. 0.33 이전 단일 가계부 설치는 `state.business.id`가 맵에 없으면 예전 전역값(`config.ledgerMode`)으로 자동 대체(레거시 폴백), 다음 저장 시 그 id로 못박힘 — 마이그레이션 스크립트 없이 코드에서 자연스럽게 전환 |
| 구현 | `state.businesses`(전체 목록) 추가. 순수 함수 `pickActiveBusiness(businesses, configuredId)`(설정된 id가 목록에 있으면 그것, 없으면 첫 번째, 없으면 null) — 로직 테스트로 3가지 분기 잠금. `AppService.createLedger({name, mode})`(완전히 새 businessId로 사업자+사업장+기간설정+계정과목 세트를 만들고 활성 전환, `setupBusiness`와 달리 기존 가계부를 절대 안 건드림). `AppService.switchLedger(businessId)`(로컬 설정만 바꾸고 재로드). `isPersonalMode()`를 가계부별 조회로 재작성(레거시 폴백 포함). `data-switch-mode` 핸들러가 활성 가계부 id로 맵에 저장하도록 변경. 설정 화면에 `renderLedgerManagement()`(가계부 목록+상태 배지+전환 버튼+새 가계부 추가 폼) 신설, "가계부 기본정보" 패널 위에 배치 |
| 검증 | 로직 테스트 +4(총 96): `pickActiveBusiness`의 설정값 우선/삭제된 id 폴백/미설정 폴백/빈 목록 4가지 분기. **헤드리스 Chromium 전체 시나리오**: 개인 가계부 "우즈벡 유학생활" 생성 → 식비 5,000원 저장 → 설정에서 "한국 생활비" 가계부 추가(생성 즉시 활성 전환, topbar 이름 갱신, 목록에 "사용 중" 배지 확인) → 새 가계부는 거래 0건(격리 확인) → 교통비 2,000원 저장 → 장부에 "한국생활 교통비"만 보이고 "유학생활 식비"는 안 보임(격리 확인) → "전환" 버튼으로 첫 가계부로 복귀 → topbar 이름 복원, "유학생활 식비"만 보이고 "한국생활 교통비"는 안 보임(양방향 격리 확인). 전 과정 앱 JS 콘솔 에러 0 |
| 정확성(North Star) | 가계부 간 자료가 한 글자라도 섞이면 사용자의 개인 재정 기록이 서로 오염되는 심각한 사고이므로, 필터링을 25개 렌더러에 흩뿌리지 않고 `reload()` 단일 지점으로 모아 "빠뜨린 화면 하나가 다른 가계부 자료를 새는" 버그 클래스 자체를 원천 차단했다. 헤드리스로 양방향(가계부1→2, 2→1) 격리를 직접 확인 |
| 스킬 버전 | `Sub_app-research-notes_0.49` |

남은 위험/미완(0.36):

1. 가계부 삭제(비활성화) 기능은 이번 범위 밖 — 실수로 만든 가계부를 지울 방법이 아직 없음(계정과목·거래처처럼 소프트삭제 배선은 형제 패턴이 이미 있어 후속 추가 용이).
2. ~~사용자가 원래 요청한 "마감(영구마감+마감해제)"은 이번 작업으로 이월~~ **같은 사용자 지시("남은 것을 당신 추천대로 진행해주세요")로 바로 이어 구현(아래 0.37 항목 참고)**.
3. 사업장(한 가계부 안의 복수 사업장, 예: 지점 여러 개)은 여전히 미지원 — 이번에 만든 건 "가계부" 단위 복수화이지 "사업장" 단위 복수화가 아님(설계지침 표 11 참고).
4. 가계부 전환 UI는 설정 화면에만 있음 — 사이드바 등에서 더 빠르게 전환하고 싶다면 후속 고려.

## 2026-07-12 앱 0.37 마감·마감해제(되돌릴 수 있는 월 잠금)

| 항목 | 내용 |
|---|---|
| app_version | `0.37` |
| schema_version | 무변경(순수 앱 레이어, 마이그레이션 없음 — `period_closings` 테이블은 초기 스키마부터 `status`·`closed_at`·`reopened_at` 컬럼을 이미 갖고 있었음) |
| note_type | `feature_release`, `data_integrity` |
| 제목 | "마감" 화면을 표시 전용에서 실제 잠금(저장·삭제 차단)으로, "마감 해제"를 신설해 되돌릴 수 있게 구현 |
| 배경(사용자 요청) | 0.36 완료 보고에서 "가계부 추가 → 마감" 순서를 제안하고 사용자가 승인 → 0.36 구현·배포 후 사용자: "남은 것을 당신 추천대로 진행해주세요" → 마감 이어서 구현 |
| 조사로 확인한 현재 상태(0.36 작업 전 사전 조사에서 이미 파악) | `renderClosing()`은 상태만 보여주는 표시용이고 실제 잠금 버튼이 없었음(코드 안내문구로 명시: "마감 후 수정 통제와 재개방 감사로그가 완성되기 전에는 실제 잠금 버튼을 활성화하지 않습니다"). `DOMAIN_GUARDIANS`에도 `manual_only`로 등록돼 있었음. 반면 `period_closings` 스키마는 처음부터 `status`(open/closed)·`closed_at`·`reopened_at`을 다 갖추고 있어 앱 레이어만 채우면 되는 구조였음 |
| 설계 결정 | (1) **이름과 동작을 맞춤** — "영구마감"이 아니라 되돌릴 수 있는 월 단위 잠금으로 설계(마감 화면에 "영구 삭제가 아닙니다" 문구로 명시). 재개방은 행을 지우는 게 아니라 `status`를 `'open'`으로 되돌리는 갱신이라 `closed_at`/`reopened_at` 이력이 감사 기록으로 남는다. (2) **월 단위만 지원**(연 단위는 이번 범위 밖) — 가계부 사용 패턴상 "이번 달 다 확인했으니 잠그기"가 가장 흔한 단위. (3) **검증 계층에 통합** — 새 `AccountingDomain.isDateClosed(closings, dateStr)`(순수 함수)를 `validateTransaction`의 필드 오류(`errors.transactionDate`)에 연결해, 이미 있던 `data-error="transactionDate"` 화면 슬롯을 그대로 재사용(신규 UI 배선 불필요). `deleteTransaction`도 같은 함수로 막아 저장·삭제 양쪽을 하나의 판단 함수로 통일. (4) **개인 가계부 모드에도 노출** — 사용자의 원 요청이 개인 가계부 화면에서 나왔고, 마감은 세무 전용 개념이 아니라 "이번 달 정산 끝났으니 잠그기"라는 보편적 필요라 `PERSONAL_HIDDEN_NAV`에서 `closing`을 제거 |
| 구현 | `AccountingDomain.isDateClosed(closings, dateStr)`(순수, 소프트삭제·재개방된 마감은 무시). `AccountingDomain.validateTransaction(input, closings)`에 두 번째 인자 추가해 날짜 검증에 연결. `AppService.closePeriod({year, month, reason})`(월의 첫날·마지막날 계산, 같은 달 중복 마감 시 `CLOSING_OVERLAP` 차단, 감사로그·동기화 큐 배선). `AppService.reopenPeriod(closingId, reason)`(`status`만 되돌리고 이력 보존). `deleteTransaction`에 `isDateClosed` 가드 추가(`PERIOD_CLOSED` 에러). `errorMessage()`에 `PERIOD_CLOSED`/`CLOSING_OVERLAP`/`CLOSING_NOT_FOUND`/`CLOSING_ALREADY_OPEN` 안내문 추가. `renderClosing()` 전면 재작성 — 마감 기록 목록(상태 배지·거래 건수·마감/해제 일자·메모) + 연/월 선택 마감 폼. `DOMAIN_GUARDIANS`의 `period_close_guardian` 상태를 `manual_only`→`implemented`로 갱신 |
| 의도적으로 다루지 않은 범위 | 간편장부 Excel 가져오기(`importSimpleBook`) 경로는 이번에 마감 검증을 안 걸었음 — 가져오기 자체가 개인 모드에서 숨겨져 있고(`PERSONAL_HIDDEN_NAV`), 이미 촘촘히 검증된 기존 파이프라인(945건 실사용 검증 완료)에 손대는 리스크 대비 이득이 작다고 판단. 증빙 첨부·계정과목·거래처 등 날짜가 없는 자료는 마감과 무관해 그대로 둠 |
| 검증 | 로직 테스트 +9(총 105): `isDateClosed` 경계값(마감 기간 포함/제외, 시작·끝 경계 양쪽 포함), 재개방된 마감은 더 이상 안 막음, 소프트삭제된 마감 기록은 무시, 빈 목록·undefined 방어, `validateTransaction`이 마감 기간에서 거부·열린 기간에서 허용하는지 확인. **헤드리스 Chromium 전체 시나리오**: 개인 가계부 생성 → 오늘 날짜 거래 저장 → 이번 달 마감(배지 "마감됨" 확인) → 같은 달 새 거래 저장 시도 → 거래일 칸에 정확한 오류 문구, 장부에 저장 안 됨 확인 → 데이터 관리에서 마감 전 거래 삭제 시도 → "마감된 기간이라 삭제할 수 없습니다" 토스트, 거래 그대로 남아있음 확인(콘솔의 `PERIOD_CLOSED` 에러 로그로 이중 확인) → 마감 해제(확인창) → 배지 "열림"으로 전환 → 같은 달에 새 거래 저장 성공 확인. 전 과정 앱 JS 콘솔 에러 0(의도된 `PERIOD_CLOSED` 진단 로그 제외) |
| 정확성(North Star) | "마감"이라는 이름을 달고도 실제로는 아무것도 막지 않는 화면을 두는 건 하드 룰("아직 구현하지 않은 기능을 완료된 기능처럼 보이게 하지 않는다")에 어긋나므로, 버튼을 실동작으로 채우거나 안 채우거나 둘 중 하나만 있어야 한다고 판단해 이번에 실제 저장·삭제 차단까지 구현했다. 동시에 "영구"라는 사용자의 원래 표현을 그대로 따르지 않고 되돌릴 수 있는 잠금으로 설계해, 실수로 마감한 경우에도 데이터를 영영 못 고치는 사고를 막았다 |
| 스킬 버전 | `Sub_app-research-notes_0.50` |

남은 위험/미완(0.37):

1. 연 단위 마감은 미지원(월 단위만) — 필요하면 후속.
2. 간편장부 Excel 가져오기는 마감 검증을 안 걸음(위 "의도적으로 다루지 않은 범위" 참고) — 마감된 달로 가져오기를 시도하면 현재는 막히지 않음.
3. 마감 사유(메모)는 선택 입력이라 비워둘 수 있음 — 강제하면 더 꼼꼼하지만 입력 부담이 커져 선택으로 남김.
4. ~~가계부 삭제 기능은 여전히 미구현~~ **0.38에서 이어서 구현(아래 참고)**.

## 2026-07-12 앱 0.38 가계부 삭제(계단식 소프트삭제)

| 항목 | 내용 |
|---|---|
| app_version | `0.38` |
| schema_version | 무변경(순수 앱 레이어, 마이그레이션 없음) |
| note_type | `feature_release`, `data_integrity` |
| 제목 | 가계부 관리에 "삭제" 버튼 추가 — 가계부와 그 안의 모든 자료를 함께 소프트삭제 |
| 배경(사용자 요청) | 0.37(마감·마감해제) 배포 완료 보고 후 사용자: "가계부 삭제기능 추가하고 배포하자" — 0.36 완료 보고에서 "가계부 삭제 기능은 이번 범위 밖(형제 패턴이 이미 있어 후속 추가 용이)"라고 남겨둔 항목을 바로 이어 처리 |
| 설계 결정 | (1) **계정과목·거래처 삭제와 다른 스코프** — 계정과목/거래처는 자기 자신만 소프트삭제하고 과거 거래는 그대로 두지만(이름만 남기면 되는 참조 데이터), 가계부는 "이 가계부를 더 이상 안 쓴다"는 훨씬 큰 의사표시이므로 그 가계부에 속한 모든 자료(거래·계정과목·거래처·전표·전표라인·증빙·마감 기록·사업장·기간설정)를 함께 소프트삭제하기로 함 — 그렇지 않으면 삭제된 가계부의 거래가 화면엔 안 보여도 로컬·클라우드에 영영 떠도는 orphan 데이터가 됨. (2) **audit_logs는 예외**(append-only 클래스라 그대로 둠 — 가계부가 존재했고 언제 삭제됐는지는 감사 기록으로 남아야 함). (3) **활성 가계부 삭제 처리를 별도 코드로 안 만듦** — `reload()`의 `pickActiveBusiness(businesses, configuredId)`가 이미 "설정된 id가 목록에 없으면 첫 번째로 폴백"하도록 설계·테스트돼 있어(0.36에서 정확히 이 경우를 대비해 만든 순수 함수), 삭제 후 `reload()`만 다시 부르면 자동으로 다음 가계부 또는 없음으로 정리됨. (4) **마지막 가계부 삭제를 막지 않음** — `deleteTransaction`이 마지막 거래 삭제를 막지 않는 것과 동일한 원칙. 삭제 후 `state.business`가 null이 되면 기존 렌더러들이 이미 그 상태를 안전하게 처리함(빈 폼 표시) — 새 코드 경로 불필요 |
| 구현 | `AppService.deleteLedger(businessId)`: 9개 자식 테이블(business_sites/ledger_period_settings/accounts/counterparties/source_transactions/journal_entries/journal_entry_lines/evidence_files/period_closings)을 `business_id`로 스코프해 전부 soft-delete + tombstone + 동기화 큐 반영, 감사로그 1건, 마지막에 `reload()`. 가계부 관리 목록에 삭제 버튼(`data-delete-ledger`) 추가 — 활성/비활성 가계부 모두에 표시. 확인창에 삭제 범위를 구체적으로 명시하고, 마지막 남은 가계부일 땐 별도 경고 문구 추가. `errorMessage()`에 `LEDGER_NAME_REQUIRED`/`LEDGER_MODE_INVALID`/`LEDGER_NOT_FOUND` 매핑 추가(0.36에서 놓쳤던 gap — createLedger/switchLedger 에러가 그동안 일반 메시지로만 떴었음, 이번에 같이 고침) |
| 검증 | 로직 테스트 105 유지(이 기능은 IndexedDB 의존적 카스케이드 로직이라 `deleteTransaction`처럼 순수 함수 미러를 안 만듦 — 대신 헤드리스로 전체 경로를 실제로 검증). **헤드리스 Chromium 전체 시나리오**: 가계부A(거래 1건) → 가계부B(거래 1건, 관리 화면에서 생성) → 활성 상태인 가계부B 삭제(확인창 문구 확인) → 가계부A로 자동 전환(topbar 확인) → 가계부B 거래는 안 보이고 가계부A 거래는 그대로(격리 확인) → 마지막 남은 가계부A 삭제(확인창에 "마지막 남은 가계부" 경고 포함 확인) → 가계부 관리 "아직 가계부가 없습니다", 가계부 기본정보는 빈 새 가계부 입력 폼으로 정상 표시(크래시 없음). 앱 JS 에러 0 |
| 정확성(North Star) | "삭제"라는 단어가 실제로 무엇을 지우는지 사용자가 확인창에서 정확히 알 수 있어야 한다고 판단해, 확인 문구에 삭제 범위(거래·계정과목·거래처·전표·증빙·마감 기록)를 구체적으로 나열하고 되돌릴 수 없음을 명시했다. 계단식 삭제 스코프를 `deleteLedger` 한 함수에 모아, 새 자식 테이블이 추가될 때 빠뜨리기 쉬운 지점을 한 곳으로 좁혔다 |
| 스킬 버전 | `Sub_app-research-notes_0.51` |

남은 위험/미완(0.38):

1. 연 단위 마감 미지원(0.37부터 이어짐).
2. 간편장부 Excel 가져오기 마감 검증 미적용(0.37부터 이어짐).
3. `deleteLedger`는 순수 로직 미러가 없어 로직 테스트로 회귀를 못 잠금 — 카스케이드 대상 테이블 목록이 바뀔 때 헤드리스 재검증이 필요.
4. 삭제된 가계부를 되살리는 UI는 없음(소프트삭제라 DB엔 남아있지만, 화면에서 복구할 방법이 없음 — 계정과목·거래처와 동일한 한계).

## 2026-07-12 앱 0.39 클라우드가 정본 — 백업·복원·강제 새로고침 완성

| 항목 | 내용 |
|---|---|
| app_version | `0.39` |
| schema_version | 무변경(순수 앱 레이어, 마이그레이션 없음) |
| note_type | `feature_release`, `architecture`, `data_integrity` |
| 제목 | "데이터 백업 저장 복원 기능을 알파부터 오메가까지 구현" 요청 — local은 보조 캐시, 클라우드(Supabase)가 정본이라는 원칙을 백업/복원/강제 새로고침에 반영 |
| 배경(사용자 요청) | "우리 앱에 전체 데이터 백업 복원 기능 있나요?" → 있음(로컬 IndexedDB 전용, `exportBackup`/`restoreBackup`)이라고 정확히 답함 → 사용자: "우리 앱 스킬에 가지고 있는 스킬로 데이터 백업 저장 복원 기능 제대로 알파부터 오메가까지 구현하죠. local 저장소는 보조캐시저장 정도 역할이고 정본은 supabase로 하고" → 조사 결과 현재 동기화는 로컬·클라우드가 동등한 권위를 갖는 LWW(행마다 updated_at 최신 승리) 구조임을 확인, "백업 기능만 완성(A)" vs "동기화 엔진 자체를 클라우드 항상 승리로 재설계(B)" 두 갈래를 제시 → 사용자: "A로 하되... 기기별로 달라지지 않게 시스템적으로 막는게 핵심" — A를 확정하되 목적은 순수 기능 추가가 아니라 기기간 데이터 일관성 보장임을 명확히 함 |
| 조사로 확인한 현재 상태 | `SyncService.syncNow`의 평상시 경로는 로컬·클라우드 각 행을 `Utils.latestByUpdatedAt`로 병합하는 LWW다. `designateCanonical()`(0.08)만이 클라우드를 무조건 우선으로 만드는 유일한 기존 수단이었지만 owner 전용·수동 트리거였다. 백업/복원(`exportBackup`/`restoreBackup`)은 100% 로컬 IndexedDB만 다루고, Supabase에서 직접 백업을 뜨거나 Supabase로 복원하는 기능은 전혀 없었음(`remote` 객체에 dump/backup류 메서드 없음 확인) |
| 설계 결정 | (1) **동기화 엔진(LWW)은 그대로 둠** — 이미 검증된 다기기 병합·삭제수렴·빈클라우드가드 로직을 건드리지 않는 게 가장 안전. 대신 "정본을 믿을 수 있는 도구"를 새로 추가. (2) **`designateCanonical()` 재사용** — "복원 후 모든 기기에 반영"을 새로 설계하다가, 이미 있는 `designateCanonical`이 정확히 "이 기기 상태를 클라우드에 강제로 올리고 canonical_version을 올려 다른 모든 기기가 다음 동기화에서 무조건 이걸로 맞추게" 만드는 기존 검증된 메커니즘임을 발견 — 새 메서드를 만들지 않고 `restoreBackup()` 다음에 `designateCanonical()`을 이어 호출하는 것으로 설계를 단순화함. (3) **계층 경계 준수** — `exportCloudBackup`/`resetLocalFromCloud`는 `remote.*`(Supabase)를 직접 호출하므로 Remote Adapter 계층인 `SyncService`에 배치(처음엔 실수로 `AppService`에 넣었다가, `AppService`가 지금까지 한 번도 `remote`를 직접 참조한 적이 없었다는 걸 확인하고 옮김 — 0.35에서 세운 계층 원칙을 그대로 지킴). (4) **복원 파일의 부재 키는 비우지 않음** — 클라우드 백업엔 `sync_queue`/`app_research_notes`(로컬 전용 인프라) 키가 아예 없는데, 기존 `restoreBackup`은 없는 키를 빈 배열로 취급해 그 저장소를 통째로 비웠음 — 이대로면 클라우드 백업을 복원하는 순간 아직 못 올린 로컬 변경(sync_queue)이 통째로 사라지는 실질적 데이터 손실 버그였음. "키가 없으면 안 건드린다"로 고침 |
| 구현 | `SyncService.exportCloudBackup()`(SYNC_TABLE_ORDER 전 테이블 + tombstones를 `remote.pullTable`/`pullTombstones`로 직접 조회, 로컬 캐시 미경유). `SyncService.resetLocalFromCloud()`(canonical_version 비교 없이 무조건 클라우드로 로컬 전체 교체, EMPTY_CLOUD_GUARD 재사용, sync_queue는 버림). `AppService.restoreBackup()` 수정(백업 파일에 없는 저장소는 건드리지 않음). 데이터 관리 화면 카드 재구성 — "로컬 캐시"(정본 아님을 명시), "클라우드 동기화"(새 "클라우드 기준으로 새로고침" 버튼 추가), "백업"(클라우드 백업이 기본/강조, 이 기기 백업은 보조), "복원"("이 기기만 복원" / owner 전용 "복원 후 모든 기기에 반영" 두 갈래, 파일 input 두 개). 상단 안내 문구를 "정본은 클라우드, 이 기기는 보조 캐시" 원칙으로 재작성. `docs/accounting-ledger-concept-ledger.md`에 "정본은 클라우드, 로컬은 보조 캐시" 개념 신설(anchor: `resetLocalFromCloud`) |
| 검증 | 로직 테스트 +5(총 110): `restoreScope`(0.39 버그 수정을 미러한 순수 함수) — 백업에 있는 저장소는 교체, 없는 저장소는 안 건드림, 명시적 빈 배열은 진짜로 적용됨(부재와 빈 배열을 구분), 잘못된 타입은 거부. **헤드리스 Chromium**: 데이터 관리 화면 문구에 "정본" 포함 확인, 비로그인 상태에서 클라우드 관련 버튼 비활성/숨김 확인, 이 기기 백업 다운로드 파일이 `source:'local'`이고 `sync_queue` 키를 포함하는지 확인, **클라우드 백업 형태(SYNC_TABLE_ORDER만 있고 sync_queue·app_research_notes 키가 아예 없는 파일)를 "이 기기만 복원"으로 복원했을 때 동기화 대기 건수가 32건→32건으로 그대로 유지됨을 확인**(수정 전이었다면 0건으로 wipe됐을 시나리오). 앱 JS 에러 0 |
| 정직하게 표시한 한계 | "복원 후 모든 기기에 반영"·"클라우드에서 백업"·"클라우드 기준으로 새로고침"은 전부 실제 Supabase 로그인이 필요해 헤드리스로 전 구간 검증 불가 — `docs/accounting-ledger-browser-checklist.md`에 "5f. 클라우드가 정본" 수동 확인 섹션을 남김. 동기화 엔진 자체(LWW)는 이번에 변경하지 않았으므로, 두 기기가 동시에 온라인 상태로 각자 다른 값을 계속 편집하는 극단적 경쟁 상황의 근본 해결책은 아니며 "정본으로 강제 새로고침"이라는 수동 안전판을 제공하는 것 |
| 정확성(North Star) | "정본"이라는 말을 UI 카피에만 적어놓고 실제로는 여전히 로컬이 클라우드를 이길 수 있는 구조로 방치하면 사용자를 오도하는 것이므로, 최소한 "정본 기준으로 강제 확정"할 수 있는 도구(클라우드 백업, 강제 새로고침, 복원+최종본 지정)를 실제로 갖추고 나서 그 카피를 썼다. 복원 버그(부재 키 wipe)는 구현 도중 스스로 발견해 실제 데이터 손실 시나리오가 되기 전에 차단했다 |
| 스킬 버전 | `Sub_app-research-notes_0.52` |

남은 위험/미완(0.39):

1. 동기화 엔진(LWW) 자체는 미변경 — "클라우드 항상 승리" 구조로의 전환(사용자가 처음 제시한 옵션 B)은 이번 범위 밖, 필요하면 후속 논의.
2. 위 세 가지 클라우드 연동 기능은 실제 로그인이 필요해 헤드리스 전 구간 검증 불가 — 수동 확인 항목으로 남김.
3. "복원 후 모든 기기에 반영"은 `designateCanonical`과 동일하게 owner 전용 — 비owner 사용자는 이 기기 복원만 가능(의도된 제한, 최종본 지정 권한 체계와 일관).

## 2026-07-12 거버넌스: 실행 루프(에이전트 루프) 절 신설 (마이그레이션 없음, 앱 버전 무변경)

| 항목 | 내용 |
|---|---|
| app_version | 무변경(`index.html` 미수정 — 순수 문서 레이어) |
| note_type | `governance` |
| 제목 | "여러 에이전트를 목적에 맞게 분류해서 쓰는 구조"(에이전트 루프) 개념을 검토 — 실제로는 코드를 여러 전담 에이전트로 쪼개는 대신, 0.33~0.39 구간에서 반복 검증된 단일 실행 순서를 `accounting-development-governance-skill.md`에 명문화 |
| 배경 | 사용자가 외부 자료(loadout 슬라이드, "자율성" 카테고리의 "에이전트 루프")를 보여주며 이 앱에 적용할 수 있는지 질문 → 조사 결과 이미 있던 `accounting-development-governance-skill.md`의 역할 체계(Mapper/Planner/Implementer/...)가 "무엇을 봐야 하는가"는 정의하지만 "실제로 어떤 순서로 도구를 쓰는가"는 없었음을 확인 → 필자 검토: 역할별 전담 에이전트로 기계적으로 쪼개면 이 저장소 특유의 맥락 의존적 판단(계층 경계, 이름-동작 일치, 형제 패턴 재사용)을 놓칠 위험이 있어, "여러 에이전트 분류"보다 "검증된 단일 루프를 명문화"를 추천 → 사용자 승인("진행하죠") |
| 구현 | `accounting-development-governance-skill.md`에 "실행 루프(에이전트 루프)" 절 신설 — 10단계(브랜치 확인→조사→설계결정→최소구현→로직테스트→하네스→헤드리스 실증검증→문서4종 갱신→버전규칙→커밋/push/정직한 보고), 실제 있었던 사고 사례(배포 직후 브랜치 확인 누락으로 main에 잘못 커밋할 뻔한 것, 나중에 push 전 발견해 복구)를 근거로 포함. `CLAUDE.md`의 "먼저 적용할 도메인·코드 스킬" 목록에 이 절을 참조하는 줄 추가(스킬 버전 0.06→0.07) |
| 정확성(North Star) | 절차를 문서화하되 이미 몸으로 검증된 순서만 적었다 — 아직 안 해본 걸 "이렇게 하면 된다"고 추측해 적지 않았다 |
| 스킬 버전 | `Sub_development-governance_0.07`, `Sub_app-research-notes_0.53` |

## 2026-07-13 앱 0.40: 0.33~0.39 전체감사 + 자동동기화·가계부삭제 tombstone 버그 수정

| 항목 | 내용 |
|---|---|
| app_version | 0.39 → 0.40 |
| note_type | `bugfix` |
| 제목 | 사용자 요청으로 0.33~0.39 구간을 병렬 서브에이전트 4개로 전체감사 — 실버그 2건 발견 후 수정 |
| 배경 | 0.39 배포 + 실행 루프 거버넌스 문서화 완료 보고 후 사용자 "이쯤에서 전체감사 진행하는건 어때?" — 명시적 감사 요청. `accounting-development-governance-skill.md`의 실행 루프 절 자체가 "여러 화면·여러 파일을 동시에 넓게 훑어야 하는 감사·점검성 작업은 예외적으로 병렬 조사를 쓰는 게 낫다"고 명시하고 있어, 이번이 바로 그 예외 케이스라고 판단 |
| 감사 설계 | 4개 축으로 분리해 `general-purpose` 에이전트를 동시 launch: ① 다중 가계부 격리 + `deleteLedger` 계단식 삭제 완전성(0.36·0.38), ② 신규 변경 메서드의 자동동기화 연동(0.35 안전장치가 신규 라우트를 놓쳤는지), ③ 문서/버전/게이트 정합성(0.33~0.39 전체), ④ 신규 파괴적 메서드의 권한·RLS 모델(0.36~0.39). 각 에이전트에 file:line 인용을 요구하고, 실버그 발견 시 "POTENTIAL BUG"/"SECURITY FINDING" 접두어로 눈에 띄게 보고하도록 프롬프트 설계 |
| 감사 결과 — 문제없음 | ③ 문서/게이트: 하네스 전부 통과, `UPDATE_HISTORY` 서술이 실제 코드와 일치, 개념원장 앵커 정상, 데이터 생명주기 매트릭스 정확. ④ 보안·권한: RLS가 `businesses.owner_user_id=auth.uid()`에서 `accounting_can_access_business(business_id)`로 이어지는 체인으로 `deleteLedger`의 9개 자식 테이블 전부를 정확히 커버 — 클라이언트 JS가 신뢰 경계가 아니라 실제 방어선은 항상 DB RLS임을 재확인. `designateCanonical`은 JS `isBootstrapOwner()` + DB `accounting_is_bootstrap_owner()` 이중 방어. 'viewer' 롤은 신규 메서드뿐 아니라 저장소 전체에서 표시 전용(강제 없음) — 신규 회귀가 아니라 기존 베이스라인. 비밀키 하드코딩 없음. `resetLocalFromCloud`는 confirm 다이얼로그가 유일한 진입점, 실제 대기 건수를 정확히 표시 |
| 감사 결과 — 실버그 1(자동동기화) | `AUTO_SYNC_UNSAFE_ROUTES`(index.html:666)에 `'closing'`이 빠져 있었음. 0.37이 마감 화면에 자유 텍스트 `closeReason` 입력을 추가했지만, 0.35에서 만든 "입력 폼 화면은 배경 동기화 후 재렌더 건너뜀" 안전장치 목록을 갱신하지 않아, 마감 사유를 입력하는 도중 배경 자동동기화(0.35, 최대 30초 주기)가 완료되면 `render()`(index.html:2431)가 전체 재렌더되어 입력값이 사라질 수 있었음. 0.37 출시 당시 헤드리스 검증이 "자동동기화가 입력 중에 끼어드는" 시나리오를 다루지 않아 놓쳤던 gap |
| 감사 결과 — 실버그 2(tombstone 오표기) | `AppService.tombstone(entityType, entityId)`(index.html:2137, 수정 전)가 `business_id: state.business?.id`로 **항상 활성 가계부**를 찍었음. `deleteLedger(businessId)`(index.html:1906)는 자신의 호출부(1929)에서 `businessId`를 넘기지 않아, 비활성 가계부를 삭제할 때 그 삭제로 생긴 tombstone들이 실제로는 삭제 대상이 아닌 **활성 가계부**의 것으로 잘못 찍혔음. 가계부 관리 화면(설정)이 비활성 가계부에도 삭제 버튼을 노출하므로(index.html:3155) 정상적인 사용자 흐름에서 재현 가능. 감사 시점 기준 `tombstone.business_id`를 읽는 코드가 저장소 어디에도 없어(쓰기 전용 필드) 실제 데이터 손실이나 RLS 우회는 없었음(잘못 찍힌 값도 어차피 같은 소유자의 다른 가계부 id라 RLS는 그대로 통과) — 하지만 향후 이 필드로 필터·감사하는 기능이 생기면 잘못된 값을 진실로 신뢰하게 될 잠재적 정합성 결함이었음 |
| 수정 | ① `AUTO_SYNC_UNSAFE_ROUTES`에 `'closing'` 추가(다른 3개 원소 순서·값 불변). ② `tombstone(entityType, entityId, businessId)`로 3번째 인자 추가 — 생략(`undefined`) 시 기존과 동일하게 활성 가계부로 폴백(다른 4개 호출부 — `deleteAccount`/`deactivateCounterparty`/`deleteTransaction`/증빙삭제 — 는 전부 활성 가계부 컨텍스트에서만 호출되므로 인자 생략 유지, 동작 완전 불변). `deleteLedger`의 유일한 `tombstone(...)` 호출부만 3번째 인자로 삭제 대상 `businessId`를 명시 전달하도록 수정 |
| 검증 | 로직 테스트 +4(총 114) — `tombstoneBusinessId(explicitBusinessId, activeBusinessId)` 순수 미러 함수로 명시값 우선/생략시 활성값 폴백/활성값 없음→null/명시적 null 존중 4분기 잠금. `npm run harness:check` 12/12 Required 통과(개념원장 앵커를 새 시그니처 `tombstone(entityType, entityId, businessId)`로 갱신해 `concept-ledger-contract` 통과). **헤드리스 Chromium 7/7**: (a) `window.__ACCOUNTING_APP_TEST__.AUTO_SYNC_UNSAFE_ROUTES`에 `closing` 포함 + 기존 3개 원소 보존 확인. (b) closing 화면에서 `closeReason`에 입력 후, `location.hash`를 바꾸지 않은 채 `hashchange` 이벤트를 강제 dispatch(자동동기화 완료 핸들러가 부르는 것과 동일한 `render()` 호출부를 정확히 재현)해 입력값이 실제로 사라짐을 **먼저 확인**(가드가 막아야 하는 위험이 진짜임을 증명) → 이제 가드 배열에 `closing`이 포함되므로 실제 자동동기화 코드 경로(index.html:2431의 `if (!AUTO_SYNC_UNSAFE_ROUTES.includes(state.route)) render();`)는 이 정확한 호출을 스킵함이 논리적으로 확정됨. (c) 가계부A 생성(설정폼 제출) → 가계부B 생성(자동으로 B가 활성 전환) → 비활성 A를 삭제 → IndexedDB `accounting-ledger-v1` DB의 `tombstones` object store를 직접 열어 조회 → A 삭제로 생긴 tombstone 27건(accounts/ledger_period_settings/businesses/business_sites) 전부 `business_id===A.id`, B로 잘못 찍힌 건 0건 확인. 앱 JS 콘솔 에러 0. 검증에 쓴 `playwright-core`(devDependency 미저장 설치)·임시 정적 서버·검증 스크립트는 전부 정리(작업 트리에 흔적 없음) |
| 정확성(North Star) | "감사에서 발견한 버그는 그 자리에서 고치고 끝내지 않는다" 원칙대로, 두 버그 모두 회귀를 실제로 재현(자동동기화 wipe를 hashchange로 강제 재현, tombstone 오표기를 IndexedDB 직접 조회로 확인)한 뒤 고쳤고, 각각 로직 테스트 잠금까지 남겼다. tombstone 버그는 실제 데이터 손실이 없었음에도 "잠재적 정합성 결함"이라고 정확히 등급을 낮춰 보고했다(보안 취약점으로 과장하지 않음) |
| 남은 위험/미완(0.40) | 1. `tombstone.business_id`는 현재 저장소 전체에서 쓰기 전용(아무도 읽지 않음) — 이번 수정은 미래에 이 필드를 신뢰하는 기능이 추가될 때를 대비한 예방적 정합성 수정이다. 2. 감사 대상은 0.33~0.39 코드 변경분에 한정했고, 그보다 이전 버전(0.01~0.32)의 유사 패턴은 재검토하지 않았다. 3. 'viewer' 롤은 여전히 어디서도 강제되지 않는 표시 전용 필드다 — 이번 감사에서 "기존 베이스라인과 일관됨(회귀 아님)"으로 확인만 했을 뿐 실제 강제 구현은 이번 범위 밖이다 |
| 스킬 버전 | `Sub_app-research-notes_0.54` |

## 2026-07-13 앱 0.41: 세금 계산 정확성 체크리스트(TAX_CALC_GUARDIANS)

| 항목 | 내용 |
|---|---|
| app_version | 0.40 → 0.41 |
| note_type | `feature` |
| 제목 | "세금 계산기 관련 에이전트" 아이디어를 검토 — 상시 다중 에이전트 파이프라인 대신, 저장소에 이미 있던 `GOVERNANCE_AGENTS` 체크리스트 패턴으로 보수적으로 문서화 |
| 배경 | 0.40 배포·전체감사 완료 보고 후 사용자 "세금 계산기 관련 에이전트 있을까?" → 스킬·플러그인 카탈로그 검색(결과 없음) → 저장소에 이미 `DOMAIN_GUARDIANS`/`ARCH_GUARDIANS`/`GOVERNANCE_AGENTS`라는 3개 체크리스트 배열이 있고, 그중 `GOVERNANCE_AGENTS`가 정확히 "개발 프로세스 역할을 문서화한 manual_only 체크리스트"임을 확인 후 답변 → 사용자가 TaxLawSourceAgent·TaxRuleModelerAgent·TaxCalculationAgent·TaxBoundaryTestAgent·TaxOracleAgent·TaxChangeDiffAgent·TaxExplanationAgent·PlaywrightTaxQAAgent·SecurityPrivacyAgent 9개 에이전트 표(필수 5·권장 4)를 제시하며 의견 요청 |
| 검토 | 9개를 성격이 다른 두 그룹으로 나눠 판단했다. **분리 반대 그룹**(법령수집·규칙모델링·계산구현·설명생성): 법 조문을 읽은 사람과 그것을 규칙·코드·설명으로 옮기는 사람이 갈리면, 미묘한 예외조항(면세 20개 호 중 특정 호, 초과율 적용 구간 등)이 핸드오프 사이에서 새어나갈 위험이 크다고 판단 — 이건 이전에 "역할별 전담 에이전트로 개발 프로세스를 쪼개는 것"을 검토했다가 기각하고 대신 단일 에이전트의 "실행 루프"를 명문화했던 것(거버넌스 0.07)과 같은 이유다. 실제로 0.18~0.20의 추계소득 계산기도 이 방식(한 에이전트가 법령 조회→계산식 구현→작성사례 대조까지 전부 수행)으로 만들어 국세청 작성사례 수치(21,220,000원 등)와 원 단위까지 정확히 맞춘 전례가 있어 이 판단의 근거로 제시했다. **분리 찬성 그룹**(경계값검증·공식사례대조·개정비교·보안·화면QA): 이건 정반대로 "만든 사람과 다른 시선"이 핵심 가치인 검증 작업이라 독립 에이전트가 나은 경우로 판단 — 그리고 이 판단은 추상적 주장이 아니라 바로 그날 실행한 0.40의 "전체감사"(4개 병렬 독립 에이전트가 실제 버그 2건을 발견)가 정확히 같은 패턴이었다는 실증 사례로 뒷받침했다. |
| 사용자 결정 | "니 추천대로 보수적으로 적용하자. 핵심은 정확성이니까" — 두 그룹 구분과 "지금은 문서화만, 감사 워크플로는 트리거 시 나중에" 제안을 그대로 승인 |
| 구현 | `TAX_CALC_GUARDIANS`(index.html, `GOVERNANCE_AGENTS` 바로 뒤) 9개 항목 신설 — `[id, 이름, status, 설명]` 4칸 형식을 기존 Guardian 배열과 동일하게 맞췄고, 전부 `status: 'manual_only'`로 뒀다(자동 강제가 아니라 체크리스트임을 정직하게 표시 — `GOVERNANCE_AGENTS`도 전부 manual_only인 것과 일관). `renderDeveloper()`의 `registry` 배열에 `...TAX_CALC_GUARDIANS`를 추가해 개발 기록 화면 Guardian 카드 목록에 실제로 노출, `window.__ACCOUNTING_APP_TEST__`에도 노출 |
| 의도적으로 안 한 것 | 분리 찬성 그룹(경계값·공식사례대조·개정비교·보안·QA)을 실제 병렬 Workflow 스크립트로 만드는 건 보류했다 — 지금 감사할 대상(신규/변경된 세금 계산기)이 없어 "언제 어떤 변경을 감사할지" 트리거가 불명확한 채로 스크립트만 미리 만들면 과잉 준비가 된다고 판단. 세금 계산기 관련 기능을 추가·수정하거나 국세청이 경비율·기준금액을 매년 개정 고시하는 시점에 실제로 작성하기로 함. 계산 로직(`EstimatedIncome`/`ExpenseRateMethod`/`BookkeepingDuty`/`VatExemption`) 자체는 이번 변경에서 손대지 않았다 |
| 검증 | `npm run harness:check` 12/12 Required 통과. 헤드리스 Chromium 6/7 통과(1건은 외부 CDN 차단으로 인한 콘솔 에러 — 이 저장소의 기존 릴리스 검증들과 동일하게 "외부 CDN 차단 제외" 대상, 앱 자체 로직과 무관): `TAX_CALC_GUARDIANS` 9개·id 전부 유일·전부 manual_only 확인, 개발 기록 화면에 `tax_oracle_agent`·`playwright_tax_qa_agent`를 포함한 9개 카드가 실제 DOM에 렌더링됨을 직접 확인, 전체 Guardian 카드 수가 정확히 9개 늘어남을 확인. 로직 테스트는 114개 그대로 유지 — `DOMAIN_GUARDIANS`/`GOVERNANCE_AGENTS`도 정적 체크리스트 데이터라 전용 로직 테스트가 없는 기존 관례를 그대로 따랐다(새 예외를 만들지 않음) |
| 정확성(North Star) | "세금 계산기 에이전트를 도입했다"고 과장하지 않았다 — 이번 변경은 순수 체크리스트 문서화이고 계산 로직은 한 줄도 안 건드렸음을 버전 노트·릴리스 문구·이 표에 명확히 남겼다. 9개 전부를 manual_only로 못박아, 나중에 이 문서만 보고 "이미 자동 검증되고 있다"고 오해하지 않게 했다 |
| 남은 위험/미완(0.41) | 1. 분리 찬성 그룹 5개는 아직 실제 Workflow 스크립트가 없다 — 다음에 세금 계산기 기능을 만지거나 경비율이 개정되면 이때 실제로 작성해야 한다(문서화만으로는 정확성이 자동으로 보장되지 않는다). 2. 이 체크리스트는 `manual_only`라 harness 게이트가 강제하지 않는다 — 실행 여부는 다음 작업자(AI 포함)가 실행 루프를 따르는지에 달려 있다. |
| 스킬 버전 | `Sub_app-research-notes_0.55` |

## 2026-07-14 앱 0.42: 재산세(주택분) 계산기

| 항목 | 내용 |
|---|---|
| app_version | 0.41 → 0.42 |
| note_type | `feature` |
| 제목 | 지방세법·시행령 원문을 법령 MCP로 대조해 재산세(주택분) 계산기를 신설 — 사용자가 제공한 지자체 팜플렛의 "세부담상한" 문구가 폐지된 옛 제도임을 직접 확인해 정정 |
| 배경 | 스크린샷 2장 업로드 — ① 앱 좌측 메뉴 하단(가이드 아래) 빈 공간을 파란 원으로 표시한 화면 캡처, ② 지자체 재산세 안내 팜플렛 사진(과세근거·세율·도시지역분·지방교육세·지역자원시설세·세부담상한·이의신청 등). "재산세 계산기을 파란색 표시 위치에 설계하려고 합니다. 법령을 꼼꼼히 확인해서 만들어주세요" |
| 조사 | `search_law`로 지방세법(MST 282559)·지방세법 시행령(MST 287223) 확인 — 둘 다 2026-07-01 시행 현행본(조회기준일 2026-07-14와 일치). `get_law_text`로 제104조(정의)·제105조(과세대상)·제110조(과세표준)·제111조(세율)·제111조의2(1세대1주택 특례세율)·제112조(도시지역분)·제114조(과세기준일)·제115조(납기)·제151조(지방교육세), 시행령 제109조(공정시장가액비율)·제109조의2(과세표준상한액)·제110조의2(1세대1주택 판정)를 원문 조회. **기술적 난관**: `get_law_text`가 세율표(§111①3호·§111의2①)를 HTML 표 형식으로 반환해 텍스트 추출 시 비어 나옴("나. 그 밖의 주택" 다음에 아무 숫자도 없이 바로 다음 조문으로 넘어감) — `WebFetch`로 law.go.kr/casenote.kr/easylaw.go.kr 직접 접근은 전부 403으로 막혀, `WebSearch`로 다중 독립 출처(세무 뉴스, 계산기 사이트, 지자체 안내 페이지)를 교차검증해 표준세율(0.1/0.15/0.25/0.4%)·특례세율(0.05/0.1/0.2/0.35%)·2026년 한정 공정시장가액비율(43/44/45%)을 확정. **팜플렛과의 불일치를 직접 발견**: 팜플렛 하단 "세부담 상한(직전연도 재산세액 상당액 대비 105~130%)" 절은 시행령 §109의2(현재 유효, "과세표준상한액=직전연도 과세표준상당액+5%")와 다른 제도임을 확인 — 2024년 세법개정으로 "재산세액 기준" 세부담상한제가 "과세표준 기준" 과세표준상한제로 대체됐다는 사실을 재확인, **사용자가 준 자료를 그대로 베끼지 않고 법령 원문 기준으로 정정**해 반영. |
| 설계 | 스코프를 의도적으로 "주택분만"으로 좁혔다 — 토지·건축물·선박·항공기, 지역자원시설세(소방분, 팜플렛에 별도 표로 있었으나 OCR 정확도상 위험 판단 + 니치한 대상이라 제외)는 화면에 "다음 업데이트 예정"으로 명시하고 구현하지 않음(하드룰: 미구현을 완료된 것처럼 보이지 않는다). 1세대1주택 판정(시행령 §110의2)은 종업원 임대주택·미분양·어린이집·문화유산·상속 5년이내·혼인 5년이내·인구감소지역 특례 등 12개 예외 호가 있어 앱이 자동 판정하면 오히려 위험하다고 판단 — 사용자가 스스로 체크하게 하고, 계산기는 그 입력을 신뢰해 세율·비율만 계산한다(기존 `EstimatedIncome`이 "복식부기의무자 여부"를 자동판정하지 않고 사용자 선택에 맡기는 것과 같은 원칙). 기존 `estimatorPanelHtml`(추계소득 계산기, 0.19)의 실시간 재계산 UX 패턴(입력 이벤트 → 순수함수 재호출 → DOM 갱신)을 그대로 재사용해 신규 UI 패턴을 만들지 않았다. |
| 구현 | `PropertyTax`(index.html, `EstimatedIncome` 바로 뒤) — `STANDARD_BRACKETS`/`SPECIAL_BRACKETS`(누진공제 방식 세율표), `fairMarketRatio()`, `bracketsFor()`, `progressiveTax()`, `calculateHousing()` 순수 함수. `NAV_ITEMS`에 새 그룹 `계산기`(항목 1개 `propertyTax`) 추가 — 화면 캡처의 파란 원 위치(가이드 바로 아래)에 정확히 렌더링됨. `renderPropertyTaxCalculator()` + `propertyTaxPanelHtml()`, `bindViewEvents()`에 `ptMarketValue` 등 실시간 재계산 배선. `AUTO_SYNC_UNSAFE_ROUTES`에 `propertyTax` 추가 — 0.40에서 고친 것과 같은 클래스의 버그(자유 입력 화면에서 배경 동기화가 렌더를 갈아엎어 입력값이 사라짐)를 신규 화면에서 재도입하지 않기 위해 같은 세션에서 바로 적용했다. |
| 실버그 발견·수정 (배포 전) | 경계 연속성 로직 테스트(아래 검증 항목)를 작성해 실행하자 `SPECIAL_BRACKETS`(1세대1주택 특례세율)의 1억5천만원~3억원 구간 누진공제 상수가 120,000원으로 잘못 입력돼 있었음이 실제로 드러남(150,000,000원 경계에서 세액이 60,000원 끊기는 불연속 발견) — 손으로 다시 유도해 정답이 180,000원임을 확인하고 즉시 수정. 그 외 세 가지 손검증 시나리오(3억원 1세대1주택, 1억원 일반주택, 10억원+상한적용)는 이 버그가 걸리지 않는 구간이라 처음부터 정답이었다 — **경계값 테스트가 없었다면 이 오타가 그대로 배포될 뻔했다**는 걸 보여주는 사례. |
| 검증 | 로직 테스트 +24(총 138) — `api.PropertyTax`를 VM 샌드박스에서 직접 호출(순수 함수라 mock 불필요, DOM/IndexedDB 의존 없음): 공정시장가액비율 경계(3억/6억, 9억 초과도 특례 유지), 세율표 선택 경계(9억원, 1세대1주택 여부), 모든 누진공제 구간 경계(6천만/1억5천만/3억)에서 표준·특례 두 세율표 모두 세액 연속성(1원 이내) 확인, 손으로 계산한 3개 시나리오(3억원 1세대1주택→299,400원, 1억원 일반주택→156,000원, 10억원+낮은 전년도 과세표준→과세표준상한 적용 1,243,500원), 상한 미적용(직전연도 값 없음)·도시지역분 미포함·시가표준액 0원 경계. `npm run harness:check` 12/12 Required 통과(`legal-ssot-contract`는 기존 BookkeepingDuty/ExpenseRateMethod만 검사해 무관, 통과 유지). 헤드리스 Chromium 8/9(콘솔 에러 1건은 앱에 `<link rel="favicon">`이 아예 없어 브라우저가 자동 요청하는 `/favicon.ico` 404 — 앱 로직과 무관, 기존 CDN 차단과 같은 성격의 환경 노이즈): 나브 항목 정확히 1개, 화면 렌더링, 3억원 1세대1주택 계산이 로직 테스트 값과 정확히 일치(299,400원), 1세대1주택 체크 해제 시 즉시 60%·표준세율표로 재계산, 도시지역분 체크 해제 시 0원, 과세표준상한액 적용 시 "(과세표준상한액 적용)" 문구 노출을 실제 DOM에서 확인. |
| 정확성(North Star) | 사용자가 준 1차 자료(팜플렛)를 무비판적으로 베끼지 않고 법령 원문과 대조해 폐지된 제도(구 세부담상한제)를 걸러냈다. `get_law_text`의 표 추출 실패를 발견하고 즉시 다중 출처 교차검증으로 대체했다(단일 출처 실패를 그대로 방치하지 않음). "검토용" 배지와 "다음 업데이트 예정" 범위 안내로 미구현 부분을 숨기지 않았다. |
| 남은 위험/미완(0.42) | 1. `EstimatedIncome`(§3, 국세청 작성사례로 원 단위까지 대조)과 달리 재산세는 공식 계산 사례를 구하지 못해 **내부 일관성 검증만** 했다(경계 연속성 + 손계산) — 진짜 고지서와의 오차 가능성이 추계소득 계산기보다 크다. 2. 토지·건축물·선박·항공기, 지역자원시설세(소방분)는 미구현. 3. 1세대1주택 특례세율(§111의2)은 2021~2026년 한시 규정 — 2027년 이후 연장되지 않으면 이 부분을 재검토해야 한다(시행령 §109의 2026년 한정 공정시장가액비율 43/44/45%도 마찬가지). 4. 1세대1주택 여부는 사용자 자가판단을 그대로 신뢰하므로, 실제로는 아닌데 체크하면 잘못된 낮은 세액이 나온다(화면에 안내는 있으나 검증은 안 함). |
| 스킬 버전 | `Sub_app-research-notes_0.56` |

## 2026-07-15 앱 0.43: 재산세 계산기 공유 지분율 + 실제 고지서 검증

| 항목 | 내용 |
|---|---|
| app_version | 0.42 → 0.43 |
| note_type | `feature` + `bugfix`(id 중복) |
| 제목 | 사용자가 제공한 실제 재산세 고지서로 0.42 계산기를 대조 → 반올림 오차 이내로 정확히 일치 확인, 그 과정에서 발견한 "공유 지분율" UX 갭을 메움 |
| 배경 | 0.42 배포 보고 직후 사용자가 실제 서울시 이택스(etax.seoul.go.kr) "2026년 7월 재산세(주택1기분)" 고지서 사진을 업로드하며 "이게 실제고지서야. 차이 보장해보자. 1주택자 재산세이고 동일지분 공동명의 2인 주택이야" 요청 |
| 대조 방법 | 고지서는 연 2회 분납의 1기분(상반기 절반)이라 2배로 환산해 연간 금액으로 맞춤. 지방세법 §107(재산세 납세의무자)를 새로 조회 — ①1호 "공유재산인 경우: 그 지분에 해당하는 부분에 대해서는 그 지분권자"와, 유사 사례인 ①2호(건물·부속토지 소유자가 다른 경우 "그 주택에 대한 산출세액을... 시가표준액 비율로 안분계산")를 근거로, **공유 재산은 과세표준·세율을 물건 전체 기준으로 한 번 계산한 뒤, 그 산출세액만 지분율로 나누는 것이 원칙**임을 확정(과세표준 자체를 먼저 지분만큼 쪼개 세율 구간을 다시 매기지 않음 — 이 구분이 정확도에 크게 영향을 준다). 처음엔 고지서의 "재산세과표: 610,605,000원"을 (과세표준상한이 적용되지 않았다고 가정하고) 1세대1주택 특례 공정시장가액비율(6억 초과 구간, 45%)로 나눠 시가표준액을 역산했다(610,605,000÷0.45=1,356,900,000원, 나머지 없이 정확히 떨어짐). 이어지는 대화에서 사용자가 부동산공시가격 알리미 화면(이 주택의 실제 공동주택가격: 2026.1.1기준 1,578,000,000원, 2025.1.1기준 1,278,000,000원)을 제시하며 "이거랑 왜 달라요?" 질문 — 확인해보니 "나머지 없이 딱 떨어졌다"는 건 상한이 없다고 가정했을 때만 성립하는 우연이었고, 실제 시가표준액은 전혀 다른 값이었다. **정정**: 실제 raw 과세표준(1,578,000,000×45%=710,100,000원)은 고지서 과표보다 크다 — 즉 **과세표준상한액(시행령 §109의2, 직전연도+5%)이 실제로 발동**한 것이었다. 상한 공식을 거꾸로 풀면 필요한 직전연도 과세표준상당액은 575,100,000원인데, 이는 2025년 공시가격(1,278,000,000원)에 같은 45% 비율을 곱한 값과 정확히 일치해 정합성을 재확인했다. 실제 공시가격 + 직전연도 과세표준으로 `PropertyTax.calculateHousing()`을 다시 실행해도 과세표준은 처음과 똑같이 610,605,000원이 나온다(시가표준액이 9억원을 넘어 특례세율이 아니라 표준세율표가 적용됨은 변함없음). 즉 **최종 세액 계산 자체는 처음부터 맞았지만, "왜 그 과세표준이 나왔는지"에 대한 설명이 틀렸었다** — 상한 미적용 우연한 나눗셈 일치를 상한 검증 없이 "확인됨"이라고 단정한 것이 문제였다. |
| 대조 결과 | 물건 전체 연간 계산 결과를 50%로 나눈 값과 고지서의 연간(1기×2) 실측값을 비교: 재산세 본세 906,210원(예측) vs 906,200원(실측, 차이 10원) · 도시지역분(전자송달 공제 전) 427,424원 vs 427,420원(차이 4원) · 지방교육세 181,242원 vs 181,240원(차이 2원). 전부 반올림 오차 수준(0.001% 이내)으로 정확히 일치. 남은 차이도 전부 원인이 분명했다 — 800원은 "도시지역분 전자송달·자동이체 공제"(세법 계산이 아닌 서초구의 행정 할인, 계산기 스코프 밖이 맞음), 지역자원시설세(소방분) 31,740원은 이미 화면에 "다음 업데이트 예정"으로 명시된 미구현 항목. |
| 발견한 갭 | 계산기가 "물건 전체" 결과만 보여줘, 이 사용자처럼 공동명의인 경우 본인 몫을 알려면 수동으로 시가표준액을 역산하고 지분율을 곱해야 했다 — 실사용 대조 과정에서 드러난 진짜 UX 문제. 필자가 "공유 지분율 입력을 추가하자"고 제안 → 사용자 "진행하죠" 승인. |
| 구현 | `PropertyTax.calculateHousing()`에 `ownershipShare` 파라미터 추가(0~1, 생략 시 1=100%로 clamp, 범위를 벗어나면 [0,1]로 clamp). 과세표준·세율 판정(`fairMarketRatio`/`bracketsFor`/`progressiveTax`)은 지분율과 완전히 무관하게 그대로 물건 전체 기준으로 계산하고, 그 결과(`wholePropertyTax`/`wholeUrbanAreaLevy`/`wholeLocalEducationTax`/`wholeTotal`)를 반환값에 남긴 채, 최종 3개 세목(`propertyTax`/`urbanAreaLevy`/`localEducationTax`)에만 지분율을 곱한다 — 법령이 요구하는 "세액만 안분" 원칙을 코드 구조 그대로 반영. 화면에 "공유 지분율(%)" 입력(기본 100) 추가, 지분율이 100% 미만일 때만 "물건 전체 재산세 합계"·"공유 지분율" 행과 각 세목에 "· 내 지분 몫" 라벨을 조건부로 노출해, 단독소유 사용자(대다수)는 기존 화면과 완전히 동일하게 유지했다(0.42 화면 변경 없음, 회귀 없음). |
| 실버그 발견·수정 (헤드리스 검증 중) | 지분율 표시용 출력 `<strong id="ptShare">`와 지분율 입력용 `<input id="ptShare">`가 **같은 id를 공유**하고 있었다(무효 HTML) — 헤드리스 테스트에서 `#ptShare`의 textContent를 읽었더니 빈 문자열이 나와 실제로 지분율 표시행이 렌더링되지 않는다는 걸 발견. 출력 요소의 id를 `ptShareOut`으로 분리해 수정. 0.42 릴리스에는 이 입력 요소 자체가 없었으므로 신규 코드에서 바로 잡은, 실제로 배포될 뻔한 버그. |
| 검증 | 로직 테스트 +11(총 149, 아래 정정 항목 포함): `ownershipShare` 생략 시 기존 단독소유 결과와 완전히 동일(회귀 없음), `wholeTotal`이 지분율과 무관하게 항상 물건 전체 계산과 일치, 50% 지분이 정확히 절반(반올림), 지분율 1 초과·음수의 clamp, 그리고 **실제 공시가격·직전연도 과세표준을 입력값으로 쓴 이 고지서 시나리오 자체를 오라클 테스트로 고정**(과세표준상한액 발동을 `capApplied===true`로 명시 확인, 재산세과표 610,605,000원 정확 일치, 표준세율표 선택 확인, 3개 세목 전부 10원 이내 일치를 코드로 잠금 — 향후 이 계산 로직에 손대면 이 테스트가 회귀를 잡는다). `npm run harness:check` 12/12 Required 통과. 헤드리스 Chromium 8/9(콘솔 에러 1건은 기존과 동일한 파비콘 404, 앱 로직과 무관): 지분율 기본값 100 확인, 고지서 시나리오(1세대1주택 체크 + 지분율 50) 입력 시 화면에 표시되는 과세표준·재산세 본세가 로직 테스트 예측치와 정확히 일치, 지분율 50%일 때 "50%" 표시행과 "내 지분 몫" 라벨이 실제로 뜸, 100%로 되돌리면 둘 다 사라짐(단독소유 UX 원복) 확인. |
| 정확성(North Star) | 0.42에서 정직하게 남겨뒀던 위험("국세청 공식 계산 사례로 대조하지 못함")을 이번에 사용자가 제공한 실제 사례로 실제로 해소했다 — 추측이나 근사가 아니라 실측값과 10원 단위까지 대조해 확인했고, 남은 차이(800원 행정 할인, 지역자원시설세 미구현)도 전부 원인을 밝혀 "왜 다른지 모르는 차이"를 남기지 않았다. |
| 남은 위험/미완(0.43) | 1. 지역자원시설세(소방분)·토지·건축물·선박·항공기는 여전히 미구현. 2. 1세대1주택 특례세율(§111의2)의 2027년 이후 연장 여부는 여전히 미확인(2021~2026 한시 규정). 3. 공유 지분율 입력은 여전히 사용자 자가입력(등기부 확인은 앱이 하지 않음) — 3인 이상 공유, 지분이 균등하지 않은 경우도 이 입력 하나로 커버되지만(단순 비율 곱이므로), 실제로 다인·비균등 지분 사례로는 아직 검증하지 못했다(이번 검증은 2인 동일지분 사례 1건뿐). |
| 스킬 버전 | `Sub_app-research-notes_0.57` |

## 2026-07-15 앱 0.44: 재산세 계산기 계산 과정 설명 + 공시가격 입력 시점 안내

| 항목 | 내용 |
|---|---|
| app_version | 0.43 → 0.44 |
| note_type | `feature` |
| 제목 | 계산기 결과 아래에 계산 과정을 문장으로 보여주고, 공시가격 입력칸에 "언제 기준 값을 넣어야 하는지" 안내를 추가 |
| 배경 | 0.43 완료 보고 후 사용자 "계산과정을 계산기 결과 밑에 보여주면 좋을 거 같아요. 당신 생각은?" — 탐색적 질문이라 짧게 추천과 트레이드오프만 제시: 찬성(0.43에서 실제 고지서를 대조할 때도 결국 손으로 계산 단계를 하나하나 풀어야 했다는 근거), 트레이드오프(수식을 그대로 나열하면 복잡해 보이니 문장 위주로). 사용자 "진행하고 첫 공시가격을 입력할 때 언제 가격을 입력해야 하는지 안내문구 넣는것도 포함해서 진행하죠" — 두 요청을 한 번에 승인 |
| 조사 | 공시가격 입력 시점 안내를 정확히 쓰기 위해 부동산 가격공시에 관한 법률 §18(공동주택가격의 조사·산정 및 공시 등)과 그 시행령 §43①을 법령 MCP로 새로 조회. §43①: "국토교통부장관은 매년 4월 30일까지 공동주택가격을 산정·공시하여야 한다"(정기), 신축 등으로 없는 경우 그 해 9월 30일까지(추가) — 사용자가 이전에 제시한 부동산공시가격 알리미 화면 자체에도 "(정기공시) 매년 1월1일 기준 공시", "(추가공시) 매년 6월1일 기준으로 1.1~5.31 기간중 신축등으로 발생한 공동주택 공시"라고 적혀 있어 상호 일치 확인. 재산세 과세기준일(지방세법 §114, 매년 6월 1일)엔 그 해 1월 1일 기준 공시가격이 이미(늦어도 4월 30일까지) 확정돼 있으므로, "그 해 재산세엔 그 해 1월 1일 기준 공시가격을 넣는다"는 안내를 근거를 갖춰 확정. www.realtyprice.kr(부동산공시가격알리미) 도메인은 하드룰(URL을 추측하지 않는다)에 따라 임베드 전 WebSearch로 다중 출처 교차검증했다. |
| 구현 | `propertyTaxStepsHtml(input, res)` 신설 — 새로 계산하지 않고 `PropertyTax.calculateHousing()`이 이미 반환한 중간값(`rawTaxBase`/`taxBase`/`capApplied`/`appliedRateTable`/`wholePropertyTax`/`wholeUrbanAreaLevy`/`wholeLocalEducationTax`/`ownershipShare` 등)만 읽어 번호 붙은 문장으로 서술한다 — 요약 패널과 계산 과정이 서로 다른 계산 경로를 타지 않아 숫자가 어긋날 수 없는 구조로 설계했다. 단계: ①공시가격×공정시장가액비율=원시 과세표준 ②과세표준상한액이 실제로 발동했으면 그 사실과 낮아진 값을 설명(조건부, `capApplied` 기준) ③세율표 적용해 재산세 본세 ④도시지역분(포함 안 함이면 그 사실만) ⑤지방교육세(본세의 20%) ⑥지분율이 100% 미만이면 "지금까지는 집 전체 기준"이라고 명시하고 지분 몫으로 줄어드는 과정(조건부) ⑦합계. `propertyTaxPanelHtml()`이 `input`도 받도록 시그니처 변경(초기 렌더 1곳, `ptRecalc` 핸들러 1곳 — 총 2개 호출부 갱신). 공시가격 입력칸에 field-help로 조사 내용 그대로 반영. `.calc-steps`(둥근 배경 박스)·`.calc-step`(줄 단위 flex)·`.calc-step-num`(원형 번호 배지) CSS 3개 신설 — 기존 `.est-out`/`.est-row` 시각 언어(연한 배경, 얇은 테두리)를 그대로 재사용해 새 디자인 언어를 만들지 않았다. |
| 검증 | 로직 테스트 149 유지 — `PropertyTax` 순수 계산 함수 자체는 무변경(계산 과정 문구는 UI 렌더링 함수라 `DOMAIN_GUARDIANS`/`GOVERNANCE_AGENTS`처럼 도메인 로직 테스트 대상이 아니라는 기존 관례를 그대로 따름, 헤드리스로 실제 렌더 결과를 검증). `npm run harness:check` 12/12 Required 통과. 헤드리스 Chromium 8/8: 공시가격 입력칸 밑에 "1월 1일 기준"·"4월 30일"·"realtyprice.kr"이 모두 포함된 안내문구가 실제로 렌더링됨을 확인, 0.43의 실제 고지서 시나리오(공시가격 1,578,000,000원 + 1세대1주택 체크 + 직전연도 과세표준 575,100,000원 + 지분 50%)를 계산기에 그대로 입력했을 때 계산 과정 문장에 "과세표준상한액"이라는 단어와 정확히 캡핑된 과세표준(610,605,000원)이 등장하고, 지분율 단계에 "50%"가 등장하며, 계산 과정 마지막 줄의 합계 숫자가 위 요약 패널(`#ptTotal`)의 합계와 정확히 일치함을 DOM에서 직접 확인 — 계산 과정 설명과 요약 패널이 서로 다른 숫자를 보여주는 사고가 구조적으로 불가능함을 실증했다. |
| 정확성(North Star) | "계산 과정을 보여주자"는 아이디어를 그냥 수식으로 나열하지 않고, 지난 0.43에서 실제로 사용자와 함께 손으로 검증했던 바로 그 절차(비율 적용→상한 확인→세율→부가세목→지분)를 그대로 문장화했다 — 새로 지어낸 설명이 아니라 이미 검증된 절차를 사용자가 매번 볼 수 있게 만든 것. 공시가격 입력 시점도 추측하지 않고 법령 원문(부동산 가격공시법 §18·시행령 §43①)을 직접 조회해 근거를 갖췄다. |
| 남은 위험/미완(0.44) | 계산 과정 설명은 재산세 본세·도시지역분·지방교육세·지분율까지만 다룬다 — 아직 미구현인 지역자원시설세(소방분)·토지·건축물 등은 애초에 계산기 스코프 밖이라 계산 과정에도 등장하지 않는다(범위가 넓어지면 그때 같이 확장해야 함). |
| 스킬 버전 | `Sub_app-research-notes_0.58` |

## 2026-07-15 앱 0.45: 재산세 계산기 "직전연도 과세표준" 입력 출처 안내

| 항목 | 내용 |
|---|---|
| app_version | 0.44 → 0.45 |
| note_type | `feature`(UX 안내, 계산 로직 무변경) |
| 제목 | "직전연도 공시가격을 받아 자동 계산해주면 어떨지" 제안을 검토·반려하고, 대신 기존 "직전연도 과세표준" 입력에 출처 안내를 추가 |
| 배경 | 0.44 완료 보고 후 사용자 "직전년도 공시가격도 입력해야 정확해지지 않아?" — 직전연도 과세표준을 직접 입력받는 대신, 직전연도 "공시가격"을 받아서 계산기가 자동으로 과세표준을 유도(=올해와 같은 비율을 곱함)해주면 더 정확하지 않겠냐는 제안 |
| 판단 | 반려. 이유: 공정시장가액비율은 해마다 다르게 정해지고, 특히 2026년의 1세대1주택 특례 43/44/45%는 시행령 §109①2호 단서가 "2026년도에 납세의무가 성립하는 재산세의 과세표준을 산정하는 경우"라고 못박은 **한시 규정**이다. 작년(예: 2025년)에 이 비율이 그대로 적용됐는지 이 앱은 알 방법이 없다(0.43에서 정황상 45%로 추정했지만 "2025년 법령을 직접 조회해 확정한 것은 아니다"라고 명시적으로 남겨둔 바로 그 불확실성). "직전연도 공시가격 × 올해 비율"을 자동 계산 기능으로 넣으면, 0.43에서 실제로 저질렀던 실수(비율을 가정해 역산 → 우연히 맞아떨어져 확인됐다고 착각 → 나중에 실제 값과 달라 틀렸음이 드러남)를 사용자가 매번 재현하게 만드는 것과 같다고 판단했다. 반면 지금 방식(직전연도 과세표준을 사용자가 직접 입력)은 이미 확정된 정확한 값을 그대로 쓰는 것이라 이런 위험이 없다 — 그리고 그 값은 작년 재산세 고지서의 "재산세과표" 항목에 이미 정확히 적혀 있다(0.43에서 실제 고지서로 이 항목명을 직접 확인했음). 사용자 "직접 입력으로 가자" 승인. |
| 구현 | 계산 로직(`PropertyTax.calculateHousing()`)은 전혀 건드리지 않았다 — 순수 UX 안내문구 추가. "직전연도 과세표준" 입력칸(`#ptPriorTaxBase`)에 field-help 추가: 어디서 구하는지(작년 고지서의 "재산세과표" 항목, 또는 위택스·이택스 조회)와 "공정시장가액비율은 해마다 달라질 수 있어(2026년 1세대1주택 특례처럼 그 해에만 적용되는 값도 있음) 작년 공시가격에 올해 비율을 곱해 직접 계산하면 틀릴 수 있다"는 경고를 명시. |
| 검증 | 로직 테스트 149 유지(계산 로직 무변경이라 회귀 대상 자체가 없음 — 이 사실 자체를 헤드리스로 재확인). `npm run harness:check` 12/12 Required 통과. 헤드리스 Chromium 5/5: 안내문구에 "재산세과표"·"위택스"·"비율... 해마다 달라질 수" 문구가 실제로 노출됨을 확인, 3억원 1세대1주택 계산(합계 299,400원)이 이전 릴리스와 동일해 회귀 없음을 재확인. |
| 정확성(North Star) | "더 편하게 만들자"는 제안이라도, 그게 이 앱이 방금 스스로 저질렀던 실수(연도별로 달라지는 법정 비율을 가정하는 것)를 다시 심는 방향이라면 거절해야 한다는 걸 보여준 사례. 사용자의 좋은 의도(정확도를 높이자)는 받아들이되, 구현 방법은 이미 검증된 더 안전한 경로(정확한 값을 직접 입력)로 안내했다. |
| 남은 위험/미완(0.45) | 없음(이번 변경은 UX 안내문구 추가뿐이라 새 위험을 만들지 않음). 기존 재산세 계산기의 남은 위험(지역자원시설세 미구현, 1세대1주택 특례 한시 규정의 2027년 이후 연장 여부 등)은 그대로 유효. |
| 스킬 버전 | `Sub_app-research-notes_0.59` |

## 2026-07-15 앱 0.46: 재산세 계산기 과세표준상한액 입력을 "직전연도 공시가격"으로 정정

| 항목 | 내용 |
|---|---|
| app_version | 0.45 → 0.46 |
| note_type | `fix`(0.45의 반려 판단이 잘못된 법령 이해에 근거했음을 재조사로 확인하고 정정) |
| 제목 | 0.45에서 반려했던 "직전연도 공시가격 입력"을, 사용자가 원래 의도(과세표준상한 5% 계산용)를 다시 밝힌 것을 계기로 법령 원문 재확인 후 정정 구현 |
| 배경 | 0.45 완료 보고 후 사용자 "그리고 상한한도 5퍼센트 때문에 직전년도 공시가격도 입력하자했던거야" — 애초 제안이 막연한 "더 정확해지지 않냐"가 아니라 **과세표준상한액(시행령 §109의2①) 계산에 필요해서**였다는 것을 명확히 함. |
| 조사 | 지방세법 시행령 §109의2①을 `mcp__…__get_law_text`로 원문 재조회. 조문은 "직전 연도에 해당 재산에 대하여 부과된 재산세의 과세표준이 없는 경우"를 제외하면, 과세표준상한액 계산에 쓰는 "직전 연도 해당 주택의 과세표준 상당액"을 **직전 연도 시가표준액(공시가격)에 "법 제110조제1항에 따른 공정시장가액비율을 곱하여 산정한 금액"**으로 정의하고 있고, 이때 곱하는 공정시장가액비율은 조문 위치·시행령 §109①의 체계상 **과세기준일(=올해) 현재 적용되는 비율**이지 "직전 연도에 그 재산에 실제로 적용됐던 비율"이 아님을 확인했다. 즉 0.45에서 "작년에 어떤 비율이 적용됐는지 이 앱은 알 수 없다"고 반려한 근거 자체가 조문을 잘못 읽은 것이었다 — 애초에 작년 비율을 알 필요가 없는 계산이었다. 0.43에서 검증한 실제 고지서 사례로 재확인: 2025년 공시가격 1,278,000,000원 × 2026년(올해) 비율 45% = 575,100,000원 = 고지서 역산으로 확정했던 "직전연도 과세표준상당액"과 정확히 일치. |
| 구현 | `PropertyTax.calculateHousing()`의 파라미터를 `priorYearTaxBase`(과세표준 직접 입력) → `priorYearMarketValue`(공시가격 직접 입력)로 변경. 내부에서 `prior = Math.round(priorYearMarketValue × ratio)`로 유도(`ratio`는 이미 이번 함수가 올해 시가표준액 기준으로 계산해 둔 바로 그 공정시장가액비율 — 새로 조회하지 않고 재사용해 "항상 올해 비율"이라는 법령 요건을 구조적으로 보장). 유도값을 `priorTaxBaseEquivalent`로 반환해 계산 과정 설명에 노출. `propertyTaxStepsHtml()`에 유도 단계 문장 추가("법령상 작년 실제 비율이 아니라 항상 올해 비율을 씁니다"라고 명시). 입력칸 id를 `#ptPriorTaxBase` → `#ptPriorMarketValue`로, 라벨을 "직전연도 과세표준" → "직전연도 공시가격"으로 변경하고 field-help를 §109의2① 메커니즘 설명으로 재작성(작년 고지서의 과세표준 금액을 그대로 넣지 말라고 경고). `ptRecalc` 핸들러·이벤트 리스너 배열 갱신. |
| 검증 | 로직 테스트 149→151(2건 추가): `r3` 시나리오를 새 시그니처로 재계산해 `priorTaxBaseEquivalent`·`taxBase`·`total` 재확인, `noCap` 시나리오에 `priorTaxBaseEquivalent === null` 케이스 추가. 0.43 오라클 테스트(실제 고지서)를 공시가격 두 해 실값(1,578,000,000원/1,278,000,000원)만 넣는 방식으로 재작성 — `priorTaxBaseEquivalent === 575,100,000`, `capApplied === true`, `taxBase === 610,605,000` 모두 기존 확정치와 정확히 일치함을 재확인(계산 로직은 이미 맞았고, 이번 변경은 "사용자가 무엇을 입력해야 하는가"만 정정한 것이므로 최종 세액에는 회귀가 없어야 하며 실제로 없었다). `node scripts/tests/logic.test.mjs` → 151 passed, 0 failed. `npm run harness:check` 12/12 Required 통과. |
| 정확성(North Star) | 사용자가 몇 턴 전에 낸 제안을 성급히 반려했던 것을, 사용자가 그 제안의 원래 근거(상한 5% 계산)를 다시 짚어준 것을 계기로 법령 원문을 다시 조회해 스스로의 반려 판단이 틀렸음을 확인하고 정정한 사례. "합리적으로 들리는 반려 사유"도 조문 원문 대조 없이 확정해서는 안 된다는 이 세션의 반복되는 교훈(0.43의 우연한 나눗셈 일치 오판과 같은 계열의 실수 — 이번엔 계산이 아니라 판단 단계에서 발생)이 다시 확인됨. |
| 남은 위험/미완(0.46) | 기존 재산세 계산기의 남은 위험(지역자원시설세·토지·건축물 등 미구현, 1세대1주택 특례 한시 규정의 2027년 이후 연장 여부 미확인, 다인·비균등 지분 미검증)은 그대로 유효. 이번 변경으로 새로 생긴 위험 없음(직전연도 과세표준을 사용자가 몰라도 공시가격만 알면 입력 가능해져 오히려 사용자 부담이 줄었다). |
| 스킬 버전 | `Sub_app-research-notes_0.60` |
