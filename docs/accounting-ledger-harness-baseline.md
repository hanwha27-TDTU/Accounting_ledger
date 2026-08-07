> **Sub_harness-baseline_0.09** · 갱신 2026-08-07

# Accounting Ledger Harness Baseline

## 기준선

| 항목 | 관찰 결과 |
|---|---|
| 기준 커밋 | `d85f610`에서 시작한 `codex/evidence-archive-browser-gate` 작업 트리 |
| 앱 버전 | `0.69` |
| 런타임 | 단일 `index.html` 업무 앱 + 별도 Capacitor Android 셸. IndexedDB, 복식부기, Supabase/Auth·RLS, canonical/tombstone, 외화·반복지출 포함 |
| 패키지·스크립트 | `package.json`/lock, `scripts/harness-check.mjs`, `scripts/tests/{logic,app-audit,gate-controls,browser-roundtrip}.test.mjs` |
| CI | `.github/workflows/harness.yml`에서 `npm ci`와 Playwright Chromium 설치 후 같은 하네스 실행 |
| 테스트 | 20개 Required 게이트마다 결함주입 대조군 보유. 268 로직 assertion·27 app-audit 계약·15 실제 Chromium 증빙 원본 왕복 assertion. |
| 데이터 | Supabase migration 12개. schema 0.08 migration은 서버 LWW trigger, canonical CAS RPC, cloud snapshot RPC, anon grant 회수를 정의한다. 운영 프로젝트의 `BEGIN…ROLLBACK` 검증에서 컴파일과 LWW·snapshot·CAS 충돌/성공·비인증 차단을 통과했다. 최종 운영 적용 결과는 릴리스 read-back으로 확정한다. |
| 사용자 참고 파일 | Excel·PDF·ZIP 4개가 미추적 상태이며 커밋 제외 대상 |

최초 설계 기준선에는 자동 검사가 없었다. 앱 0.01부터 런타임 계약을 Required로 승격했고, 앱 0.69에서 실제 브라우저 왕복도 Required로 전환했다. 실계정·실기기·운영 네트워크 확인만 Manual로 분리한다.

## 하네스 등급

| 게이트 | 등급 | 현재 상태 | 근거 |
|---|---|---|---|
| Required 20개 | Required | 활성 | 기존 계약과 실제 Chromium 증빙 원본 왕복을 모두 검사 |
| gate-controls | Required | 활성 | 19개 known-good 실행 + 20개 격리 결함 주입으로 20개 Required 모집단 전부 덮음. 자기 자신은 외부 정상 실행과 runner 제거 음성 대조군으로 증명 |
| app-audit | Required | 활성 | 접근성·저장 안내·HTTPS 증빙, 서명 APK, Android 백업, 원자 복원/checksum/queue 격리, 서버 LWW/CAS/snapshot migration을 27개 정적 계약으로 고정 |
| browser-roundtrip | Required | 활성 | 실제 Chromium에서 증빙 원본 export 다운로드, envelope 평문 비노출, 틀린 비밀번호·암호문 변조 무업로드 차단, 정상 재업로드·SHA-256·원자 metadata/queue 갱신 15 assertions |
| Security standard scan | Manual/도구 | 완료 | 기준 커밋 `5c84d99` 전체 저장소를 독립 검토해 10건(High 4·Medium 4·Low 2)을 봉인. 9건은 작업 트리에서 보완, GitHub Pages 공유 origin 1건은 잔여 위험 |

## 공식 명령

```powershell
npm run harness:check
```

이 명령은 저장소 파일을 수정하지 않는 검증이다. 브라우저 게이트는 임시 다운로드와 IndexedDB를 만들고 종료 시 정리한다. Required 게이트 중 하나라도 실패하면 비정상 종료한다.

## 향후 활성화 순서

1. 기존 장부 JSON 백업·복원도 실제 파일 input/download 브라우저 왕복으로 확장한다.
2. canonical version 변경, tombstone, 원격 병합 시나리오를 mock 또는 별도 테스트 프로젝트로 자동화한다.
3. Supabase 스키마·RLS 변경 시 원격 advisor 검증 절차를 수동에서 자동 또는 Required 검토로 승격한다.

## 금지사항

- Required 검사를 Advisory 또는 Manual로 낮춰 통과시키지 않는다.
- 실패하는 검사를 삭제·우회·항상 성공하는 wrapper로 바꾸지 않는다.
- 하네스 도입만으로 앱 코드, 데이터 구조, 운영 Supabase 데이터를 변경하지 않는다.
- 실행하지 못한 검사를 통과한 것처럼 보고하지 않는다.
