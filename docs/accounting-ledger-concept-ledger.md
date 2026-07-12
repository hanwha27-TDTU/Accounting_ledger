# Accounting Ledger 개념 정의 원장

> 이 문서는 이 저장소에서 반복적으로 등장하는 핵심 개념(도메인·동기화·게이트 개념)을 한 곳에 정의해, 새로 합류한 AI·개발자가 코드 여기저기를 뒤지지 않고도 "이 개념이 왜 있고, 무엇이 그걸 강제하는지"를 바로 찾게 한다. 용어대장(`docs/accounting-ledger-term-ledger.md`)이 **세법 용어**의 법적 정의를 다룬다면, 이 문서는 **이 저장소 고유의 설계·운영 개념**을 다룬다. 서로 대체하지 않는다.

각 개념은 4칸으로 적는다.

- **정의**: 1줄. 무엇인가.
- **규칙(왜)**: 이 개념이 왜 필요한가 — 안 지키면 어떤 사고가 나는가.
- **집행**: 이 개념을 실제로 강제하는 코드 심볼·게이트 이름·문서 파일. **백틱(`` ` ``)으로 감싼 토큰은 하네스 `concept-ledger-contract` 게이트가 저장소 전체에서 실존을 검증한다** — 이름이 바뀌거나 삭제되면 이 문서가 거짓말을 하게 되므로 게이트가 실패한다(anchor drift 방지).
- **자세히**: 더 읽을 문서.

## 개념 목록

| 개념 | 정의 | 규칙(왜) | 집행 | 자세히 |
|---|---|---|---|---|
| SSOT(단일 진실 공급원) | 같은 값(법적 기준·용어·버전)을 두 곳에 따로 정의하지 않고 한 곳만 근거로 삼는다 | 두 곳에 같은 숫자를 적어두면 하나만 고치고 잊어버려서 둘이 몰래 어긋난다 — 세법 임계값이 어긋나면 잘못된 신고 안내로 이어짐 | `legal-ssot-contract` | `CLAUDE.md`(하드 룰: SSOT를 중복하지 않는다), `docs/skills/accounting-legal-basis-reference-skill.md` |
| 소프트삭제 + tombstone | 사용자가 "삭제"해도 실제로는 `deleted_at`만 채우고 행은 남기며, 별도 tombstone 신호로 다른 기기에 삭제를 전파한다 | 진짜 DELETE는 오프라인 기기·동기화 지연 상황에서 "삭제 신호"가 사라져 되살아나거나(좀비 데이터), 다른 기기가 그 삭제를 영영 모르게 된다 | `tombstone(entityType, entityId)` | `docs/accounting-ledger-data-lifecycle-matrix.md`(불변조건: 삭제는 hard delete 금지) |
| LWW(최신 승리) 병합 | 로컬과 클라우드에 같은 id의 행이 둘 다 있으면 `updated_at`이 더 최근인 쪽이 이긴다 | 오프라인에서 여러 기기가 같은 데이터를 고쳤을 때 임의로 하나를 버리지 않고 결정적으로(같은 규칙으로 항상 같은 결과) 병합해야 데이터가 안 깨진다 | `SYNC_TABLE_ORDER` | `docs/accounting-ledger-data-lifecycle-matrix.md` |
| 정본은 클라우드, 로컬은 보조 캐시 | 평소엔 LWW로 병합하지만, "이 기기 상태를 못 믿겠다"는 순간엔 로컬을 정본(Supabase) 값으로 조건 없이 강제로 다시 맞추는 수단이 항상 있어야 한다 | LWW만 있으면 시계 오차·오래 오프라인이던 기기처럼 미묘한 이유로 기기마다 화면이 달라 보일 수 있는데, 이걸 사람이 원인 추적 없이 바로 "정본 기준으로 리셋"할 방법이 없으면 기기별 드리프트가 방치된다 | `resetLocalFromCloud` | `docs/accounting-ledger-app-research-notes.md`(앱 0.39 항목) |
| 빈 클라우드 가드 | 클라우드에서 받은 businesses가 0건인데 로컬엔 데이터가 있으면, 그걸 "클라우드가 비어있다"로 오해해 로컬을 덮어쓰지 않고 멈춘다 | 로그인 직후 네트워크 오류·권한 문제로 빈 응답이 오면, 그걸 그대로 "최종본"으로 믿고 로컬 전체를 지워버리는 대참사(wipe)를 막는다 | `EMPTY_CLOUD_GUARD` | `docs/accounting-ledger-data-lifecycle-matrix.md`(교훈 반영 절) |
| 결정적 ID(멱등 가져오기) | 같은 원본 데이터(간편장부 행)를 다시 가져와도 내용 기반으로 같은 id가 나와 새로 만들지 않고 덮어쓴다 | 같은 Excel 파일을 실수로 두 번 올려도 거래가 중복(좀비 데이터)되지 않는다 — 사용자가 이전 프로젝트에서 겪은 실패를 반복하지 않으려는 규율 | `deterministicId(` | `docs/accounting-ledger-app-research-notes.md`(앱 0.25 항목) |
| canonical_version(최종본 버전) | 클라우드의 "지금 이게 맞는 버전"이라는 표시. 기기들은 이 값을 보고 자기 로컬을 최종본으로 맞출지 판단한다 | 이 값이 없으면 여러 기기가 서로 자기가 맞다고 우기는 상황(merge 충돌)을 정리할 기준이 없다 | `canonical_version` | `AGENTS.md`(동기화 규칙) |
| RLS(행 수준 보안) 필수 | 모든 사용자 데이터 테이블에 Postgres RLS를 켜서, 로그인한 본인 소유 행만 보이게 한다 | RLS가 꺼지거나 `authenticated` 전체 허용 정책으로 바뀌면 다른 사용자의 회계·세무 데이터가 그대로 노출된다(하드 룰 위반) | `enable row level security` | `CLAUDE.md`(하드 룰 1번) |
| 버전 계약(APP_INFO.version) | `index.html`을 바꾸면 `APP_INFO.version`을 직전 버전에서 정확히 `0.01` 올리고 `UPDATE_HISTORY`에 "최신 ·" 마커를 정확히 하나만 둔다 | 버전이 안 올라가거나 여러 번 올라가면, 나중에 "이 배포에 뭐가 들어있었는지" 추적이 불가능해진다 | `runtime-version-contract` | `CLAUDE.md`(버전 규칙) |
| 데이터 생명주기 매트릭스 | 동기화 대상 도메인마다 로컬저장·로드·백업·복원·push·merge·최종본·삭제→tombstone 8개 노드가 전부 배선됐는지 표로 추적한다 | "다른 도메인엔 있는 노드가 특정 도메인만 조용히 빠진" 버그 클래스(예: 거래는 삭제되는데 거래처는 삭제가 안 되던 gap)를 표를 안 보면 못 알아챈다 | `data-lifecycle-matrix` | `docs/accounting-ledger-data-lifecycle-matrix.md` |
| 용어대장(컨센트 대장) | 세법 용어를 코드(`TAX_TERMS`)에 추가하면 `docs/accounting-ledger-term-ledger.md`에도 반드시 같은 용어를 등록해야 하고, 법적 근거·눈높이 설명 없이는 등록할 수 없다 | 용어를 코드에만 슬쩍 추가하면 법적 근거 확인 없이 나가는 "추측성 세법 설명"이 생길 위험이 있다 — 등록을 강제해 검증을 통과시킨다 | `term-ledger-contract` | `docs/accounting-ledger-term-ledger.md` |
| 개념 정의 원장 + anchor-existence 게이트 | 이 문서 자체 — 핵심 개념마다 "집행" 앵커를 적어두고, 그 앵커가 실제로 저장소에 존재하는지 자동으로 검증한다 | 문서에 "이건 이 코드가 강제한다"고 적어놓고 나중에 그 코드가 리팩터·삭제되면 문서가 거짓말을 하게 된다 — 그 드리프트를 방치하면 신뢰할 수 없는 문서가 쌓인다 | `concept-ledger-contract` | 이 문서 자체 |
| 게이트 우선 개발(회귀 방지) | 버그를 한 건 고치고 끝내지 않고, 같은 클래스의 버그가 재발하지 않도록 자동 검증(로직 테스트·하네스 게이트)으로 남긴다 | 사람 기억이나 문서 다짐만으로는 다음 변경에서 같은 실수가 반복된다 — 실행되는 코드가 강제해야 실제로 막힌다 | `scripts/tests/logic.test.mjs` | `CLAUDE.md`(AI 개발 규율) |
| 정직한 완료 구분(자동 vs 수동) | "통과"라고 말할 수 있는 건 자동 검증층(하네스·로직 테스트)뿐이고, 실제 브라우저 화면 확인은 별도로 "수동 확인 필요"라고 구분해서 보고한다 | 자동으로 못 돌려본 걸 "확인했다"고 하면, 실제로는 안 돌아가는 화면을 통과했다고 속이는 셈이 된다 | `browser-roundtrip` | `docs/accounting-ledger-browser-checklist.md` |

## 새 개념을 추가할 때

1. 이 표에 행을 추가한다. "집행" 칸에는 반드시 실존하는 코드 심볼·게이트 이름·문서 경로를 백틱으로 감싸 적는다(하나 이상).
2. `npm run harness:check`를 돌려 `concept-ledger-contract` 게이트가 그 앵커를 실제로 찾아내는지 확인한다(못 찾으면 오타이거나 아직 구현 전이라는 뜻).
3. 개념이 세법 용어(법적 정의가 필요한 단어)라면 이 문서가 아니라 `docs/accounting-ledger-term-ledger.md` + `TAX_TERMS`가 맞는 위치다 — 여기는 저장소 설계·운영 개념 전용이다.
