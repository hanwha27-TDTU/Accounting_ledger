> **Sub_harness-baseline_0.02** · 기록 2026-07-11

# Accounting Ledger Harness Baseline

## 기준선

| 항목 | 관찰 결과 |
|---|---|
| 기준 커밋 | `da077ce docs: add Claude collaboration handoff` |
| 앱 버전 | `0.00` |
| 런타임 | `index.html` 없음. 앱 구현 시작 전 |
| 패키지·스크립트 | 기존 `package.json`, `scripts/`, 테스트 명령 없음 |
| CI | 기존 GitHub Actions 없음 |
| 테스트 | 자동 테스트·브라우저 테스트 없음 |
| 데이터 | Supabase 초기 스키마와 로컬 migration 4개 존재 |
| 사용자 참고 파일 | Excel·PDF·ZIP 4개가 미추적 상태이며 커밋 제외 대상 |

기준선 조사에서 기존 실패한 자동 검사는 발견되지 않았다. 기존 자동 검사 자체가 없었으므로, 이 문서의 “없음”은 통과가 아니라 도입 전 상태를 뜻한다.

## 하네스 등급

| 게이트 | 등급 | 현재 상태 | 근거 |
|---|---|---|---|
| project-contract | Required | 활성 | 공통 지침, 하네스, CI, 핵심 설계 문서, 회계 도메인 Guardian 스킬 존재 확인 |
| instruction-contract | Required | 활성 | AI 공통 규칙에 동기화·RLS·하네스·도메인 Guardian 규칙이 있는지 확인 |
| migration-contract | Required | 활성 | 초기 migration 4개와 RLS·canonical sync 표식 확인 |
| tracked-scope-and-secrets | Required | 활성 | 참고 원본 커밋과 자격증명 형태의 값 차단 |
| git-diff-integrity | Required | 활성 | staged/unstaged diff 공백 오류 차단 |
| runtime-version-contract | Baseline | 대기 | `index.html` 생성 시 `APP_INFO.version`, `UPDATE_HISTORY`, `0.01` 증가 규칙 자동 활성화 |
| browser-roundtrip | Manual | 대기 | 런타임과 브라우저 테스트 도구 도입 전에는 수동 점검 |
| Supabase advisor/RLS 실측 | Manual | 대기 | 별도 인증이 필요한 원격 점검. 스키마·RLS 변경 시 수행 |

## 공식 명령

```powershell
npm run harness:check
```

이 명령은 파일을 수정하지 않는 순수 검증이다. Required 게이트 중 하나라도 실패하면 비정상 종료한다. Baseline과 Manual은 현재 자동화하지 않은 항목을 숨기지 않고 보고하며, Required 실패로 계산하지 않는다.

## 향후 활성화 순서

1. `index.html`을 처음 추가할 때 `APP_INFO.version = '0.01'`과 `UPDATE_HISTORY`를 함께 추가한다.
2. 거래 저장·복원 기능이 생기면 IndexedDB/백업 왕복 테스트를 추가하고 Required로 올린다.
3. 동기화 기능이 생기면 canonical sync 시나리오를 자동 테스트로 추가한다.
4. UI가 생기면 Playwright 등의 실제 브라우저 왕복 테스트를 연결하고 CI에 포함한다.
5. Supabase 스키마·RLS 변경 시 원격 advisor 검증 절차를 수동에서 자동 또는 Required 검토로 승격한다.

## 금지사항

- Required 검사를 Advisory 또는 Manual로 낮춰 통과시키지 않는다.
- 실패하는 검사를 삭제·우회·항상 성공하는 wrapper로 바꾸지 않는다.
- 하네스 도입만으로 앱 코드, 데이터 구조, 운영 Supabase 데이터를 변경하지 않는다.
- 실행하지 못한 검사를 통과한 것처럼 보고하지 않는다.
