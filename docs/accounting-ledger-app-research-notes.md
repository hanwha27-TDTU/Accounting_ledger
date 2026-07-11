> **📌 Sub_app-research-notes_0.16** · 개정 2026-07-11

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

1. 다기기 삭제 수렴을 위한 `tombstones` pull 처리는 미구현이다. 현재는 삭제 기기의 소프트삭제 행을 `sync_queue` upsert로 클라우드에 반영하는 수준이다.
2. 실제 브라우저에서 부분/일괄 삭제 후 IndexedDB 상태와 동기화 큐, 복원 왕복은 수동 확인이 필요하다.
