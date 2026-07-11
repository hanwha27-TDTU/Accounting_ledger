# Accounting Ledger Collaboration Entry Point

이 파일은 이 저장소에서 일하는 AI(더 저렴한 모델 포함)가 다른 문서를 최소한만 열고도 올바르게 시작·검증·완료하도록 만드는 진입점이다. 상세 계약은 아래 문서를 SSOT로 위임한다. 이 파일에는 다른 곳의 값을 복제하지 않는다.

## 시작 전 읽기 순서

1. `AGENTS.md` — 제품 불변조건, 동기화·보안 규칙, 배포 명령 해석
2. `docs/claude-handoff.md` — 현재 앱 버전·단계·다음 우선순위의 SSOT
3. `docs/accounting-ledger-design-directive-v2.md` — 최상위 요구사항과 앱 목적
4. 요청과 관련된 `docs/skills/` 문서
5. 스키마·화면·상세 설계 문서

문서와 현재 코드가 충돌하면 임의로 한쪽을 따르지 않는다. 최신 사용자 지시 → Git 작업 트리·최신 커밋 → 연구노트 순으로 확인하고 차이를 정리한 뒤 진행한다.

## 앱 목적 (미션)

이 앱은 초등학생도 이해할 만큼 쉬운 화면으로 수입·지출을 관리하면서, 그 기록이 복식부기 SSOT와 최신 법정서식·세법 근거로 뒷받침되어, 사용자가 세무사 없이도 스스로 국세청에 세무사 수준의 최신 법적 신고자료를 만들 수 있게 AI 역량을 총동원해 돕는다. 쉬움과 정확성 어느 하나도 포기하지 않는다. 상세는 `docs/accounting-ledger-design-directive-v2.md`의 `0. 최상위 결론`을 SSOT로 본다.

## 스택과 구조 (요약; SSOT는 설계지침·아키텍처 스킬)

- V1은 단일 HTML(`index.html`) + GitHub Pages다. 빌드 도구가 없고, 외부 CDN은 lucide와 supabase-js만 버전을 고정해 쓴다.
- 저장은 로컬(IndexedDB/localStorage), 클라우드(Supabase Postgres + RLS), 증빙 원본(Cloudinary, 일부 계획)으로 나눈다.
- 내부 원장은 복식부기 SSOT, 간편장부는 입력 UX와 출력 view다.
- 레이어를 분리한다: UI → State → Domain(회계·세무) → Persistence → Remote Adapter → Validation → Report. 회계·세무 판단을 DOM 이벤트 핸들러나 Supabase 호출 안에 직접 섞지 않는다. 상세는 `docs/skills/accounting-code-architecture-guardians-skill.md`.
- 품질 하네스는 `npm run harness:check`(Node, `scripts/harness-check.mjs`)이고, CI는 push/PR에서 같은 명령을 실행한다.

## 하드 룰 (위반하면 작업을 멈추고 사용자에게 확인한다)

- Supabase RLS를 제거하거나 `authenticated` 전체 허용 정책으로 바꾸지 않는다. Google OAuth allowlist와 owner 권한을 약화하지 않는다. `hanwha27@gmail.com`은 bootstrap owner다.
- service role key, Cloudinary secret, OAuth client secret을 코드·문서·커밋·앱 상태에 넣지 않는다.
- 법정서식은 최신 스냅샷 검증 없이 신고용 확정 출력으로 표시하지 않는다.
- 아직 구현하지 않은 기능을 완료된 기능처럼 보이게 하는 UI를 만들지 않는다.
- 참고용 Excel·PDF·ZIP 원본은 명시적 요청 없이 Git에 추가하지 않는다.
- 원격 push, main 반영, 호스팅 배포, 파괴적 DB 작업은 사용자가 명시적으로 요청한 경우에만 한다.
- 동기화 대상 레코드는 `id`, `created_at`, `updated_at`, `deleted_at`을 유지하고 `canonical_version` 규칙을 지킨다. 마이그레이션 계획 없이 Supabase·IndexedDB·백업의 데이터 계약을 바꾸지 않는다.
- SSOT를 중복하지 않는다. 연결 가이드의 주소·이메일·버전·상태는 `APP_INFO`, `GuideService`, 런타임 진단 state에서 읽고, 같은 값을 별도 문장에 하드코딩하지 않는다.

## 먼저 적용할 도메인·코드 스킬

- 거래, 분개, 계정과목, 세무 매핑, 마감, 리포트 작업은 `docs/skills/accounting-domain-guardians-skill.md`를 먼저 적용한다.
- 단일 HTML 구조, 상태관리, adapter, 오류 처리, 성능, 의존성, 개발자 모드 작업은 `docs/skills/accounting-code-architecture-guardians-skill.md`를 먼저 적용한다.

## 버전 규칙 (하네스가 강제한다)

- 현재 앱 버전의 SSOT는 `index.html`의 `APP_INFO.version`과 `docs/claude-handoff.md`다. 이 파일에 버전 번호를 하드코딩하지 않는다.
- `index.html`을 바꾸면 `APP_INFO.version`을 직전 버전에서 정확히 `0.01` 올린다(최초 파일은 `0.01`). `x.99` 다음은 `(x+1).00`이다.
- `UPDATE_HISTORY` 맨 앞에 새 버전 항목을 추가하고, `최신 ·` 마커는 정확히 하나만 둔다(이전 항목의 마커는 제거). 현재 버전 문자열은 파일에 최소 2회 존재해야 한다(`APP_INFO` + `UPDATE_HISTORY`).
- 사용자 영향이 있는 확정 변경에만 버전을 올린다. 문구·문서만 바꾸는 경우 `index.html`을 건드리지 않으면 버전을 올리지 않는다.

## 검증 절차

1. 작업 전 `git status --short`, `git diff --stat`, `git diff`로 기존 상태를 확인한다.
2. 관련 코드를 찾고 짧은 작업 계획을 세운다. 자동 테스트 프레임워크는 없다. 검증은 아래 하네스와 수동 브라우저 체크리스트다.
3. 수정 후 실패를 재현한 뒤 최소 수정으로 해결한다.
4. `npm run harness:check`를 실행한다. Required 게이트가 모두 통과해야 한다.
5. `git diff --check`로 공백 오류가 없는지 확인하고 변경 파일을 검토한다.
6. `index.html`을 바꿨다면 브라우저 라운드트립(하네스의 MANUAL 항목)을 `docs/accounting-ledger-browser-checklist.md`에 따라 실제 브라우저에서 확인하거나, 확인 불가 시 수동 확인 필요로 보고한다.

검사 자체가 잘못되었다는 근거가 없으면 validator·기대값·CI를 약화하지 않는다.

## 완료의 정의 (Definition of Done)

아래를 모두 만족하기 전에는 완료라고 선언하지 않는다.

- [ ] 요청 범위를 충족했고, 범위 밖 리팩터링이나 기존 사용자 변경 되돌리기를 섞지 않았다.
- [ ] `npm run harness:check` Required 실패 0, `git diff --check` 공백 오류 0.
- [ ] `index.html`을 바꿨다면 위 버전 규칙을 지켰다.
- [ ] 하드 룰을 하나도 위반하지 않았다.
- [ ] 중요 설계·스키마·보안·마이그레이션 변경이면 `docs/claude-handoff.md`와 연구노트(`docs/accounting-ledger-app-research-notes.md`)를 같은 작업에서 갱신했다.
- [ ] 의도한 파일만 스테이지·커밋했다. push·배포는 명시 요청이 있을 때만 했다.
- [ ] 보고에 변경 파일, 핵심 변경, 데이터·보안 영향, 게이트별 결과, 남은 위험, 수동 확인 항목을 남겼다. 실행하지 않은 검사를 통과했다고 하지 않는다. 기존 실패, 신규 실패, 환경 의존 실패, 실행 불가, 수동 확인 필요를 구분한다.

## 배포 요청 처리

사용자가 “배포해주세요”라고 하면 검증, 필요한 커밋, main 반영, 원격 push, 가능한 호스팅 배포, Claude 인수인계 메시지 작성까지 포함해 진행한다. 세부 범위는 `AGENTS.md`의 `배포 명령 해석`을 따른다.

세부 현황과 인수인계 형식은 `docs/claude-handoff.md`를 기준으로 한다.
