# Codex 복귀 인계서 (Returning-Agent Onboarding)

> 개정 2026-08-02 · 기준 앱 버전 `0.60` · 배포 상태는 Git 최신 커밋과 GitHub Actions가 SSOT
> 이 문서는 **오랜만에 복귀하는 협업자(Codex 등)를 위한 따라잡기 편지**다. 현재 상태·값의 SSOT는 언제나 `docs/claude-handoff.md`와 Git 최신 커밋이며, 이 문서는 "무엇이 어디에 있고, 그동안 무엇이 왜 바뀌었는지"의 지도다. 이 문서와 다른 문서가 어긋나면 `docs/claude-handoff.md`가 이긴다.

## 1. 60초 요약 — 지금 어디까지 와 있나

- **제품**: 대한민국 개인사업자용 간편장부·복식부기 통합 회계 앱 "바른장부". 단일 `index.html` + GitHub Pages, 빌드 도구 없음(lucide·supabase-js는 `vendor/`에 버전·SHA-256 고정, 런타임 외부 CDN 없음).
- **기준 앱은 0.60**(전 금액 입력 KRW·UZS·USD·JPY 선택, CBU 일일환율과 원화 원장 고정)이며 자동 테스트 기준은 로직 222 assertion + 하네스 17개(16 REQUIRED + 1 MANUAL)다. 운영 DB migration 0.06은 적용 완료됐으며 현재 웹 배포 여부는 Git 최신 커밋과 GitHub Pages를 확인한다.
- **안드로이드 앱이 존재한다**(당신이 없던 사이 가장 큰 변화, 0.50~0.57): `android-shell/`(Capacitor 7 얇은 셸), GitHub Actions가 서명·빌드·고정 릴리스(`apk-latest`) 게시까지 자동, 실기기에서 설치·구글 로그인·이중 자동 업데이트까지 **실사용 검증 완료**.
- 클라우드: Supabase Postgres + RLS(소유자 allowlist), 로컬: IndexedDB/localStorage. 내부 원장은 복식부기 SSOT, 간편장부는 view.

## 2. 읽기 순서 (기존 체계 그대로 — 건너뛰지 말 것)

1. `AGENTS.md` — 제품 불변조건, **동기화 12조**, 보안 규칙, "배포해주세요" 명령의 해석 범위
2. `CLAUDE.md` — 하드룰(위반 시 작업 중단), **버전 규칙**, 스킬 라우팅, 완료의 정의
   ⚠ 위 두 파일은 **`docs/CONSTITUTION.md`에서 자동 생성되는 산출물**이다. 지침을 고치려면 두 파일이 아니라 헌법 파일을 고치고 `npm run gen:adapters`를 실행한다(직접 고치면 `adapter-parity` 게이트가 막는다).
3. `docs/claude-handoff.md` — 현재 상태·완료 사항 표·다음 우선순위의 SSOT
4. 작업 주제에 맞는 `docs/skills/` 문서 (라우팅은 CLAUDE.md의 "먼저 적용할" 절)
5. 이 문서의 3~7장 — 복귀자용 압축 맥락

## 3. 당신이 없던 사이 일어난 일 (버전 아크별)

상세 근거·재현 과정은 전부 `docs/accounting-ledger-app-research-notes.md`에 버전별로 있다. 여기서는 흐름만.

- **~0.39**: 코어 완성기 — 거래→균형 전표 자동 생성, 다중 가계부(개인/사업자 모드), 동기화(canonical_version), 증빙, 간편장부 import, 세무 판정(기장의무·경비율·면세·추계), 용어사전(`TAX_TERMS`+게이트), 0.33~0.39 전수감사.
- **0.42~0.48 재산세 계산기 아크**: 주택 재산세(공정시장가액비율·과세표준상한·누진세율·도시지역분·지방교육세·지역자원시설세 소방분·반기분납·공유지분). **실제 고지서와 10원 이하 오차까지 대조 검증됨**. 법령 값은 `docs/skills/accounting-legal-basis-reference-skill.md`가 SSOT — 숫자를 코드에 새로 적기 전에 반드시 이 문서를 본다.
- **0.49**: 상단바 가계부 빠른 전환(+모바일에서 현재 가계부 표시).
- **0.50~0.57 안드로이드 아크** (아래 4장에서 상세).
- **0.54 전수감사**: 0.40~0.53 전 구간 감사(문서 교차·ID 참조·봉합점·z-index·비밀값·헤드리스 E2E 34항목). 발견 2건 수정.
- **0.59~0.60 반복지출·다중통화 아크**: 상단 고정지출현황과 실제 비용거래 연결 후, 거래·고정지출·추계소득·재산세에 KRW·UZS·USD·JPY 선택과 CBU 일일환율을 추가. 저장 원장은 KRW로 고정하고 원금액·환율 감사필드를 보존하며 schema 0.06을 운영 적용했다.

## 4. 안드로이드 셸 — 반드시 알아야 할 구조 (0.50~0.57)

**아키텍처**: `android-shell/`은 웹 자산을 번들링하지 않는다. `capacitor.config.json`의 `server.url`이 배포된 Pages 주소를 그대로 가리켜, **웹만 고치면 APK 재빌드 없이** 설치된 앱에 자동 반영된다.

**SSOT 사슬** (어기면 게이트가 막는다):
- `index.html`의 `APK_INFO` 상수 = 릴리스 태그(`apk-latest`)·자산명·다운로드 URL·**releaseApiUrl**의 유일한 출처. 워크플로(`.github/workflows/android-apk.yml`)와 설치 안내 화면은 이 값만 읽는다 → `apk-link-contract` 게이트가 3자 일치 강제.
- 셸 버전 = GitHub Actions `run_number`(versionCode로 주입). 릴리스 설명(body)의 `<!-- shell-version: {...} -->` 마커가 앱이 읽는 새 빌드 감지 값.
- 설치 안내 화면(`androidInstallGuideHtml()`) = 설치 플레이북 파일(`docs/bareunjangbu-apk-install-playbook.md`)의 원본 — `npm run playbook:build`가 생성, `install-playbook-sync` 게이트가 바이트 일치 강제.

**실기기에서만 드러났던 함정 (같은 실수 반복 금지 — 증상→원인 색인은 `docs/android-shell-auto-update-playbook.md` 10장)**:
1. **PKCE**: Supabase `createClient`에 `flowType:'pkce'` 필수 — 없으면 구글 로그인이 "화면까진 되는데 앱에 돌아오면 무반응"으로 **에러 없이** 죽는다.
2. **CORS**: GitHub 릴리스 자산을 fetch로 읽으면 안 된다(302에 CORS 헤더 없음, 조용히 차단) — 감지는 `api.github.com` + body 마커 경로만 동작.
3. **edge-to-edge**: targetSdk 35라 화면 네 변의 고정 요소 전부에 `env(safe-area-inset-*)` 필요.
4. **z-index**: 검증된 순서 scrim(35) < topbar(36) < sidebar(40) < 업데이트 배너(75) < modal(80) < tooltip(100) < toast(120).
5. 업데이트 UX: 감지 시 **하단 배너 + [업데이트] 버튼**(자동 다운로드 강제 금지), 닫기는 세션 한정(영구 저장 금지 — 저장하면 설치 미룬 사용자가 영영 안내를 못 받는다).

## 5. 하네스 게이트 17개 — `npm run harness:check` (전부 통과 전엔 완료 선언 금지)

| 게이트 | 강제하는 것 |
|---|---|
| project-contract | 필수 파일 25개 존재(헌법·생성기·플레이북·vendor 포함) |
| browser-dependency-integrity | 로컬 vendor 2개 SHA-256·CSP 고정, CDN 실행 금지 |
| workflow-action-pins | GitHub Actions 참조를 40자리 commit SHA로 고정 |
| instruction-contract | AGENTS.md/CLAUDE.md에 동기화·보안·하네스 핵심 문구 존재 |
| adapter-parity | CLAUDE.md·AGENTS.md가 `docs/CONSTITUTION.md` 생성 결과와 바이트 일치 |
| migration-contract | 마이그레이션 7파일 + RLS/canonical·고정지출 마커 |
| tracked-scope-and-secrets | 참고자료 원본·비밀값류 커밋 금지 |
| git-diff-integrity | 공백 오류 0 |
| runtime-version-contract | `APP_INFO.version` +0.01 규칙, `최신 ·` 마커 1개, 버전 문자열 2회 |
| data-lifecycle-matrix | 동기화 12개 도메인 문서화 |
| logic-tests | 실제 앱 IIFE·`SyncAlgorithms`·`SupabaseAdapter`를 VM 로드해 212 assertion |
| term-ledger-contract | 세법 용어 39개 = `TAX_TERMS` ↔ 용어 원장 문서 일치 |
| legal-ssot-contract | 법정 기준값·추계 배율이 코드 ↔ 법령 SSOT 문서 일치 |
| concept-ledger-contract | 개념 원장 14개의 코드 anchor 실존 |
| apk-link-contract | APK 링크·마커·감지 코드 3자 일치(위 4장) |
| install-playbook-sync | 설치 플레이북 파일 = 앱 가이드 화면 (바이트 비교) |
| browser-roundtrip (MANUAL) | 실브라우저 체크리스트(`docs/accounting-ledger-browser-checklist.md`) |

새 게이트를 만들면 **일부러 깨서 FAIL 확인 → 바이트 동일 복구 → PASS 재확인**까지 해야 완료다(이 저장소의 규율).

## 6. 실행 루프 (SSOT: `docs/skills/accounting-development-governance-skill.md`의 "실행 루프" 절)

브랜치 확인 → 조사(코드 실측, 추측 금지) → 설계 → 구현 → 로직 테스트 → `npm run harness:check` → 헤드리스 실증(Playwright/chromium이 환경에 있으면) → **문서 4종 갱신**(연구노트·claude-handoff·browser-checklist·관련 스킬) → 버전(`index.html` 바꿨을 때만 +0.01) → 커밋. **원격 push·main 반영·배포는 사용자가 명시 요청할 때만**(“배포해주세요”의 해석 범위는 AGENTS.md).

검증 3층을 구분해 보고한다: ① 자동(하네스·로직) ② 헤드리스(브라우저 실동작) ③ **실기기/실네트워크만 가능한 것** — ③은 "사용자 확인 필요"로 정직하게 남긴다. 이 프로젝트에서 ③에서만 드러난 버그가 4라운드 있었다(4장).

## 7. 복귀자가 자주 밟는 지뢰 (실무 팁)

- **대형 단일 index.html(~4,500줄)**: 함수는 정의만 보지 말고 사용처·서비스까지 따라간다. 화면 요소는 `el('id')` 헬퍼로 접근 — id 오타는 런타임에만 터진다.
- **`Object.freeze` 객체(서비스 대부분)에 상태를 넣지 말 것** — 조용히 무시된다. 상태는 `state` 또는 모듈 `let`.
- **VM으로 index.html을 로드하는 스크립트**(logic.test, 플레이북 생성기)는 앱이 등록한 타이머 때문에 `process.exit` 명시 종료 필수.
- 게이트/검증을 약화하는 수정은 금지 — 검사 자체가 잘못됐다는 근거가 있을 때만, 근거와 함께.
- **`CLAUDE.md`/`AGENTS.md`를 직접 편집하지 말 것** — 둘 다 `docs/CONSTITUTION.md`에서 나오는 생성물이다. 헌법을 고치고 `npm run gen:adapters`를 실행한다. 양쪽에 필요한 규칙은 헌법에 한 번만 쓰면 두 파일에 자동으로 나가고(`emit:claude,codex`), 한쪽이 SSOT인 규칙은 반대쪽에 포인터 블록만 둔다.
- 버전 문자열·주소·이메일을 문장에 하드코딩하지 말 것 — `APP_INFO`/`APK_INFO`/`GuideService`에서 읽는다(SSOT 중복 금지). 같은 내용을 두 문서에 적고 싶어지면 먼저 "한쪽을 생성물로 만들 수 있나"를 검토한다(이 저장소는 지침·설치안내·APK 링크 세 곳에서 이 패턴을 쓴다).
- 커밋은 의도한 파일만. 참고용 Excel/PDF/ZIP·키스토어·비밀값은 어떤 형태로도 커밋 금지.

## 8. 지금 남아 있는 것 (백로그 SSOT: `docs/claude-handoff.md`의 "다음 구현 우선순위")

- 실기기: 0.56 업데이트 배너의 실제 표시·흐름 확인(다음 셸 빌드 때 자연 검증), "출처를 알 수 없는 앱" 경고 화면 캡처 확인.
- CI: release 서명 실패 시 debug 자동 폴백 안전망 없음(알려진 갭, 필요성 재확인 시 착수).
- 그 외 버전별 "남은 위험"은 claude-handoff 완료 표의 각 행 참조.

## 9. 인계 보고 형식

작업을 마치면 `docs/claude-handoff.md` 상단 요약·완료 표·백로그를 같은 커밋에서 갱신하고, 연구노트에 버전 항목을 추가한다(형식은 기존 항목 모방). 보고에는 변경 파일·핵심 변경·게이트별 결과·남은 위험·수동 확인 필요 항목을 남기고, **실행하지 않은 검사를 통과했다고 쓰지 않는다.**
