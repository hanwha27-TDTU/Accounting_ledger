# Accounting Ledger Agent Instructions

이 저장소의 Codex, Claude, 기타 AI 협업자는 작업 전 `CLAUDE.md`와 `docs/claude-handoff.md`를 읽고, 관련 스킬 문서를 적용한다. 사용자 최신 지시와 Git 작업 트리가 실제 작업 범위의 최종 기준이다.

## 제품 불변조건

- V1은 단일 HTML + GitHub Pages다. 향후 PWA/APK로 확장 가능하게 어댑터 경계를 유지한다.
- 내부 원장은 복식부기 SSOT이며 간편장부는 입력 UX와 출력 view다.
- 앱 버전은 `0.00`에서 시작하고, 확정 사용자 변경마다 `0.01` 증가한다.
- 스킬 문서는 개별 `Sub_<name>_<version>` 체계를 유지한다.
- 중요 설계·스키마·보안·마이그레이션 변경은 연구노트와 Claude handoff를 함께 갱신한다.
- 거래, 분개, 계정과목, 대사, 마감, 감사, 세무 매핑, 리포트 작업은 `docs/skills/accounting-domain-guardians-skill.md`를 적용한다.

## 동기화 불변조건

1. 동기화 대상 레코드에는 `id`, `created_at`, `updated_at`을 둔다.
2. 저장, 수정, 증빙 연결, 삭제, 상태 변경 등 모든 변경에서 `updated_at`을 갱신한다.
3. Supabase pull은 `updated_at desc` 기준으로 수행한다.
4. 같은 `id`가 로컬과 클라우드에 있으면 최신 `updated_at`을 선택한다.
5. 일반 자동 동기화는 병합 후 로컬 전용 변경도 클라우드에 upsert해 다른 기기로 전파한다.
6. `이 기기 → 클라우드`는 단순 upsert가 아니라 해당 기기를 최종본으로 지정하는 동작이다.
7. 최종본 지정 시 `accounting_sync_meta.canonical_version`을 갱신한다.
8. 다른 기기는 canonical version 변경을 감지하면 로컬 전용 항목을 보존하지 않고 클라우드 기준으로 맞춘다.
9. canonical version이 바뀐 경우에는 병합 결과를 다시 업로드하지 않는다.
10. 완전한 삭제 동기화를 위해 `deleted_at` 또는 tombstone을 사용한다.
11. batch upsert는 네트워크 성공 여부뿐 아니라 반드시 `res.ok`를 확인한다.
12. 연결 테스트가 성공하면 단순 표시로 끝내지 말고 즉시 동기화를 실행한다.

## 보안 및 데이터 규칙

- Supabase public 테이블의 RLS를 제거하지 않는다. RLS와 explicit GRANT, 정책을 함께 검토한다.
- `hanwha27@gmail.com`은 bootstrap owner다. Google OAuth allowlist와 owner 권한을 약화하지 않는다.
- service role key, Cloudinary API secret, OAuth client secret, 원본 세무자료를 코드·문서·Git에 넣지 않는다.
- 기존 비회계 Supabase 테이블을 회계 앱 작업 범위로 임의 변경하지 않는다.
- Supabase, IndexedDB, localStorage, JSON 백업, import/export의 데이터 계약은 마이그레이션 계획 없이 변경하지 않는다.
- 최신 법정서식 스냅샷 확인 없이는 확정 세무 리포트로 표시하지 않는다.
- 참고용 Excel·PDF·ZIP 원본은 명시적 요청 없이는 커밋하지 않는다.

## 작업 및 릴리스 규칙

- 작업 전 `git status --short`, `git diff --stat`, `git diff`로 기준선을 확인하고 기존 실패·신규 실패·환경 의존 실패·실행 불가·수동 확인 필요를 구분한다.
- 기존 사용자 변경을 되돌리거나 범위 밖 리팩터링을 섞지 않는다.
- 데이터·권한·동기화·증빙·법정서식 변경에는 Schema/Contract, Security, Migration 관점을 적용한다.
- 변경 후 `npm run harness:check`를 실행한다. Required 게이트가 모두 통과하지 않으면 작업 완료를 선언하지 않는다.
- 실행하지 않은 검사를 통과했다고 보고하지 않는다. 실패·생략·실행 불가·수동 확인 항목을 모두 남긴다.
- 작업 후 변경 파일, 핵심 변경, 스키마·마이그레이션 영향, 실행한 검증 명령과 결과, 잔여 위험, 수동 확인 항목을 남긴다.
- 원격 push, GitHub Pages 배포, 파괴적 DB 작업은 사용자가 명시적으로 요청한 경우에만 수행한다.
