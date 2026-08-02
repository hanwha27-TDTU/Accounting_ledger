# 웹앱 → 안드로이드 APK 자동 업데이트 재현 설명서 (Playbook)

> 개정 2026-08-02 · 바른장부(Accounting_ledger) 0.50~0.56에서 실제로 구축·실기기 검증한 절차의 일반화 버전.
> 이 문서만 보고 **다른 웹앱**에서도 같은 시스템을 재현할 수 있게 쓴다. 이 저장소 특유의 값은 `<이렇게>` 표시했다.

## 0. 이 시스템이 주는 것

| 기능 | 동작 |
|---|---|
| 앱 설치 | 웹앱을 그대로 불러오는 얇은 Capacitor 셸 APK. 웹 자산을 번들링하지 않는다 |
| 고정 다운로드 링크 | `github.com/<owner>/<repo>/releases/download/apk-latest/<앱이름>-latest.apk` — 영원히 안 바뀜 |
| 웹 내용 자동 갱신 | 화면·기능이 바뀌면 **재설치 없이** 앱을 열 때마다 자동 반영 |
| APK 자동 업데이트 | 셸 자체가 바뀌면 하단 배너 → [업데이트] 탭 → 다운로드 → 설치 확인 1탭 |
| CI 자동화 | main에 push하면 GitHub Actions가 서명·빌드·릴리스 덮어쓰기까지 전부 수행 |

**원리적 한계(정직하게)**: 플레이스토어 밖(사이드로드) 앱은 안드로이드 보안 정책상 탭 0번의 완전 무인 자기 갱신이 불가능하다. 설치 확인 1탭은 어떤 앱도 못 없앤다.

## 1. 사전 조건

1. 웹앱이 **고정 URL로 이미 배포**되어 있을 것 (예: GitHub Pages).
2. GitHub 저장소 + Actions 사용 가능.
3. (로그인이 있다면) OAuth 제공자 설정 접근 권한 — 6장 참고.

## 2. Capacitor 셸 만들기

```bash
mkdir android-shell && cd android-shell
npm init -y
npm i @capacitor/core@^7 @capacitor/cli@^7 @capacitor/android@^7 @capacitor/browser@^7 @capacitor/app@^7
mkdir www && touch www/.gitkeep     # webDir는 빈 폴더 — 번들링 안 함
npx cap init "<앱이름>" "<역도메인.appid>" --web-dir=www
npx cap add android
```

`capacitor.config.json`:
```json
{
  "appId": "<io.github.계정.앱이름>",
  "appName": "<앱이름>",
  "webDir": "www",
  "server": { "url": "<https://배포된-웹앱-주소/>", "allowNavigation": ["<웹앱-호스트>"] },
  "android": { "allowMixedContent": false }
}
```

> ⚠ **함정 A — `allowNavigation`은 호스트 단위**: 경로(`/myapp/`)로 좁힐 수 없다. GitHub Pages 사용자 사이트(`계정.github.io`)는 계정의 모든 저장소 Pages와 origin을 공유하므로, 완전한 격리가 필요하면 전용 도메인을 써야 한다.

`android-shell/node_modules/`와 `*.jks`를 `.gitignore`에 추가한다.

## 3. 서명 키 만들기 (한 번만)

```bash
keytool -genkeypair -v -keystore release.jks -alias <별칭> \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass '<비밀번호>' -dname "CN=<앱이름>, O=<조직>, C=KR"
base64 -w0 release.jks > release.jks.base64
```

GitHub 저장소 → Settings → Secrets and variables → Actions에 4개 등록:

| Secret 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | 위 base64 파일 내용 전체 |
| `ANDROID_KEYSTORE_PASSWORD` | `<비밀번호>` |
| `ANDROID_KEY_ALIAS` | `<별칭>` |
| `ANDROID_KEY_PASSWORD` | **`ANDROID_KEYSTORE_PASSWORD`와 반드시 같은 값** |

> ⚠ **함정 B — PKCS12는 비밀번호가 하나다**: 요즘 keytool 기본 형식(PKCS12)은 저장소/키 비밀번호를 다르게 줘도 강제로 통일된다. 두 Secret에 다른 값을 넣으면 CI 서명이 `Given final block not properly padded`로 실패한다. 실측으로 확인한 함정 — 무조건 같은 값.

> 🔒 keystore 파일·비밀번호는 절대 Git에 커밋하지 않는다. 잃어버리면 기존 설치자 전원이 수동 재설치해야 하니 안전한 곳에 백업.

`android/app/build.gradle`의 `android {}` 블록에 조건부 서명 추가:
```gradle
signingConfigs {
    release {
        if (project.hasProperty('RELEASE_STORE_FILE')) {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        if (project.hasProperty('RELEASE_STORE_FILE')) { signingConfig signingConfigs.release }
    }
}
```
그리고 `defaultConfig`에서 `versionCode`를 CI가 주입할 수 있게:
```gradle
versionCode project.hasProperty('APP_VERSION_CODE') ? APP_VERSION_CODE.toInteger() : 1
```

## 4. CI 워크플로 (`.github/workflows/android-apk.yml`)

핵심 설계:
- **트리거는 `android-shell/**`(+워크플로 파일 자신) 경로만** — 웹만 바뀐 커밋에서 APK를 다시 굽지 않는다.
- **`github.run_number`를 versionCode로** — 실행마다 1씩 늘어나는 공짜 단조증가 카운터.
- **고정 태그 하나에 `--clobber`로 덮어쓰기** — 새 태그를 만들지 않아 다운로드 링크가 영구 고정.
- **릴리스 설명(body)에 버전 마커 기록** — 5장의 자동 감지가 읽는 값(이 방식이어야 하는 이유는 함정 D).

```yaml
name: Android APK
on:
  push:
    branches: [main]
    paths: ['android-shell/**', '.github/workflows/android-apk.yml']
  workflow_dispatch: {}
permissions: { contents: write }
env:
  RELEASE_TAG: apk-latest
  APK_ASSET_NAME: <앱이름>-latest.apk
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24.x }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21' }
      - uses: android-actions/setup-android@v3
      - run: npm ci
        working-directory: android-shell
      - run: npx cap sync android
        working-directory: android-shell
      - name: Check keystore secret
        id: keystore
        run: echo "present=${{ secrets.ANDROID_KEYSTORE_BASE64 != '' }}" >> "$GITHUB_OUTPUT"
      # ⚠ 함정 C — 반드시 android/app/ 밑에 쓴다. Gradle의 file(RELEASE_STORE_FILE)은
      # app 모듈 기준 상대경로라, 한 단계 위(android/)에 쓰면 "Keystore file not found"로 실패한다.
      - name: Decode keystore
        if: steps.keystore.outputs.present == 'true'
        working-directory: android-shell/android/app
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > release.jks
      - name: Build release APK
        if: steps.keystore.outputs.present == 'true'
        working-directory: android-shell/android
        run: |
          ./gradlew assembleRelease \
            -PAPP_VERSION_CODE=${{ github.run_number }} \
            -PRELEASE_STORE_FILE=release.jks \
            -PRELEASE_STORE_PASSWORD='${{ secrets.ANDROID_KEYSTORE_PASSWORD }}' \
            -PRELEASE_KEY_ALIAS='${{ secrets.ANDROID_KEY_ALIAS }}' \
            -PRELEASE_KEY_PASSWORD='${{ secrets.ANDROID_KEY_PASSWORD }}'
          cp app/build/outputs/apk/release/app-release.apk "$APK_ASSET_NAME"
      - name: Build debug APK (secret 없을 때 폴백)
        if: steps.keystore.outputs.present != 'true'
        working-directory: android-shell/android
        run: |
          ./gradlew assembleDebug -PAPP_VERSION_CODE=${{ github.run_number }}
          cp app/build/outputs/apk/debug/app-debug.apk "$APK_ASSET_NAME"
      - name: Publish fixed-tag release
        working-directory: android-shell/android
        env: { GH_TOKEN: '${{ github.token }}' }
        run: |
          NOTES="항상 최신 빌드를 가리키는 고정 릴리스입니다.

          <!-- shell-version: {\"versionCode\": ${{ github.run_number }}, \"signed\": ${{ steps.keystore.outputs.present }}} -->"
          if gh release view "$RELEASE_TAG" --repo "${{ github.repository }}" >/dev/null 2>&1; then
            gh release upload "$RELEASE_TAG" "$APK_ASSET_NAME" --clobber --repo "${{ github.repository }}"
            gh release edit "$RELEASE_TAG" --repo "${{ github.repository }}" --notes "$NOTES"
          else
            gh release create "$RELEASE_TAG" "$APK_ASSET_NAME" --repo "${{ github.repository }}" \
              --title "<앱이름> (최신)" --notes "$NOTES"
          fi
```

> debug 폴백의 대가: CI 러너가 빌드마다 새 debug 키를 만들 수 있어 서명이 달라지면 **덮어설치가 거부**된다. 실사용 배포 전에 반드시 release keystore를 등록할 것.

## 5. 자동 업데이트 (웹앱 쪽 코드)

### 5-1. 웹 내용 자동 갱신 (재설치 없음)

앱이 **자기 자신(index.html)** 을 다시 받아 버전 문자열만 비교한다 — 별도 version.json을 만들면 버전의 출처가 둘이 된다(중복 SSOT 금지).

```js
async function checkForWebUpdate() {
  const res = await fetch(location.href.split('#')[0], { cache: 'no-store' });
  if (!res.ok) return;
  const remote = (await res.text()).match(/version:\s*'([\d.]+)'/)?.[1];
  if (remote && isNewer(remote, APP_VERSION)) {
    if (inputDirty) { pendingWebUpdate = true; return; }  // 입력 중이면 미룸
    location.reload();
  }
}
```

입력 보호 규칙(전부 실측 근거 있음):
- **`beforeinput`(capture)로 감지** — `keydown`은 붙여넣기·음성입력·IME 조합을 놓친다.
- **`visibilitychange`로 리셋 금지** — 쓰다가 잠깐 나갔다 온 것이 "안전"으로 둔갑해 입력이 날아간다.
- **리셋은 앱의 유일한 렌더 함수 끝에서만** — 해시 라우팅이든 History API든, `hashchange`류 이벤트만 들으면 "같은 화면에서 액션 후 재렌더"를 놓친다. DOM을 새로 그리는 그 함수 안이 유일하게 안전한 지점이고, 미뤄둔 갱신(`pendingWebUpdate`)도 거기서 적용한다.

호출 시점: 앱 시작 시 + `visibilitychange`(visible 복귀 시).

### 5-2. APK 자체 자동 업데이트 감지

> ⚠ **함정 D — GitHub 릴리스 자산은 fetch로 못 읽는다**: `github.com/.../releases/download/...`는 302 리다이렉트에 CORS 헤더(`Access-Control-Allow-Origin`)가 없어 **웹뷰 fetch가 조용히 차단**된다(에러도 안 보임 — catch가 삼키면 그냥 아무 일 없음). 링크 클릭(내비게이션)은 CORS 대상이 아니라 잘 되기 때문에 헷갈리기 쉽다. **`api.github.com`은 `Access-Control-Allow-Origin: *`를 보낸다** — 그래서 4장의 워크플로가 릴리스 설명에 심은 `shell-version` 마커를 API로 읽는 것이 유일하게 동작하는 경로다.

```js
const RELEASE_API = 'https://api.github.com/repos/<owner>/<repo>/releases/tags/apk-latest';
const DOWNLOAD_URL = 'https://github.com/<owner>/<repo>/releases/download/apk-latest/<앱이름>-latest.apk';

function parseShellVersion(body) {
  const m = String(body || '').match(/shell-version:\s*(\{[^}]*\})/);
  if (!m) return null;
  try { const p = JSON.parse(m[1]); return Number.isFinite(Number(p.versionCode)) ? Number(p.versionCode) : null; }
  catch { return null; }
}

let dismissedBuild = null; // 세션 한정 — 절대 저장하지 말 것(함정 E)

async function checkForShellUpdate() {
  if (!window.Capacitor?.isNativePlatform?.()) return;   // 셸 안에서만
  try {
    const info = await window.Capacitor.Plugins.App.getInfo();
    const res = await fetch(RELEASE_API, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return;
    const remoteBuild = parseShellVersion((await res.json()).body);
    if (!remoteBuild || remoteBuild <= Number(info.build) || dismissedBuild === remoteBuild) return;
    showUpdateBanner(remoteBuild);   // 하단 중앙 배너: [업데이트] [X]
  } catch { /* 다음 확인 때 재시도 */ }
}
// [업데이트] 클릭 → window.Capacitor.Plugins.Browser.open({ url: DOWNLOAD_URL })
// [X] 클릭 → dismissedBuild = remoteBuild (메모리에만)
```

> ⚠ **함정 E — 자동 다운로드 강제 + "한 번만 안내" 저장 조합 금지**: 처음엔 감지 즉시 다운로드를 열고, 같은 빌드는 localStorage에 기록해 다시 안내하지 않게 만들었다. 실기기에서 곧바로 결함으로 판명 — 설치를 미룬 사용자가 앱을 다시 열면 **영영 업데이트 안내를 못 받는다**. 올바른 설계: 배너는 설치 전까지 열 때마다 다시 뜨고, 닫기는 세션 한정(저장 안 함), 설치가 끝나면 버전이 같아져 저절로 사라진다.

배너 CSS 요점: `position:fixed; left:50%; transform:translateX(-50%); bottom:calc(18px + env(safe-area-inset-bottom,0px));` + z-index는 모달보다 **아래**(모달 사용을 방해하지 않게).

> 참고: 무인증 GitHub API는 IP당 시간당 60회 제한 — 앱 시작+복귀 시 확인 정도면 여유롭다.

## 6. 구글 OAuth (로그인이 있는 앱만)

> ⚠ **함정 F — 구글은 내장 웹뷰 로그인을 차단한다**(`disallowed_useragent`). GPS 같은 네이티브 기능이 전혀 필요 없어도 이것 때문에 셸 작업이 필요해진다.

절차 (Supabase 기준, 다른 백엔드도 원리 동일):
1. **딥링크 스킴 등록** — `AndroidManifest.xml`의 activity에 intent-filter 추가:
   ```xml
   <intent-filter>
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="<역도메인.appid>" android:host="auth-callback" />
   </intent-filter>
   ```
2. **클라이언트를 반드시 PKCE로 생성** — ⚠ **함정 G**: supabase-js는 `flowType` 미지정 시 `implicit`이 기본인데, implicit은 토큰을 URL 프래그먼트(`#access_token=`)로 줘서 딥링크 코드 교환 로직이 **에러 없이 조용히** 실패한다. 로그인 화면까지 완벽히 진행되고 앱에 돌아온 뒤 아무 일도 안 일어나는 증상이면 십중팔구 이것.
   ```js
   createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
   ```
3. **셸 안 로그인 흐름**: `signInWithOAuth({ provider:'google', options:{ redirectTo:'<스킴>://auth-callback', skipBrowserRedirect:true } })` → 받은 URL을 `Browser.open()`(시스템 브라우저)으로 → `App.addListener('appUrlOpen')`으로 딥링크 수신 → `exchangeCodeForSession(url의 ?code=)`.
4. **백엔드 허용 목록**: Supabase 대시보드 → Auth → URL Configuration → Redirect URLs에 `<스킴>://auth-callback` 추가(이거 없으면 리다이렉트 거부).
5. 셸 감지는 한 곳에서만: `window.Capacitor` 참조를 단일 객체로 모아 웹/셸 분기가 흩어지지 않게 한다.

## 7. 화면 (안드로이드 15 edge-to-edge)

> ⚠ **함정 H — targetSdk 35부터 상태표시줄 뒤까지 그려진다**: `viewport-fit=cover`만 있고 안전영역 여백이 없으면 로고가 시계와 겹친다. **화면 네 변에 고정된 모든 요소**(상단바, 사이드바 로고, 하단 배너/토스트, 모달, 위로 뒤집히는 툴팁)에 일괄 적용해야 한다 — 하나만 고치면 나머지에서 재발한다.
```css
.topbar { padding-top: env(safe-area-inset-top, 0px); height: calc(60px + env(safe-area-inset-top, 0px)); }
.bottom-thing { bottom: calc(18px + env(safe-area-inset-bottom, 0px)); }
```
JS에서 안전영역 값이 필요하면(`env()`는 JS로 직접 못 읽음): `:root { --safe-top: env(safe-area-inset-top, 0px); }` → `parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'))`.

> ⚠ **함정 I — 모바일 드로어 scrim의 z-index**: 화면 전체를 덮는 scrim을 추가할 때 상단바보다 위에 두면, 메뉴가 열린 동안 상단바 버튼이 전부 먹통이 된다(터치를 scrim이 가로챔). 쌓임 순서를 표로 먼저 정하라. 이 프로젝트의 검증된 순서: scrim(35) < 상단바(36) < 사이드바(40) < 배너(75) < 모달(80) < 툴팁(100) < 토스트(120).

## 8. 검증 체크리스트

**샌드박스/CI에서 확인 가능**:
- [ ] `npx cap sync android`가 성공한다 (유효한 gradle 프로젝트)
- [ ] CI가 release 서명으로 성공하고 릴리스 자산+버전 마커가 갱신된다
- [ ] 헤드리스 브라우저: 배너 표시/버튼/닫기, 업데이트 버튼이 정확히 고정 링크를 연다

**실기기에서만 확인 가능** (헤드리스 통과 ≠ 완료 — 이 프로젝트에서 실기기 전용 버그가 4라운드 나왔다):
- [ ] 설치("출처를 알 수 없는 앱" 허용 포함) 후 웹과 동일 화면
- [ ] 상태표시줄/제스처 바와 안 겹침 (함정 H)
- [ ] 메뉴 연 채로 상단바 버튼이 눌림 (함정 I)
- [ ] 구글 로그인: 시스템 브라우저 → 앱 자동 복귀 → 세션 생김 (함정 F·G)
- [ ] 웹만 배포 후 앱 재시작 → 재설치 없이 새 화면
- [ ] 셸 재빌드 후 앱 재시작 → 배너 → [업데이트] → 설치 → 배너 소멸, **설치 안 하고 다시 열면 배너가 또 떠야 함** (함정 D·E)

## 9. 보안 규칙 (요약)

- keystore 파일·비밀번호·service key류는 코드·문서·커밋·앱 상태 어디에도 넣지 않는다. GitHub Secrets에만.
- APK에도 secret은 없다 — 웹앱과 동일하게 publishable key만.
- 값·주소·태그의 출처는 한 곳(SSOT 상수)으로 모으고, 워크플로·안내 화면이 그 값과 어긋나면 CI가 실패하게 검사를 걸어라(이 프로젝트의 `apk-link-contract` 게이트 방식).

## 10. 함정 색인 (증상 → 원인)

| 증상 | 함정 |
|---|---|
| CI: `Keystore file not found` | C — keystore를 `android/app/` 밑에 안 씀 |
| CI: `Given final block not properly padded` | B — PKCS12인데 두 비밀번호를 다르게 등록 |
| 로그인 화면까진 되는데 앱에 돌아오면 무반응 | G — `flowType:'pkce'` 누락 (또는 4번 Redirect URL 미등록) |
| 로그인 버튼 누르면 `disallowed_useragent` | F — 내장 웹뷰로 OAuth를 열었음 |
| 업데이트 감지가 조용히 안 됨(수동 링크는 됨) | D — 릴리스 자산을 fetch로 읽으려 함(CORS) |
| 업데이트를 미루면 다시는 안내가 안 옴 | E — 안내 이력을 영구 저장함 |
| 로고가 폰 시계와 겹침 | H — safe-area 여백 없음 |
| 메뉴 열면 다른 버튼이 먹통 | I — scrim z-index가 상단바보다 높음 |
| 웹 갱신이 입력 중인 내용을 날림 | 5-1 — beforeinput/렌더 함수 리셋 규칙 위반 |
