> **Sub_development-governance_0.04** · 개정 2026-07-11

# Accounting Ledger Development Governance Skill

이 문서는 회계장부 앱의 기능 추가, 버그 수정, 데이터 구조 변경, 보안 변경, 배포 전 검토에 적용하는 공통 개발 운영 스킬이다. 개별 기능 스킬보다 먼저 적용해 작업 범위, 데이터 호환성, 보안, 검증, 버전 기록을 하나의 흐름으로 관리한다.

## 핵심 원칙

1. 역할은 화면에 노출되는 앱 기능이 아니라 개발 품질을 위한 검토 관점이다.
2. 작은 UI 문구 수정이 아닌 모든 기능 변경은 계획, 구현, 검증, 검토, 릴리스 기록을 남긴다.
3. 회계 원장, 세무 판정, 권한, 동기화, 증빙, 법정서식 변경은 일반 변경보다 높은 게이트를 통과해야 한다.
4. 코드는 단일 HTML이어도 도메인 계약, 저장소 계약, UI 상태를 분리해 다룬다.
5. 앱 버전은 `0.00`에서 시작해 사용자 영향이 있는 확정 변경마다 `0.01`씩 증가한다.
6. 기능 스킬은 각자의 `Sub_<name>_<version>` 체계를 유지하고, 변경 시 연구노트에 연결한다.
7. 배포본은 문서·스키마·앱 동작이 서로 모순되지 않는 상태만 허용한다.

## 역할 체계

| 역할 | 책임 | 적용 수준 | 반드시 남길 산출물 |
|---|---|---|---|
| Repository Mapper | 저장소 구조, 의존성, SSOT, 변경 영향 파악 | 필수 | 영향 받는 파일·데이터·문서 목록 |
| Planner | 요구사항을 작업 단위, 완료 조건, 제외 범위로 분해 | 필수 | 구현 순서와 검증 기준 |
| Implementer | 승인된 범위 안에서 코드·문서·마이그레이션 변경 | 필수 | 최소 범위 diff |
| Test Engineer | 정상·오류·경계·회귀 시나리오 실행 | 필수 | 실행 결과와 미검증 항목 |
| Reviewer | 회귀, 중복, 구조 위반, 과도한 변경 검토 | 필수 | 발견사항 또는 이상 없음 기록 |
| Schema/Contract Guardian | DB 스키마, IndexedDB, import/export, API, 도메인 계약 호환성 검토 | 매우 권장 | 계약 변경표와 호환성 판단 |
| UI/UX Reviewer | 반응형, 접근성, 입력 오류, 로딩·빈 상태·오프라인 상태 검토 | 권장 | 화면별 상태 확인 결과 |
| Security Reviewer | 비밀키, 인증, 권한, 입력 검증, RLS, 파일 업로드 검토 | 매우 권장 | 보안 체크 결과 |
| Migration Agent | Supabase·IndexedDB·localStorage·백업 데이터의 이전/복원 경로 검토 | 매우 권장 | 마이그레이션·롤백·복구 계획 |
| Release Manager | 앱·스킬 버전, 연구노트, 변경 이력, 배포 전 게이트 확인 | 필수 | 릴리스 체크리스트와 버전 기록 |
| Debugger | 실패 재현, 원인 최소화, 수정, 재검증 | 필수 | 재현 조건·원인·수정 검증 |
| Simplifier | 동작을 유지하면서 불필요한 복잡성·중복 제거 | 선택 | 제거 또는 유지 근거 |

## 역할을 적용하는 방법

역할별로 별도의 자동 에이전트를 항상 실행하지 않는다. 변경 성격에 따라 필요한 관점을 순서대로 적용하고, 결과는 연구노트·PR·커밋·릴리스 체크리스트 중 적절한 장소에 짧게 남긴다.

| 변경 유형 | 최소 적용 역할 | 추가로 반드시 적용할 역할 |
|---|---|---|
| 화면 문구·스타일만 수정 | Mapper, Planner, Implementer, Test, Reviewer, Release | UI/UX |
| 거래 입력·자동분개·리포트 변경 | 위 전체 | Schema/Contract, UI/UX, Security |
| Supabase 테이블·RLS·Auth 변경 | 위 전체 | Schema/Contract, Security, Migration |
| IndexedDB·동기화·백업 변경 | 위 전체 | Schema/Contract, Migration, Security |
| Excel import/export 변경 | 위 전체 | Schema/Contract, Migration, UI/UX |
| Cloudinary 증빙 업로드 변경 | 위 전체 | Security, Schema/Contract, UI/UX |
| 법정서식·세법 규칙 변경 | 위 전체 | Schema/Contract, Migration, Security |
| 오류 수정 | Mapper, Debugger, Implementer, Test, Reviewer, Release | 영향 범위에 따른 추가 역할 |
| 배포 | Mapper, Test, Reviewer, Release | Security, UI/UX |

## 표준 작업 흐름

```mermaid
flowchart LR
  A["요구사항"] --> B["Mapper: 영향 파악"]
  B --> C["Planner: 범위·완료 기준"]
  C --> D["Guardian: 계약·보안·이전 검토"]
  D --> E["Implementer: 최소 변경"]
  E --> F["Test: 정상·실패·회귀"]
  F --> G["Reviewer/UI: 구조·사용성 검토"]
  G --> H["Release: 버전·연구노트·배포 게이트"]
```

### 변경 전

1. 현재 브랜치, 작업 트리, 기존 변경사항을 확인한다.
2. SSOT가 되는 데이터와 변경되는 계약을 확인한다.
3. 관련 스킬 문서, 설계 문서, 마이그레이션, 연구노트를 읽는다.
4. 완료 조건과 테스트 기준을 먼저 적는다.
5. 데이터·권한·동기화가 걸리면 Schema/Contract Guardian, Security Reviewer, Migration Agent를 계획에 포함한다.
6. 다른 AI에게 인수인계하거나 받은 결과를 반영하면 `CLAUDE.md`와 `docs/claude-handoff.md`를 기준으로 협업 상태를 확인한다.
7. 기존 검사가 있으면 재사용하고, 없으면 `npm run harness:check`의 Required/Baseline/Manual 구분을 따른다.

### 구현 중

1. 기존 구조와 어댑터 경계를 존중하고, 범위 밖 리팩터링을 섞지 않는다.
2. 계정과목, 분개 규칙, 세무 판정, 법정서식 버전은 숨은 상수로 두지 않고 관리 가능한 데이터·규칙으로 둔다.
3. 모든 동기화 대상 레코드에는 `id`, `created_at`, `updated_at`, 필요 시 `deleted_at`을 유지한다.
4. `이 기기 → 클라우드`는 단순 upsert가 아니라 `canonical_version`을 올려 최종본을 지정하는 동작으로 구현한다.
5. 브라우저와 외부 서비스 접근은 adapter를 통해 수행한다.
6. service role key, Cloudinary API secret, OAuth client secret을 HTML·IndexedDB·localStorage·Git 저장소에 넣지 않는다.

### 검증 및 검토

| 영역 | 최소 검증 |
|---|---|
| 회계 | 차변 합계와 대변 합계 일치, 원천거래와 전표 연결, 수정·취소 이력 |
| 세무 | 분류 근거·기준일·규칙 버전 표시, 확정신고 자동제출 없음 |
| 동기화 | 최신 `updated_at` 선택, tombstone 반영, canonical 변경 시 클라우드 기준 수렴, batch 응답 `res.ok` 확인 |
| 데이터 이전 | 구버전 로컬 데이터, 빈 데이터, 부분 실패, 재실행 안전성, 복원 경로 |
| 보안 | Google allowlist, RLS, owner 권한, 입력 검증, 비밀키 부재 |
| 증빙 | 이미지/PDF 형식·크기·실패 상태·거래 연결·권한 없는 URL 노출 여부 |
| UI | 데스크톱·모바일, 키보드 사용, 오류·로딩·빈 상태, 긴 한국어 텍스트 |
| 리포트 | 법정서식 스냅샷 확인 없이는 확정 출력 차단, Excel/PDF 결과 검토 |

### 릴리스 전 게이트

아래 항목은 앱 버전을 올리거나 GitHub Pages에 배포하기 전에 모두 확인한다.

| 게이트 | 통과 기준 |
|---|---|
| 범위 | 구현 내용이 계획된 범위와 일치하고 제외 기능을 완료된 것처럼 보이지 않음 |
| 계약 | Supabase·IndexedDB·import/export 계약 변경과 이전 전략이 문서화됨 |
| 보안 | RLS 유지, 권한 정책 검토, 비밀키·개인정보가 저장소에 없음 |
| 테스트 | 핵심 시나리오가 통과하고 실패한 항목 또는 미실행 사유가 기록됨 |
| UX | 작은 화면과 상태 화면에서 입력·오류·동기화 상태를 확인함 |
| 문서 | 관련 스킬·설계 문서·연구노트가 현재 동작과 일치함 |
| 버전 | 앱 버전은 `0.01` 증가, 관련 스킬 버전은 변경 시 증가 |
| Git | 의도한 파일만 커밋, 참고 원본·키·개인정보는 제외, 원격 push 결과 확인 |

## 연구노트 기록 형식

중요 변경은 `app_research_notes`와 `docs/accounting-ledger-app-research-notes.md`에 다음 정보를 남긴다.

| 항목 | 기록 내용 |
|---|---|
| app_version | 변경 후 앱 버전 |
| note_type | `design_decision`, `schema_review`, `feature_release`, `security_review`, `migration_review`, `bug_fix` 중 선택 |
| 변경 요약 | 사용자가 체감하는 변화와 내부 변경을 한 문장씩 |
| 적용 역할 | 실제 적용한 역할 목록 |
| 영향 범위 | 코드, 스키마, 로컬 데이터, 동기화, 리포트, 보안 중 해당 항목 |
| 검증 | 통과한 테스트, 미검증 항목, 잔여 위험 |
| 연결 문서 | 바뀐 스킬·설계·마이그레이션·커밋 |

## 변경 금지선

1. 데이터 마이그레이션 계획 없이 동기화 대상의 필드명·의미·삭제 규칙을 바꾸지 않는다.
2. RLS를 제거하거나 `authenticated` 전체 접근 정책으로 단순화하지 않는다.
3. 법정서식의 최신 확인 없이 확정 신고용 출력이라고 표시하지 않는다.
4. 참고용 Excel·PDF·ZIP 원본을 저장소에 무심코 포함하지 않는다.
5. 사용자 데이터가 있는 상태에서 원본 삭제·테이블 재생성·강제 동기화를 실행하지 않는다.
6. 단일 HTML이라는 이유로 비밀키나 관리자 권한을 클라이언트에 두지 않는다.

## 관련 스킬

| 스킬 | 함께 적용할 상황 |
|---|---|
| `accounting-auth-login-skill.md` | Google OAuth, allowlist, RLS, 권한 변경 |
| `accounting-tax-vat-classification-skill.md` | 사업자 유형, 업종, VAT, 장부의무 판정 |
| `accounting-import-export-skill.md` | 국세청 Excel, JSON, 세무사 전달 패키지 |
| `accounting-income-tax-reporting-skill.md` | 종합소득세 준비자료, 감가상각, 리포트 |
| `accounting-legal-forms-skill.md` | 법령·법정서식 최신성 확인 |
| `accounting-evidence-archive-skill.md` | Cloudinary 증빙 저장·보관 |
| `accounting-app-research-note-skill.md` | 버전·개발 이력 기록 |
| `accounting-mobile-apk-readiness-skill.md` | PWA·APK·모바일 어댑터 |
| `accounting-v1-scope-skill.md` | 1차 범위 판정 |
| `accounting-claude-collaboration-skill.md` | Claude 또는 다른 AI와의 인수인계·결과 반영 |
| `accounting-harness-quality-gate-skill.md` | 실행 가능한 품질 게이트와 CI 운영 |
| `accounting-domain-guardians-skill.md` | 복식부기, 분개, 계정과목, 대사, 마감, 감사, 세무 매핑 검증 |
