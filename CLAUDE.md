# Accounting Ledger Collaboration Entry Point

이 저장소에서 작업을 시작하기 전에 다음 순서로 문서를 읽는다.

1. `AGENTS.md`
2. `docs/claude-handoff.md`
3. `docs/accounting-ledger-design-directive-v2.md`
4. 요청과 관련된 `docs/skills/` 문서
5. 스키마·화면·상세 설계 문서

## 작업 원칙

- 현재 앱 버전은 `0.00`이며, 첫 구현 릴리스는 `0.01`이다.
- V1은 단일 HTML과 GitHub Pages를 기준으로 한다. 회계 도메인·저장소·외부 서비스 접근은 분리한다.
- 내부 원장은 복식부기 SSOT다. 간편장부는 입력 UX와 출력 view다.
- 동기화에는 `id`, `created_at`, `updated_at`, `deleted_at`과 `canonical_version` 규칙을 유지한다.
- Google OAuth allowlist와 Supabase RLS를 유지한다. `hanwha27@gmail.com`은 bootstrap owner다.
- service role key, Cloudinary secret, OAuth client secret을 코드·문서·커밋에 넣지 않는다.
- 법정서식은 최신 스냅샷 검증 없이는 확정 출력으로 표시하지 않는다.
- 참고용 Excel·PDF·ZIP 원본은 명시적 요청 없이는 Git에 추가하지 않는다.

## 작업 완료 시

1. 변경 영향, 테스트, 남은 위험을 보고한다.
2. 중요 설계·스키마·보안·마이그레이션 변경은 연구노트와 `docs/claude-handoff.md`를 함께 갱신한다.
3. 의도한 파일만 커밋한다. 원격 push·배포는 사용자가 명시적으로 요청한 경우에만 수행한다.

세부 현황과 인수인계 형식은 `docs/claude-handoff.md`를 기준으로 한다.
