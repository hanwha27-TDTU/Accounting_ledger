> **Sub_harness-baseline_0.07** · 갱신 2026-08-07

# Accounting Ledger Harness Baseline

## 기준선

| 항목 | 관찰 결과 |
|---|---|
| 기준 커밋 | `5c84d99`에서 시작한 `codex/gate-controls-app-audit` 작업 트리 |
| 앱 버전 | `0.67` |
| 런타임 | 단일 `index.html` 업무 앱 + 별도 Capacitor Android 셸. IndexedDB, 복식부기, Supabase/Auth·RLS, canonical/tombstone, 외화·반복지출 포함 |
| 패키지·스크립트 | `package.json`, `scripts/harness-check.mjs`, `scripts/tests/{logic,app-audit,gate-controls}.test.mjs` |
| CI | `.github/workflows/harness.yml`에서 같은 하네스 실행 |
| 테스트 | 19개 Required 게이트마다 정상·결함주입 대조군 보유. 브라우저 왕복은 Manual을 유지하되 0.67 앱 내 브라우저 실측 완료 |
| 데이터 | Supabase migration 10개. schema 0.07 보안 마이그레이션과 tombstone owner FK 인덱스를 운영 DB에 적용하고 카탈로그·RLS·Advisor를 되읽었다. |
| 사용자 참고 파일 | Excel·PDF·ZIP 4개가 미추적 상태이며 커밋 제외 대상 |

최초 설계 기준선에는 자동 검사가 없었다. 앱 0.01부터 런타임 계약은 Required로 승격했고, 실제 브라우저 왕복은 자동화 전까지 Manual 결과와 시나리오를 이 문서에 남긴다.

## 하네스 등급

| 게이트 | 등급 | 현재 상태 | 근거 |
|---|---|---|---|
| Required 19개 | Required | 활성 | 파일·공급망·의존성·Action pin·지침·생성물·migration·비밀값·diff·버전·생명주기·로직·용어·법적 SSOT·개념·APK·설치문서·앱 감사·게이트 감도를 검사 |
| gate-controls | Required | 활성 | 18개 known-good 실행 + 19개 격리 결함 주입으로 19개 Required 모집단 전부 덮음. 자기 자신은 외부 정상 실행과 runner 제거 음성 대조군으로 증명 |
| app-audit | Required | 활성 | 접근성·저장 안내·HTTPS 증빙, 서명 APK, Android 백업, 백업/XLSX 자원 상한, tenant 보안 마이그레이션을 23개 정적 계약으로 고정 |
| browser-roundtrip | Manual | 실행 | 412×915 개인·사업 모드 전 화면 overflow 0, 개인/사업 거래 저장·균형 전표·새로고침 영속, 수정 후 접근성 라벨·저장 안내 확인, 콘솔 error 0 |
| Security standard scan | Manual/도구 | 완료 | 기준 커밋 `5c84d99` 전체 저장소를 독립 검토해 10건(High 4·Medium 4·Low 2)을 봉인. 9건은 작업 트리에서 보완, GitHub Pages 공유 origin 1건은 잔여 위험 |

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
