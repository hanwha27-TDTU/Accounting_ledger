# 바른장부 Android 셸

이 폴더는 배포된 웹앱(`https://hanwha27-tdtu.github.io/Accounting_ledger/`)을 그대로 불러오는 얇은 Capacitor WebView 셸이다. **웹 자산을 여기 번들링하지 않는다** — `capacitor.config.json`의 `server.url`이 배포 주소를 가리키므로, 웹을 고치면 APK를 새로 빌드하지 않아도 앱이 자동으로 최신 화면을 보여준다(자세한 갱신 방식은 `index.html`의 자동 새로고침 로직 참고).

## 구조

- `capacitor.config.json` — appId `io.github.hanwha27tdtu.bareunjangbu`, appName "바른장부", `server.url`이 배포 주소.
- `android/` — `npx cap add android`로 생성한 표준 Capacitor gradle 프로젝트. 손으로 고친 곳은 `AndroidManifest.xml`의 OAuth 딥링크 `intent-filter` 하나뿐(아래 참고) — `npx cap sync android`를 다시 돌려도 이 부분은 지워지지 않는다(Capacitor sync는 플러그인 목록·설정 주입만 갱신하고 수동 매니페스트 편집은 보존한다).
- 웹 자산 폴더(`www/`)는 Capacitor 설정상 존재해야 해서 빈 폴더만 있다 — 실제로는 안 쓰인다(server.url이 우선).

## 구글 로그인이 왜 다르게 동작하는가

구글은 앱 내장 웹뷰 안에서의 OAuth 로그인을 정책으로 차단한다(`disallowed_useragent`). 그래서 셸 안에서 로그인 버튼을 누르면:

1. `index.html`의 `CapacitorShell.signInWithGoogle()`이 Supabase에 `skipBrowserRedirect: true`로 로그인 URL만 받아온다.
2. `@capacitor/browser`(Chrome Custom Tabs, 시스템 브라우저)로 그 URL을 연다 — 앱 웹뷰는 전혀 이동하지 않는다.
3. 사용자가 구글 계정으로 로그인·동의하면, 구글→Supabase 콜백→`io.github.hanwha27tdtu.bareunjangbu://auth-callback` 순으로 리다이렉트된다.
4. 이 커스텀 스킴은 `AndroidManifest.xml`의 두 번째 `intent-filter`가 받아 안드로이드가 앱을 다시 연다.
5. `@capacitor/app`의 `appUrlOpen` 이벤트를 `CapacitorShell.bindDeepLinkListener()`가 받아 `code`로 세션을 완성한다(`exchangeCodeForSession`, PKCE).

**셸 밖(일반 브라우저)에서는 이 경로가 전혀 관여하지 않는다** — `CapacitorShell.isNative()`가 `window.Capacitor`가 없을 때 항상 `false`라서 기존 웹 로그인(같은 페이지 리다이렉트) 그대로 동작한다.

### 배포 전 사용자가 직접 해야 하는 설정 (제가 대신 할 수 없음)

- **Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs**에 `io.github.hanwha27tdtu.bareunjangbu://auth-callback`을 추가해야 딥링크 로그인이 실제로 동작한다. 추가 전에는 Supabase가 그 리다이렉트 주소를 거부한다.
- 구글 클라우드 콘솔의 OAuth 클라이언트 설정은 **바꿀 필요 없다** — 구글은 항상 Supabase의 고정 콜백 주소로만 리다이렉트하고, 커스텀 스킴은 Supabase가 그다음 단계에서 처리하기 때문이다.

## 알려진 한계 (솔직하게 남김)

- **`allowNavigation`은 경로가 아니라 호스트 단위로만 동작한다.** Capacitor의 이 설정은 "다른 호스트"로의 이동을 허용하는 목록이지, 같은 호스트 안에서 경로를 제한하는 기능이 아니다(그런 기능 자체가 Capacitor에 없다). 즉 `hanwha27-tdtu.github.io`라는 GitHub Pages 사용자 호스트에 이 계정의 다른 저장소가 Pages로 배포돼 있다면, 그 페이지도 이 앱과 **같은 origin**이라 브라우저의 동일-출처 정책상 서로의 `localStorage`/`IndexedDB`를 읽을 수 있다 — 이는 셸을 씌우기 전, 순수 브라우저에서도 이미 존재하는 GitHub Pages 사용자 사이트 구조 자체의 위험이며, `allowNavigation` 설정으로는 원리적으로 막을 수 없다. 완전히 없애려면 이 앱을 전용 도메인이나 조직(organization) Pages로 옮겨 origin을 격리해야 한다(별도 작업).
- 실제 안드로이드 기기에서의 로그인 딥링크 왕복은 이 개발 환경(샌드박스, Android SDK·에뮬레이터 없음)에서 실제로 실행해 확인하지 못했다 — **수동 확인 필요**.
