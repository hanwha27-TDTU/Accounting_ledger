> **Sub_claude-collaboration_0.01** · 개정 2026-07-10

# Accounting Ledger Claude Collaboration Skill

이 문서는 Claude 또는 다른 AI 협업자에게 회계장부 앱 작업을 인수인계하거나, AI가 남긴 결과를 현재 작업에 반영할 때 적용한다. 공유 문서의 우선순위, 작업 전 읽기 순서, 결과 기록, 비밀정보와 원격 변경의 경계를 정한다.

## 공유 기준

| 우선순위 | 기준 | 용도 |
|---|---|---|
| 1 | 사용자 최신 지시 | 현재 작업의 목적과 범위 |
| 2 | Git 작업 트리와 최신 커밋 | 실제 코드·문서 상태 |
| 3 | `AGENTS.md`, `CLAUDE.md` | 공통 작업·동기화 규칙 |
| 4 | `docs/claude-handoff.md` | 현재 단계와 다음 우선순위 |
| 5 | 관련 설계·스킬·연구노트 | 도메인별 계약과 결정 근거 |

문서와 현재 코드가 충돌하면 임의로 한쪽을 따르지 않는다. 차이를 확인하고 최신 사용자 지시, Git 이력, 연구노트를 근거로 정리한 뒤 진행한다.

## Claude에게 맡기기 전

1. 작업 목적, 완료 기준, 제외 범위를 `docs/claude-task-template.md` 형식으로 적는다.
2. 현재 브랜치·커밋·작업 트리 상태를 함께 전달한다.
3. 관련 파일만 지정하되, `AGENTS.md`, `CLAUDE.md`, `docs/claude-handoff.md`는 항상 읽도록 한다.
4. Supabase project ref, publishable key처럼 비밀이 아닌 식별자도 필요한 경우에만 전달한다.
5. service role, Cloudinary API secret, OAuth client secret, 사용자 세무 원본 데이터는 전달하지 않는다.

## Claude 작업 중 불변조건

1. V1은 단일 HTML + GitHub Pages이며, 내부 원장은 복식부기 SSOT다.
2. RLS, Google allowlist, owner 권한 체계를 약화하지 않는다.
3. 동기화는 `updated_at` 병합과 `canonical_version` 최종본 지정을 분리한다.
4. 데이터 계약 변경에는 Supabase·IndexedDB·JSON 백업·import/export 영향을 함께 검토한다.
5. 최신 법정서식 스냅샷이 없으면 확정 리포트 출력을 허용하지 않는다.
6. 원격 push, 배포, DB 파괴 작업은 별도 사용자 요청 없이는 수행하지 않는다.

## 결과 수령 및 반영

| 항목 | 확인 내용 |
|---|---|
| 범위 | 요청한 기능만 바뀌었는지, 보류 기능이 완료된 것처럼 보이지 않는지 |
| 계약 | 스키마, IndexedDB, 동기화, import/export 호환성 |
| 보안 | RLS, allowlist, 입력값, 비밀키 노출 여부 |
| 테스트 | 정상·실패·경계·회귀 검증 결과 |
| UI | 모바일, 빈 상태, 오류 상태, 긴 한국어 문구 |
| 기록 | 연구노트·인수인계·스킬 버전이 실제 변경과 일치하는지 |

Claude 결과를 그대로 적용하지 않는다. 현재 저장소 기준으로 diff와 테스트를 검토한 뒤 반영한다.

## 인수인계 갱신 기준

아래 변경은 `docs/claude-handoff.md`와 연구노트를 함께 갱신한다.

- 다음 구현 우선순위 또는 앱 버전 변경
- Supabase 스키마, RLS, Auth, sync 계약 변경
- 법정서식·세무 판정 기준 변경
- Cloudinary 증빙 보관·접근 정책 변경
- 미완료 위험 또는 외부 설정 의존성 변경

문구·스타일만 바꾸는 작은 변경은 인수인계 갱신이 필수는 아니지만, 앱 버전과 릴리스 정책은 개발 운영 스킬을 따른다.
