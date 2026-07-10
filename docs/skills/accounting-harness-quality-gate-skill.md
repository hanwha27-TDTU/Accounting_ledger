> **Sub_harness-quality-gate_0.01** · 개정 2026-07-10

# Accounting Ledger Harness Quality Gate Skill

이 문서는 회계장부 앱의 구현·수정·릴리스 전에 프로젝트 하네스를 실행하고, 게이트 결과를 해석하고, 새 기능에 맞춰 자동 검사를 승격할 때 적용한다. `npm run harness:check`, GitHub Actions, 버전 증가, 정적 계약 검사, 브라우저·복원·동기화 테스트를 다룰 때 이 문서를 먼저 읽는다.

## 기본 절차

1. 작업 전 `git status --short`, `git diff --stat`, `git diff`로 기준선을 확인한다.
2. 관련 코드, 스킬, 설계, 기존 검사를 확인한다.
3. 가장 작은 변경을 적용한다.
4. `npm run harness:check`를 실행한다.
5. 실패 시 게이트 이름과 원인을 재현하고 최소 수정 후 재실행한다.
6. `git diff --check`, 변경 파일, 앱·스킬 버전, 연구노트를 검토한다.

## 게이트 등급

| 등급 | 의미 | 완료 판정 |
|---|---|---|
| Required | 현재 자동화되어 반드시 통과해야 하는 검사 | 하나라도 실패하면 완료 선언 금지 |
| Baseline | 현재 기능이 아직 없어 준비 상태만 기록하는 검사 | 기능 도입 시 Required로 승격 검토 |
| Advisory | 개선 권고. 현재 작업을 막지는 않음 | 결과와 근거를 보고 |
| Manual | 자동화가 어려워 사람이 또는 연결된 외부 도구로 확인 | 실행 여부와 결과를 보고 |

## 현재 Required 게이트

| 게이트 | 실제 검증 |
|---|---|
| project-contract | 하네스, 공통 지침, CI, 핵심 설계 파일 존재 |
| instruction-contract | AGENTS/CLAUDE에 canonical sync, RLS, 하네스 지침 존재 |
| migration-contract | 초기 migration 4개와 RLS·canonical sync 표식 |
| tracked-scope-and-secrets | 참고 원본의 추적 여부와 자격증명 형태 값 |
| git-diff-integrity | staged/unstaged diff 공백 오류 |

## 런타임 도입 후 규칙

`index.html`이 생기면 하네스가 자동으로 다음을 검사한다.

1. `APP_INFO.version`은 두 자리 소수 버전이다.
2. 첫 런타임 버전은 `0.01`이다.
3. `index.html` 변경 때 이전 버전에서 정확히 `+0.01` 증가한다.
4. `UPDATE_HISTORY`에 현재 버전이 포함된다.
5. 최신 표시는 하나만 존재한다.

실제 UI와 저장 기능이 생기면 버전·브라우저·복원·동기화 게이트를 기존 코드와 테스트 구조에 맞춰 Required로 확장한다. 존재하지 않는 `DOMAIN_REGISTRY`, Playwright, 백업 포맷을 추측해 만들지 않는다.

## 실패 보고

실패·생략·수동 확인은 다음 중 하나로 구분한다.

| 구분 | 예시 |
|---|---|
| 기존 실패 | 변경 전부터 재현된 실패 |
| 신규 실패 | 현재 변경으로 새로 발생한 실패 |
| 환경 의존 실패 | Node, 브라우저, 인증 등 실행 환경 부족 |
| 실행 불가 | 필요한 런타임·도구가 아직 없음 |
| 수동 확인 필요 | 원격 RLS advisor, OAuth 설정, 법정서식 최신성 |

## 금지사항

- 테스트·validator·CI를 삭제하거나 약화해 통과시키지 않는다.
- 빈 성공 wrapper를 만들지 않는다.
- 하네스 작업에서 앱 코드·스키마·운영 DB를 불필요하게 바꾸지 않는다.
- 자동화되지 않은 검사를 통과했다고 보고하지 않는다.
