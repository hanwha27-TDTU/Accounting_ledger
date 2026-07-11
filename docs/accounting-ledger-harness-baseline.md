> **Sub_harness-baseline_0.06** · 기록 2026-07-11

# Accounting Ledger Harness Baseline

## 기준선

| 항목 | 관찰 결과 |
|---|---|
| 기준 커밋 | `3013904 feat: add Supabase connection diagnostics for app 0.02` 이후 앱 0.03 작업 트리 |
| 앱 버전 | `0.03` |
| 런타임 | 단일 `index.html` 업무 앱. IndexedDB, 회계 도메인, Supabase/Auth adapter, 공개 연결 진단, 설정 SSOT 기반 연결 가이드 포함 |
| 패키지·스크립트 | `package.json`, `scripts/harness-check.mjs`, `npm run harness:check` |
| CI | `.github/workflows/harness.yml`에서 같은 하네스 실행 |
| 테스트 | 런타임 정적 계약 Required. 브라우저 왕복은 현재 수동 실행 |
| 데이터 | Supabase 초기 스키마와 로컬 migration 4개 존재 |
| 사용자 참고 파일 | Excel·PDF·ZIP 4개가 미추적 상태이며 커밋 제외 대상 |

최초 설계 기준선에는 자동 검사가 없었다. 앱 0.01부터 런타임 계약은 Required로 승격했고, 실제 브라우저 왕복은 자동화 전까지 Manual 결과와 시나리오를 이 문서에 남긴다.

## 하네스 등급

| 게이트 | 등급 | 현재 상태 | 근거 |
|---|---|---|---|
| project-contract | Required | 활성 | 공통 지침, 하네스, CI, 핵심 설계 문서, 회계 도메인 Guardian, 코드 설계 Guardian 스킬 존재 확인 |
| instruction-contract | Required | 활성 | AI 공통 규칙에 동기화·RLS·하네스·도메인 Guardian·코드 설계 Guardian 규칙이 있는지 확인 |
| migration-contract | Required | 활성 | 초기 migration 4개와 RLS·canonical sync 표식 확인 |
| tracked-scope-and-secrets | Required | 활성 | 참고 원본 커밋과 자격증명 형태의 값 차단 |
| git-diff-integrity | Required | 활성 | staged/unstaged diff 공백 오류 차단 |
| runtime-version-contract | Required | 활성 | `APP_INFO.version`, `UPDATE_HISTORY`, 정확한 버전 증가, 핵심 레이어·동기화·연결 가이드 SSOT·고정 의존성 표식 확인 |
| browser-roundtrip | Manual | 실행 | Data API 정상, 익명 회계자료 차단, Google OAuth 사용 가능, owner 로그인·초기 동기화 완료. 가이드 1280px desktop·390x844 mobile, 메뉴 위치, 긴 값 overflow 없음, 복사 알림, console error 0건 확인 |
| Supabase advisor/RLS 실측 | Manual | 실행 | 회계 테이블 RLS 유지, active owner allowlist 1건, Auth user 1명, Google identity 1건, 익명 `businesses` 0건. 기존 비회계 advisor 항목은 범위 밖으로 유지 |

## 공식 명령

```powershell
npm run harness:check
```

이 명령은 파일을 수정하지 않는 순수 검증이다. Required 게이트 중 하나라도 실패하면 비정상 종료한다. Baseline과 Manual은 현재 자동화하지 않은 항목을 숨기지 않고 보고하며, Required 실패로 계산하지 않는다.

## 향후 활성화 순서

1. 브라우저 왕복 시나리오를 자동 실행 가능한 테스트로 옮겨 Required로 승격한다.
2. JSON 백업·복원 왕복과 실제 파일 다운로드 검증을 자동화한다.
3. canonical version 변경, tombstone, 원격 병합 시나리오를 mock 또는 별도 테스트 프로젝트로 자동화한다.
4. Supabase 스키마·RLS 변경 시 원격 advisor 검증 절차를 수동에서 자동 또는 Required 검토로 승격한다.

## 금지사항

- Required 검사를 Advisory 또는 Manual로 낮춰 통과시키지 않는다.
- 실패하는 검사를 삭제·우회·항상 성공하는 wrapper로 바꾸지 않는다.
- 하네스 도입만으로 앱 코드, 데이터 구조, 운영 Supabase 데이터를 변경하지 않는다.
- 실행하지 못한 검사를 통과한 것처럼 보고하지 않는다.
