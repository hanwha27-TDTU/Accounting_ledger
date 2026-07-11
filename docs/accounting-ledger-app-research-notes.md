> **📌 Sub_app-research-notes_0.34** · 개정 2026-07-11

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
