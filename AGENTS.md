# Accounting Ledger Agent Instructions

> ⚠ **이 파일은 `docs/CONSTITUTION.md`에서 자동 생성됩니다 — 직접 고치지 마세요.**
> 규칙을 바꾸려면 헌법 파일을 고치고 `npm run gen:adapters`를 실행합니다.
> 손으로 고치면 하네스 게이트 `adapter-parity`가 실패합니다.

이 저장소의 Codex, Claude, 기타 AI 협업자는 작업 전 `CLAUDE.md`와 `docs/claude-handoff.md`를 읽고, 관련 스킬 문서를 적용한다. 사용자 최신 지시와 Git 작업 트리가 실제 작업 범위의 최종 기준이다. **처음 오거나 오랜만에 복귀한 협업자는 `docs/codex-handoff.md`(복귀 온보딩 인계서)부터 읽는다** — 저장소 지도, 그동안의 변화, 하네스 게이트 전체, 실무 함정이 정리되어 있다.

## 앱 목적 (미션)

이 앱은 초등학생도 이해할 만큼 쉬운 화면으로 수입·지출을 관리하면서, 그 기록이 복식부기 SSOT와 최신 법정서식·세법 근거로 뒷받침되어, 사용자가 세무사 없이도 스스로 국세청에 세무사 수준의 최신 법적 신고자료를 만들 수 있게 AI 역량을 총동원해 돕는다. 쉬움과 정확성 어느 하나도 포기하지 않는다. 법정 확정 출력은 최신 서식 스냅샷 검증 전에는 확정으로 표시하지 않는다. 상세는 `docs/accounting-ledger-design-directive-v2.md`의 `0. 최상위 결론`을 SSOT로 본다.

## 스택과 구조 (요약; SSOT는 설계지침·아키텍처 스킬)

- V1은 단일 HTML(`index.html`) + GitHub Pages다. 빌드 도구가 없고, 브라우저 의존성 lucide와 supabase-js는 `vendor/`에 버전·SHA-256을 고정해 저장소에서 제공한다. 외부 CDN 스크립트는 실행하지 않는다.
- `android-shell/`은 이 규칙의 예외가 아니라 별개 하위 프로젝트다(웹앱을 그대로 불러오는 얇은 Capacitor WebView 셸, npm 기반 빌드 도구를 그 폴더 안에서만 쓴다 — index.html 자체는 여전히 빌드 도구가 없다). 웹 자산을 셸에 번들링하지 않으며(`capacitor.config.json`의 `server.url`이 배포 주소를 가리킴), APK 다운로드 링크·릴리스 태그의 SSOT는 `index.html`의 `APK_INFO` 상수 하나이고 `.github/workflows/android-apk.yml`·설치 안내 화면이 그 값을 그대로 읽는다(하네스 게이트 `apk-link-contract`가 일치를 강제). 상세는 `android-shell/README.md`.
- 저장은 로컬(IndexedDB/localStorage), 클라우드(Supabase Postgres + RLS), 증빙 원본(Cloudinary, 일부 계획)으로 나눈다.
- 내부 원장은 복식부기 SSOT, 간편장부는 입력 UX와 출력 view다.
- 레이어를 분리한다: UI → State → Domain(회계·세무) → Persistence → Remote Adapter → Validation → Report. 회계·세무 판단을 DOM 이벤트 핸들러나 Supabase 호출 안에 직접 섞지 않는다. 상세는 `docs/skills/accounting-code-architecture-guardians-skill.md`.
- 품질 하네스는 `npm run harness:check`(Node, `scripts/harness-check.mjs`)이고, CI는 push/PR에서 같은 명령을 실행한다.
- 앱 버전은 `0.00`에서 시작하고, 확정 사용자 변경마다 `0.01` 증가한다. 스킬 문서는 개별 `Sub_<name>_<version>` 체계를 유지한다.
- 중요 설계·스키마·보안·마이그레이션 변경은 연구노트(`docs/accounting-ledger-app-research-notes.md`)와 `docs/claude-handoff.md`를 같은 작업에서 갱신한다.

## 하드 룰 (위반하면 작업을 멈추고 사용자에게 확인한다)

- Supabase public 테이블의 RLS를 제거하거나 `authenticated` 전체 허용 정책으로 바꾸지 않는다. RLS와 explicit GRANT, 정책을 함께 검토한다. Google OAuth allowlist와 owner 권한을 약화하지 않는다. `hanwha27@gmail.com`은 bootstrap owner다.
- service role key, Cloudinary API secret, OAuth client secret, Android release keystore(파일·비밀번호), 원본 세무자료를 코드·문서·커밋·앱 상태에 넣지 않는다. keystore는 GitHub Secrets에만 둔다.
- 법정서식은 최신 스냅샷 검증 없이 신고용 확정 출력으로 표시하지 않는다.
- 아직 구현하지 않은 기능을 완료된 기능처럼 보이게 하는 UI를 만들지 않는다.
- 참고용 Excel·PDF·ZIP 원본은 명시적 요청 없이 Git에 추가하지 않는다.
- 원격 push, main 반영, 호스팅 배포, 파괴적 DB 작업은 사용자가 명시적으로 요청한 경우에만 한다.
- 동기화 대상 레코드는 `id`, `created_at`, `updated_at`, `deleted_at`을 유지하고 `canonical_version` 규칙을 지킨다. 마이그레이션 계획 없이 Supabase·IndexedDB·백업·import/export의 데이터 계약을 바꾸지 않는다. 기존 비회계 Supabase 테이블을 회계 앱 작업 범위로 임의 변경하지 않는다.
- SSOT를 중복하지 않는다. 연결 가이드의 주소·이메일·버전·상태는 `APP_INFO`, `GuideService`, 런타임 진단 state에서 읽고, 같은 값을 별도 문장에 하드코딩하지 않는다.

## 먼저 적용할 도메인·코드 스킬

- 세무 법적 기준(기장의무, 단순·기준경비율 적용, 추계 소득 계산, 부가세 면세)의 **값·조문·출처는 `docs/skills/accounting-legal-basis-reference-skill.md`를 SSOT**로 본다. 같은 숫자를 코드·문서에 중복 정의하지 않는다.
- 거래, 분개, 계정과목, 대사, 마감, 감사, 세무 매핑, 리포트 작업은 `docs/skills/accounting-domain-guardians-skill.md`를 먼저 적용한다.
- 단일 HTML 구조, 상태관리, adapter, 오류 처리, 성능, 의존성, 개발자 모드 작업은 `docs/skills/accounting-code-architecture-guardians-skill.md`를 먼저 적용한다.
- 외화 입력, 환율 조회, 원화 환산, 고정지출 외화 예상액, 환율 감사필드 작업은 `docs/skills/accounting-multicurrency-fx-skill.md`를 먼저 적용한다.
- `android-shell/`, `.github/workflows/android-apk.yml`, `CapacitorShell`, `APK_INFO`, safe-area/edge-to-edge CSS 등 안드로이드 셸 관련 작업은 `docs/skills/accounting-mobile-apk-readiness-skill.md`를 먼저 적용한다 — 실기기에서만 드러난 함정(PKCE flowType, 모바일 드로어 z-index, edge-to-edge 안전영역, allowNavigation 호스트 한계)을 정리해 둔 별도 관리 문서다.
- 기능 추가·버그 수정의 실행 순서(브랜치 확인→조사→설계→구현→로직 테스트→하네스→헤드리스 실증 검증→문서 4종 갱신→버전→커밋)는 `docs/skills/accounting-development-governance-skill.md`의 "실행 루프" 절을 따른다.

## 동기화 불변조건 (이 절이 SSOT)

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

## 다중통화·일일환율 데이터 계약

- 장부·전표·VAT·리포트의 기능통화는 KRW이며, 외화 거래도 저장 당시 확정한 원화 금액으로 전기한다.
- 외화 원금액·통화·원화환율·환율 기준일·출처·조회시각·수동수정 여부를 원화 금액과 함께 보존한다. 과거 거래를 오늘 환율로 자동 재평가하지 않는다.
- 고정지출 일정은 외화 원금액과 사용자가 선택한 기준일 이하의 최근 공식 고시환율을 보존하고, 목록·대시보드 예상액도 그 저장 환율을 일관되게 사용한다. 주말·공휴일은 실제 고시일을, 미래 기준일은 오늘까지 최신 환율을 사용한 예상치임을 표시한다. 실제 거래 생성 시에는 거래일 환율을 별도로 확정한다.
- 통화 선택과 해외 세무거래 여부(`is_overseas`)는 서로 다른 개념으로 분리한다.
- 환율 조회 실패를 숨기지 않는다. 마지막 정상 환율은 경고와 출처·기준일을 함께 표시하고, 캐시도 없으면 임의 환율 저장을 차단한다.
- 세부 계산·호환·검증 규칙은 `docs/skills/accounting-multicurrency-fx-skill.md`를 SSOT로 본다.

## 반복지출·일정 데이터 계약

- 고정지출 일정(`fixed_expenses`)과 실제 원천거래(`source_transactions`)는 분리하고, 실제 결제 저장 시 `fixed_expense_id`로 연결한다. 일정을 실제 거래처럼 선기장하지 않는다.
- 실제 거래 저장과 `last_booked_on`·`next_due_date` 이동은 같은 로컬 원자 작업으로 처리한다. 사용자는 월간이면 `billing_anchor_day`(1~30일, 31=말일), 연간이면 `billing_anchor_month/day`를 지정하고 `next_due_date`는 앱이 계산한다. 월말·2월 29일 일정은 짧은 달에 말일로 보정한 뒤 원래 기준일로 복귀시키며, 조기 결제도 다음 회차로 한 번 전진하고 재개 시 오늘 이후 가장 가까운 일정으로 맞춘다.
- 반복 일정의 등록·수정·상태 변경·삭제도 `updated_at`, 감사로그, tombstone, canonical 규칙을 적용한다. 새 동기화 테이블은 Supabase migration뿐 아니라 IndexedDB, state/reload, queue, merge, canonical, 백업·복원, 가계부 cascade까지 전 생명주기에 연결한다.
- 결제수단 식별정보는 카드·계좌 전체 번호를 저장하지 않고 끝 4자리만 허용한다.

## 버전 규칙

앱 버전 증가·`UPDATE_HISTORY`·`최신 ·` 마커의 상세 규칙은 `CLAUDE.md`의 `버전 규칙` 절이 SSOT다. 여기에 복제하지 않는다 — `index.html`을 바꾸기 전에 그 절을 읽는다.

## 작업 및 릴리스 규칙

- 작업 전 `git status --short`, `git diff --stat`, `git diff`로 기준선을 확인하고 기존 실패·신규 실패·환경 의존 실패·실행 불가·수동 확인 필요를 구분한다.
- 기존 사용자 변경을 되돌리거나 범위 밖 리팩터링을 섞지 않는다.
- 데이터·권한·동기화·증빙·법정서식 변경에는 Schema/Contract, Security, Migration 관점을 적용한다.
- 변경 후 `npm run harness:check`를 실행한다. Required 게이트가 모두 통과하지 않으면 작업 완료를 선언하지 않는다.
- 실행하지 않은 검사를 통과했다고 보고하지 않는다. 실패·생략·실행 불가·수동 확인 항목을 모두 남긴다.
- 작업 후 변경 파일, 핵심 변경, 스키마·마이그레이션 영향, 실행한 검증 명령과 결과, 잔여 위험, 수동 확인 항목을 남긴다.

## 전역 공용 스킬·릴리스 프로필

- 공통 정본은 비공개 `https://github.com/hanwha27-TDTU/Codex-Shared-Skills`이며 승인 커밋과 내용 해시는 `schemas/codex-shared-skills-lock.json`만 SSOT로 삼는다.
- 프로젝트별 게이트 그룹·버전 writer·산출물·브랜치 쓰기 주체·배포 표면은 `schemas/accounting-ledger-release-profile.json`이 SSOT다. 공통 규칙을 이 저장소에 복사하지 않는다.
- 이 공개 저장소와 GitHub Pages에 비공개 스킬 본문을 노출하지 않는다. 로컬 `vendor/codex-shared-skills/`는 정본의 `sync-skills.mjs --vendor`가 만든 파생물이며 직접 고치거나 커밋하지 않는다.
- CI의 `shared-skills-contract`는 고정 커밋·해시 잠금·프로필을 오프라인 검증한다. 전역 설치본과 로컬 본문 스냅샷은 승인된 정본에서 `--check-global`, `--check-vendor`로 추가 검증한다.

## 배포 명령 해석 (이 절이 SSOT)

사용자가 “배포해주세요”라고 말하면 다음 범위를 명시 요청으로 간주한다.

1. 현재 작업 트리와 원격 추적 상태를 확인한다.
2. 의도한 변경만 스테이지하고, 필요한 경우 체크포인트 커밋을 만든다.
3. `npm run harness:check`와 관련 검증을 실행한다.
4. 현재 브랜치가 `main`이면 `origin/main`에 push한다.
5. 기능 브랜치에서 작업 중이면 사용자 승인 없이 파괴적 재작성은 하지 않고, main 반영 전략을 확인한 뒤 merge 또는 PR 흐름을 진행한다.
6. GitHub Pages 또는 별도 호스팅 설정이 존재하면 해당 배포 절차도 수행한다.
7. Claude가 이어서 볼 수 있도록 변경 요약, 최신 커밋, 검증 결과, 남은 위험, 다음 작업 지시문을 최종 보고에 포함한다.
8. 원본 참고 Excel·PDF·ZIP, 비밀키, service role, OAuth secret, Cloudinary secret은 배포 범위에 포함하지 않는다.

---

세부 현황과 인수인계 형식은 `docs/claude-handoff.md`를 기준으로 한다. 이 파일을 고치려면 `docs/CONSTITUTION.md`를 고치고 `npm run gen:adapters`를 실행한다.
