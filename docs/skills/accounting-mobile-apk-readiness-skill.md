> **📌 Sub_mobile-apk-readiness_0.04** · 개정 2026-08-04

# Accounting Ledger Mobile/APK Readiness Skill

이 문서는 안드로이드 셸(`android-shell/`, Capacitor 7)을 다루는 모든 작업의 진입점이다. `index.html`(웹) 쪽 작업만 한다면 이 문서를 몰라도 되지만, `android-shell/**`·`.github/workflows/android-apk.yml`·`CapacitorShell` 객체·`APK_INFO` 상수·안전영역(safe-area) CSS를 건드린다면 반드시 먼저 읽는다. **0.02(2026-07-09) 이전 버전은 구현 전 계획 문서였다 — 이 버전(0.03)부터는 실제로 만들고, 배포하고, 실기기에서 4라운드에 걸쳐 고친 뒤 남은 실전 지식이다.** 계획과 실측이 어긋나면 이 문서를 실측 기준으로 갱신한다(하드룰).

## 확정된 결정 (더 이상 후보가 아님)

| 항목 | 확정값 |
|---|---|
| 셸 프레임워크 | Capacitor **7**, `android-shell/`(웹 리포와 같은 저장소, 별도 npm 하위 프로젝트) |
| 웹 자산 번들링 | **안 함** — `capacitor.config.json`의 `server.url`이 배포된 GitHub Pages 주소를 그대로 가리킴. 웹을 고쳐도 APK 재빌드 불필요 |
| TWA | **기각 확정**(후보 아님) — 이유는 아래 "OAuth·딥링크" 절 참고(TWA로는 시스템 브라우저 왕복을 앱 코드가 제어할 수 없음) |
| appId / 앱명 | `io.github.hanwha27tdtu.bareunjangbu` / "바른장부"(GitHub 계정 기반 역도메인, AskUserQuestion으로 사용자와 확정) |
| 서명 전략 | Claude가 keytool로 release keystore 생성 → 사용자에게 전달(세션 scratchpad에서만, Git에 절대 커밋 안 함) → 사용자가 GitHub Secrets 4종(`ANDROID_KEYSTORE_BASE64`/`ANDROID_KEYSTORE_PASSWORD`/`ANDROID_KEY_ALIAS`/`ANDROID_KEY_PASSWORD`) 등록 |
| 다운로드 링크 | 고정 태그 `apk-latest`에 `gh release upload --clobber`로 계속 덮어씀(새 태그 생성 안 함) — 링크가 영구히 안 바뀜 |
| 로컬 잠금(PIN/생체인증) | 여전히 범위 밖(0.02 결정 유지, 아직 아무도 요청 안 함) |
| 실제 APK 빌드·배포 | **완료**(0.50~0.53에 걸쳐 GitHub Actions로 실제 빌드·서명·배포까지 검증됨) |

## SSOT

- 릴리스 태그·자산명·다운로드 URL: `index.html`의 `APK_INFO` 상수 하나. `.github/workflows/android-apk.yml`과 설치 안내 화면(`androidInstallGuideHtml()`)은 이 상수만 읽는다. 세 곳 일치는 하네스 REQUIRED 게이트 `apk-link-contract`(`scripts/harness-check.mjs`)가 강제한다.
- 셸(APK) 자체 버전: GitHub Actions `github.run_number`(항상 증가)를 Gradle `-PAPP_VERSION_CODE`로 주입 → `versionCode`. 같은 고정 릴리스에 `bareunjangbu-shell-version.json`을 함께 올려, 이미 설치된 앱이 APK 전체를 받지 않고도 "셸 자체가 새로 나왔는지"를 가볍게 확인.
- 웹 내용 버전: 별도 `version.json`을 만들지 않는다. `index.html` 자기 자신을 `cache:'no-store'`로 재요청해 `APP_INFO.version`만 정규식 비교(`WebUpdateService`).

## 실전에서 확인된 함정 4가지 — 다음에 비슷한 작업을 할 때 제일 먼저 의심할 것

이 프로젝트에서 안드로이드 셸 작업은 이 세션 하나에서 **0.50(최초 구현) 이후 실기기 확인만으로 0.51·0.52·0.53 세 라운드**가 추가로 필요했다. 셋 다 이 샌드박스(Android SDK·실기기·외부 네트워크 없음)에서는 원리적으로 재현 불가능했던 종류의 버그였다 — 즉 **"헤드리스 Chromium으로 확인됨"과 "실기기에서 확인됨"은 이 도메인에서 별개의 검증층**이라는 뜻이다. 아래 4가지는 그 세 라운드에서 실제로 나온 것들이고, 유사한 네이티브 셸 기능을 또 추가할 때 코드 리뷰 단계에서 먼저 의심해야 한다.

### 1. Supabase OAuth는 `flowType: 'pkce'`를 명시해야 한다 (0.53에서 발견 — 가장 치명적)

`createClient(...)`에서 `flowType`을 지정하지 않으면 supabase-js v2는 기본값 `implicit`으로 동작한다. implicit 흐름은 로그인 뒤 토큰을 URL **프래그먼트**(`#access_token=...`)로 돌려주는데, 네이티브 셸의 딥링크 복귀 코드(`CapacitorShell.completeSignIn`)는 PKCE 흐름을 전제로 `?code=` **쿼리 파라미터**를 찾아 `exchangeCodeForSession()`을 호출하는 구조였다. 두 코드가 서로 다른 흐름을 암묵적으로 가정하고 있었던 것 — implicit 상태에서는 `code`가 항상 `null`이라 `completeSignIn`이 **에러 하나 없이 조용히 아무 일도 안 하고 끝난다**. 증상은 "구글 계정 선택 화면까지는 완벽하게 뜨는데 앱으로 돌아오면 로그인이 안 된 것처럼 남는다" — 로그인이 실패하는 게 아니라 **성공 처리 코드 자체가 안 불린다.**

**교훈**: 네이티브 딥링크로 OAuth를 완성하는 코드를 짤 때는 클라이언트 생성 시점에 `flowType`이 그 완성 코드가 기대하는 흐름과 일치하는지 반드시 같이 확인한다. `detectSessionInUrl:true`는 실제 페이지 내비게이션에만 반응하므로, Capacitor의 `appUrlOpen` 이벤트로 전달되는 딥링크 URL에는 자동으로 적용되지 않는다(수동으로 `completeSignIn`을 호출해야 하는 이유).

### 2. 모바일 드로어의 전체화면 scrim은 z-index를 상단바보다 낮게 둬야 한다 (0.52에서 발견)

모바일 사이드바를 열 때 뒤 콘텐츠를 어둡게 덮는 배경(scrim)을 `position:fixed; inset:0`으로 만들면 화면 전체(사이드바 폭 바깥의 상단바 영역까지)를 덮는다. 이때 scrim의 z-index가 상단바(topbar)보다 높으면, **드로어가 열려 있는 동안 상단바의 모든 버튼이 클릭을 받지 못한다**(터치가 scrim에 먼저 닿아 드로어만 닫힘). 헤드리스 Chromium 테스트로는 이 문제를 못 잡는다 — scrim 자체가 열리고 닫히는 동작은 정상으로 보이기 때문에, "상단바 버튼이 scrim보다 위에서 클릭을 받는지"를 `document.elementFromPoint()`로 따로 확인해야 드러난다.

**교훈**: 전체화면 오버레이(scrim, backdrop 등)를 추가할 때는 **그 오버레이가 가려야 할 요소와 가리면 안 되는 요소를 z-index 표로 미리 정리**하고, 오버레이보다 위에 남아야 하는 고정 요소(상단바, 토스트 등)의 z-index를 명시적으로 확인한다.

### 3. targetSdkVersion 35(안드로이드 15)는 edge-to-edge를 강제한다 — `env(safe-area-inset-*)` 없이는 상태바와 콘텐츠가 겹친다 (0.51에서 발견)

`viewport-fit=cover`만 설정하고 `env(safe-area-inset-top/bottom/left/right)`로 실제 여백을 안 주면, WebView 콘텐츠가 상태표시줄·제스처 내비게이션 바 뒤까지 그려져 로고·버튼 텍스트가 시스템 UI와 겹친다. 이 프로젝트는 상단바(`.topbar`)·사이드바 로고(`.brand`)·사이드바 하단(`.sidebar-footer`)·우하단 토스트(`.toast-region`) 네 곳 모두에 안전영역 패딩이 필요했다(하나만 고치면 나머지에서 같은 클래스의 버그가 재현된다).

**교훈**: `android-shell/android/variables.gradle`의 `targetSdkVersion`을 확인하고, 35 이상이면 화면 네 변(상/하/좌/우) 모두에 고정 배치된 요소가 있는지 훑어 안전영역 패딩을 일괄 적용한다. 배경색은 `position:fixed`/`sticky`로 이미 자연스럽게 시스템 UI 뒤까지 이어지므로(끊김 없음), 밀어야 하는 건 내용물(텍스트·아이콘)이지 배경이 아니다.

### 4. Capacitor `allowNavigation`은 호스트 단위로만 동작한다 — 경로로 좁힐 수 없다 (0.50에서 확인, 구조적 한계)

스펙이 "이 앱의 경로로만 좁혀라"를 요구해도, `allowNavigation`은 "이 호스트로의 이동을 허용할지"만 결정하지 같은 호스트 안에서 경로를 제한하는 기능이 아니다. GitHub Pages 사용자 사이트(`<user>.github.io`)처럼 한 호스트에 여러 저장소가 함께 떠 있는 구조라면, 이 앱과 같은 계정의 다른 Pages 사이트가 origin을 공유하는 위험이 셸 설정만으로는 해결되지 않는다(`android-shell/README.md`에 명시). 전용 도메인이나 조직 Pages로 옮기는 것 외에는 원리적 해결책이 없다 — "나중에 더 열심히 설정하면 될 것"이 아니다.

## SSOT 표 갱신 — Adapter 원칙

| Adapter | 웹/PWA | 안드로이드 셸(실제 구현) |
|---|---|---|
| `StorageAdapter` | IndexedDB/localStorage | 동일 계약 유지(변경 없음) |
| `AuthAdapter` | `SupabaseAdapter.signIn()` → `client.auth.signInWithOAuth({provider:'google', options:{redirectTo}})`, `detectSessionInUrl:true`가 자동 처리 | `CapacitorShell.signInWithGoogle(client)` → `skipBrowserRedirect:true`로 URL만 받아 `@capacitor/browser`(시스템 브라우저)로 열고, 커스텀 스킴 딥링크(`io.github.hanwha27tdtu.bareunjangbu://auth-callback`) 복귀를 `@capacitor/app`의 `appUrlOpen`으로 받아 `CapacitorShell.completeSignIn()`이 `exchangeCodeForSession()`으로 완성. **두 경로 모두 클라이언트가 `flowType:'pkce'`로 생성돼 있어야 함**(위 함정 1) |
| `EvidenceCaptureAdapter` | `<input type=file>` → Cloudinary | 변경 없음(네이티브 파일 선택 플러그인 불필요 — 이 앱은 GPS/EXIF 등 브라우저 권한 밖 기능을 쓰지 않아 0단계 판단에서 네이티브 플러그인 스코프를 skip함) |
| `ShareExportAdapter` | 다운로드 | 아직 미구현(요청 없었음) |
| `NetworkStatusAdapter` | `navigator.onLine`/`online`·`offline` 이벤트 | 동일(Capacitor WebView도 표준 브라우저 API 그대로 동작) |
| `CloudinaryUploadAdapter` | 제한된 unsigned upload | 동일, secret 금지(변경 없음) |

## 모바일 불변조건 (기존 8개 + 신규 2개)

1~8번은 0.02와 동일(회계 계산/세무 판정 로직 플랫폼 분리, wrapper 경유, secret 미포함, OAuth redirect 분리 가능, 오프라인 입력 허용, canonical sync 동일 적용, 증빙 이미지/PDF 지원, 공유 시 경고 표시).

9. **Supabase 클라이언트는 항상 `flowType:'pkce'`로 생성한다.** 다른 이유로 `createClient()` 호출부를 건드릴 때 이 옵션을 실수로 빠뜨리면 안드로이드 로그인이 에러 없이 조용히 깨진다(위 함정 1).
10. **`window.Capacitor`는 `CapacitorShell` 객체 한 곳에서만 참조한다.** 다른 코드가 `window.Capacitor`를 직접 찍어보면 셸 감지 로직이 여러 곳으로 흩어져 다음 네이티브 기능 추가 때 봉합점을 놓치기 쉽다.

## 실기기 검증 체크리스트 (헤드리스로 못 잡는 것들)

`docs/accounting-ledger-browser-checklist.md`의 "10. 안드로이드 앱 설치·셸" 절이 SSOT다. 이 스킬 문서는 "왜 헤드리스로 못 잡는지"를 설명하고, 그 체크리스트는 "무엇을 확인해야 하는지"를 나열한다 — 중복 정의하지 않는다.

### BlueStacks 검증 규칙

안드로이드 앱 화면·모바일 레이아웃·safe-area·터치 동작을 변경했거나 웹을 배포할 때는, 설치된 BlueStacks를 Android 검증 환경으로 사용한다. 브라우저 viewport 검증은 정밀한 중단점 실측용 보완층이며 BlueStacks 검증을 대체하지 않는다.

1. 설치된 인스턴스와 Android 버전을 먼저 확인하고, 검증 기록에 인스턴스명·해상도·DPI·방향을 남긴다. 특정 인스턴스명이나 경로를 추측하지 않는다.
2. 모바일 UI 합격 판정은 세로 휴대폰 방향에서 수행한다. 가로 1920×1080처럼 데스크톱 분기가 적용된 확인만으로 모바일 검증을 통과 처리하지 않는다.
3. 로컬 수정본은 서버를 `0.0.0.0`에 바인딩하고 Android Chrome에서 `http://10.0.2.2:<port>/`로 연다. 검증 뒤 임시 서버를 종료한다.
4. 배포 작업에서는 공개 GitHub Pages 주소도 BlueStacks에서 다시 열어 배포본을 확인한다. 캐시가 의심되면 새로고침 후 `APP_INFO.version` 또는 개발 기록의 버전을 대조한다.
5. 상단 safe-area, 상단바 줄바꿈, 가로 스크롤, 드로어·scrim 터치, 모달 스크롤, 입력 키보드가 활성 필드를 가리지 않는지 확인한다. 기능 변경이 있으면 해당 핵심 사용자 흐름도 한 번 실행한다.
6. BlueStacks가 설치되지 않았거나 세로 방향을 만들 수 없으면 해당 항목을 `MANUAL/미검증`으로 남기고 Android 또는 모바일 실기기 검증 완료라고 보고하지 않는다.
7. 사용자의 BlueStacks 전역 설정을 불필요하게 바꾸지 않는다. 검증을 위해 임시 변경한 해상도·방향은 기록하고 가능한 경우 원래 값으로 복원한다.

## 금지사항 (0.02와 동일, 유지)

- APK 전환을 이유로 회계 코어를 네이티브 코드에 새로 만들지 않는다.
- 모바일 번들·워크플로·커밋에 secret key(keystore 포함)를 넣지 않는다.
- 웹에서는 되는 기능이 APK에서는 깨지는 직접 DOM/브라우저 API 의존을 늘리지 않는다 — 네이티브 전용 분기는 반드시 `CapacitorShell.isNative()`를 거친다.
- "완전 자동"이라고 과장하지 않는다. 안드로이드는 사이드로드 앱의 무탭 자기 갱신을 OS 정책으로 막는다 — 다운로드까지는 자동화할 수 있어도 설치 확인 탭 1번은 어떤 앱도 건너뛸 수 없다.

## 관련 문서

- `docs/android-shell-auto-update-playbook.md` — 이 시스템 전체(셸·서명·CI·고정 링크·이중 자동 업데이트·OAuth·edge-to-edge)를 **다른 앱에서 그대로 재현**하기 위한 일반화 설명서. 함정 A~I 색인 포함. 이 저장소 밖으로 복사해 써도 되도록 자기완결로 작성됨.
- `docs/accounting-ledger-app-research-notes.md`의 0.50~0.56 항목 — 각 함정을 발견한 실제 조사 과정과 재현 방법이 더 상세히 기록돼 있다.
- `android-shell/README.md` — 셸 프로젝트 구조, OAuth 딥링크 흐름, 사용자가 직접 해야 하는 설정(Supabase Redirect URLs 등).
- `docs/accounting-ledger-browser-checklist.md` 10번 — 실기기 확인 체크리스트.
