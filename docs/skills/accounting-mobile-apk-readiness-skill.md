> **📌 Sub_mobile-apk-readiness_0.02** · 개정 2026-07-09

# Accounting Ledger Mobile/APK Readiness Skill

이 문서는 회계장부 앱을 단일 HTML/PWA로 시작하되, 향후 Android APK 또는 모바일 앱으로 확장할 때 적용하는 스킬 문서다. 모바일 포장, Capacitor, TWA, 파일 선택, 카메라, 공유, 로컬 잠금, 모바일 OAuth, 오프라인 동기화를 다룰 때 이 문서를 먼저 본다.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 1차 제품 | 단일 HTML + GitHub Pages + PWA 가능 구조 |
| APK 확장 후보 | Capacitor 기반 Web Native 앱 |
| TWA | 단순 PWA 래핑 후보. 네이티브 기능이 필요하면 우선순위 낮음 |
| 도메인 로직 | 웹/PWA/APK 공통 |
| 플랫폼 기능 | adapter로 분리 |
| 비밀키 | APK에도 넣지 않음 |

## 1차 확정 범위

| 항목 | 결정 |
|---|---|
| 모바일 처리 | PWA 설치 가능 구조 + APK 대비 설계 |
| 실제 APK 빌드 | 1차 제외 |
| appId | 후보 `com.hanwha27.accountingledger`, 확정은 APK 직전 |
| 모바일 잠금 | 1차 제외, APK 단계에서 PIN/생체인증 검토 |
| 오프라인 | 입력 가능, 업로드/동기화는 대기열 |
| 알림 | 1차 제외, 앱 내 체크리스트 우선 |
| 세무자료 공유 | 모바일 공유 시 민감자료 경고 |

## 공식 기준

| 기준 | 확인 |
|---|---|
| Capacitor | 웹 기술로 Android/iOS/PWA 앱을 만들 수 있는 native runtime |
| Capacitor Android | Android Studio로 관리하고, Android API 24+ 지원 |
| Android TWA | PWA를 Android 앱처럼 여는 방식. Chrome 72+ 필요 |

출처:

- Capacitor docs: https://capacitorjs.com/docs/
- Capacitor Android docs: https://capacitorjs.com/docs/android
- Android Trusted Web Activity docs: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities

## Adapter 원칙

브라우저 API를 앱 전체에서 직접 부르지 않고, 아래 adapter를 통해 호출한다.

| Adapter | 웹/PWA | APK 후보 |
|---|---|---|
| `StorageAdapter` | IndexedDB/localStorage | 동일 계약 유지 |
| `AuthAdapter` | Supabase Google OAuth web redirect | 모바일 redirect scheme |
| `EvidenceCaptureAdapter` | file input | 카메라, 갤러리, 파일 선택 |
| `ShareExportAdapter` | 다운로드 | Android share sheet |
| `NetworkStatusAdapter` | browser online/offline | native network status |
| `LocalLockAdapter` | 선택적 PIN | 생체인증/PIN 후보 |
| `CloudinaryUploadAdapter` | 제한된 unsigned upload 또는 서버 서명 | 동일. secret 금지 |

## 모바일 불변조건

1. 회계 계산, 세무 판정, 리포트 생성 로직은 플랫폼과 분리한다.
2. IndexedDB/localStorage/Supabase/Cloudinary 호출은 wrapper를 통한다.
3. APK 번들에는 Supabase `service_role`, Cloudinary secret, Google client secret을 넣지 않는다.
4. Google OAuth redirect 설정은 웹과 모바일을 분리 가능하게 둔다.
5. 오프라인 입력은 허용하고, 업로드/동기화는 대기열로 처리한다.
6. canonical sync 규칙은 웹과 APK에서 동일하게 적용한다.
7. 증빙 첨부는 이미지/PDF 모두 지원하고, 모바일 사진/파일 선택을 나중에 붙일 수 있게 둔다.
8. 백업/리포트/증빙 공유 시 개인정보와 세무자료 노출 경고를 표시한다.

## 구현 전 결정할 것

| 항목 | 결정 필요 |
|---|---|
| APK `appId` | 예: `com.<owner>.accountingledger` 형식 |
| 앱 표시명 | Android launcher에 표시될 이름 |
| 서명키 관리 | keystore 보관 위치와 백업 방식 |
| 모바일 OAuth redirect | Supabase/Google 설정과 연결 |
| 로컬 잠금 | PIN만 할지, 생체인증까지 볼지 |
| Cloudinary 업로드 | unsigned preset 제한 또는 Supabase Edge Function 서명 |
| 백업 암호화 | JSON/ZIP 백업 파일 암호화 여부 |

## 금지사항

- APK 전환을 이유로 회계 코어를 네이티브 코드에 새로 만들지 않는다.
- 모바일 번들에 secret key를 넣지 않는다.
- 웹에서는 되는 기능이 APK에서는 깨지는 직접 DOM/브라우저 API 의존을 늘리지 않는다.
- TWA만 전제로 두고 카메라, 파일, 공유, 로컬 잠금 확장을 막지 않는다.
