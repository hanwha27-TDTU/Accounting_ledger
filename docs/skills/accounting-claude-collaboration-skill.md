> **Sub_claude-collaboration_0.02** · 개정 2026-07-11

# Accounting Ledger Claude Collaboration Skill

이 문서는 Claude 또는 다른 AI 협업자에게 이 앱 작업을 맡기거나 AI가 남긴 결과를 반영할 때의 **협업 절차만** 다룬다. 읽기 순서, 우선순위, 하드 룰, 버전 규칙, 완료의 정의는 중복하지 않고 진입점 `CLAUDE.md`와 `AGENTS.md`를 SSOT로 따른다. 문서와 현재 코드가 충돌하면 임의로 한쪽을 따르지 않고, 최신 사용자 지시 → Git 이력 → 연구노트 순으로 정리한 뒤 진행한다.

## AI에게 맡기기 전

1. 작업 목적, 완료 기준, 제외 범위를 `docs/claude-task-template.md` 형식으로 적는다.
2. 현재 브랜치·커밋·작업 트리 상태를 함께 전달한다.
3. 관련 파일만 지정하되, `CLAUDE.md`, `AGENTS.md`, `docs/claude-handoff.md`는 항상 읽도록 한다.
4. Supabase project ref, publishable key처럼 비밀이 아닌 식별자도 필요한 경우에만 전달한다.
5. service role, Cloudinary API secret, OAuth client secret, 사용자 세무 원본 데이터는 전달하지 않는다.

## AI 결과 수령 및 반영

AI 결과를 그대로 적용하지 않는다. 현재 저장소 기준으로 diff와 검증을 확인한 뒤 반영한다.

| 항목 | 확인 내용 |
|---|---|
| 범위 | 요청한 기능만 바뀌었는지, 보류 기능이 완료된 것처럼 보이지 않는지 |
| 계약 | 스키마, IndexedDB, 동기화, import/export 호환성 |
| 보안 | RLS, allowlist, 입력값, 비밀키 노출 여부 |
| 검증 | `npm run harness:check` Required 통과, 실패 재현·회귀 확인, 수동 브라우저 체크리스트(`docs/accounting-ledger-browser-checklist.md`) 결과 |
| UI | 모바일, 빈 상태, 오류 상태, 긴 한국어 문구 |
| 기록 | 연구노트·인수인계·스킬 버전이 실제 변경과 일치하는지 |

읽기 순서·우선순위, 하드 룰(RLS·비밀키·법정서식·참고자료·원격 push), 버전 규칙, 완료의 정의는 `CLAUDE.md`를 SSOT로 따른다. 이 문서는 그 규칙을 다시 적지 않는다.

## 인수인계 갱신 기준

아래 변경은 `docs/claude-handoff.md`와 연구노트(`docs/accounting-ledger-app-research-notes.md`)를 함께 갱신한다.

- 다음 구현 우선순위 또는 앱 버전 변경
- Supabase 스키마, RLS, Auth, sync 계약 변경
- 법정서식·세무 판정 기준 변경
- Cloudinary 증빙 보관·접근 정책 변경
- 미완료 위험 또는 외부 설정 의존성 변경

문구·스타일만 바꾸는 작은 변경은 인수인계 갱신이 필수는 아니지만, 앱 버전과 릴리스 정책은 개발 운영 스킬(`docs/skills/accounting-development-governance-skill.md`)을 따른다.
