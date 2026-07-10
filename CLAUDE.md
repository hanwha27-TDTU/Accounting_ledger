# Accounting Ledger Collaboration Entry Point

이 저장소에서 작업을 시작하기 전에 다음 순서로 문서를 읽는다.

1. `AGENTS.md`
2. `docs/claude-handoff.md`
3. `docs/accounting-ledger-design-directive-v2.md`
4. 요청과 관련된 `docs/skills/` 문서
5. 스키마·화면·상세 설계 문서

## 작업 원칙

- 현재 앱 버전은 `0.02`다. Supabase 공개 연결·익명 RLS 격리·Google provider 사전 진단이 구현되었으며 다음 사용자 영향 변경은 `0.03`이다.
- V1은 단일 HTML과 GitHub Pages를 기준으로 한다. 회계 도메인·저장소·외부 서비스 접근은 분리한다.
- 내부 원장은 복식부기 SSOT다. 간편장부는 입력 UX와 출력 view다.
- 거래, 분개, 계정과목, 세무 매핑, 마감, 리포트 작업은 `docs/skills/accounting-domain-guardians-skill.md`를 먼저 적용한다.
- 단일 HTML 구조, 상태관리, adapter, 오류 처리, 성능, 의존성, 개발자 모드 작업은 `docs/skills/accounting-code-architecture-guardians-skill.md`를 먼저 적용한다.
- 동기화에는 `id`, `created_at`, `updated_at`, `deleted_at`과 `canonical_version` 규칙을 유지한다.
- Google OAuth allowlist와 Supabase RLS를 유지한다. `hanwha27@gmail.com`은 bootstrap owner다.
- service role key, Cloudinary secret, OAuth client secret을 코드·문서·커밋에 넣지 않는다.
- 법정서식은 최신 스냅샷 검증 없이는 확정 출력으로 표시하지 않는다.
- 참고용 Excel·PDF·ZIP 원본은 명시적 요청 없이는 Git에 추가하지 않는다.
- 사용자가 “배포해주세요”라고 하면 검증, 필요한 커밋, main 반영, 원격 push, 가능한 호스팅 배포, Claude 인수인계 메시지 작성을 포함해 진행한다.

## 검증 절차

1. 작업 전 `git status --short`, `git diff --stat`, `git diff`로 기존 상태를 확인한다.
2. 관련 코드와 테스트를 찾고 짧은 작업 계획을 세운다.
3. 수정 후 관련 검사를 실행하고, 실패를 재현한 뒤 최소 수정으로 해결한다.
4. `npm run harness:check`를 실행한다.
5. 최종 `git diff --check`와 변경 파일을 검토한다.

Required 게이트가 모두 통과하지 않으면 완료를 선언하지 않는다. 기존 실패, 신규 실패, 환경 의존 실패, 실행 불가, 수동 확인 필요를 구분해 보고한다. 검사 자체가 잘못되었다는 근거가 없으면 validator·기대값·CI를 약화하지 않는다.

## 작업 완료 시

1. 변경 파일, 핵심 변경, 데이터·보안 영향, 실행한 명령과 게이트별 결과, 남은 위험을 보고한다.
2. 중요 설계·스키마·보안·마이그레이션 변경은 연구노트와 `docs/claude-handoff.md`를 함께 갱신한다.
3. 의도한 파일만 커밋한다. 원격 push·배포는 사용자가 명시적으로 요청한 경우에만 수행한다.

세부 현황과 인수인계 형식은 `docs/claude-handoff.md`를 기준으로 한다.
