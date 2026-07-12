# Accounting Ledger 데이터 도메인 × 생명주기 매트릭스

> 개정 2026-07-11 · 대상 앱 버전 `0.12`
> 목적: 각 데이터 종류(도메인)가 생명주기 노드(로컬저장·로드·백업·복원·동기화 push·merge·최종본·삭제→tombstone·개수/버전)에 빠짐없이 배선됐는지 한눈에 보고, "다른 도메인엔 있는 노드가 특정 도메인만 조용히 빠진" 버그 클래스를 원천 차단한다. 새 동기화 도메인을 추가하면 이 표에도 반드시 추가한다(하네스 `data-lifecycle-matrix` 게이트가 강제).

범례: ✓ 배선됨 · ✗ 미배선(gap) · ⊘ 데이터 클래스상 의도적 제외

## 데이터 클래스

의도적 제외는 개별 나열이 아니라 아래 "클래스"에서 파생한다.

| 클래스 | 도메인 | 제외 규칙 |
|---|---|---|
| ledger-synced | businesses, business_sites, ledger_period_settings, accounts, counterparties, source_transactions, journal_entries, journal_entry_lines, evidence_files, period_closings | 전 노드 배선 대상 |
| append-only-audit | audit_logs (+ 클라우드 auth_access_logs) | 수정·삭제·tombstone 없음(감사 무결성). 병합은 append |
| sync-infra | sync_queue, tombstones | 사용자 도메인 아님. tombstone은 삭제 "신호" 자체 |
| local-only | app_research_notes | 동기화·최종본·삭제 제외(기기 로컬 개발 메모) |
| config-localStorage | supabase/cloudinary/canonical 설정, deviceId | IDB 백업 아님. localStorage에 별도 보관 |
| owner-reference | app_allowed_users, accounting_sync_meta | owner 관리 흐름으로 별도 배선(§허용 사용자·최종본). ledger 백업 대상 아님 |

## 매트릭스 (ledger-synced + infra)

| 도메인 | 로컬저장 | 로드(state) | 백업 | 복원 | push | merge | 최종본 | 삭제→tombstone | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| businesses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓(가드) | ⊘ | 0.36부터 사용자당 여러 개(가계부 추가) 가능. `state.config.activeBusinessId`(로컬)로 "지금 보는" 가계부만 고르고, 나머지 도메인은 `reload()`가 그 가계부 id로 필터링. 가계부 삭제 흐름은 아직 없음 |
| business_sites | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | 사업장 삭제 후속 |
| ledger_period_settings | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | state 미보관, setupBusiness에서 ad-hoc 읽기 |
| accounts | ✓ | ✓ | ✓ | ✓ | ✓(remoteSafe) | ✓ | ✓ | ✓ | local_key/설명은 remote 제외. 0.33에서 사용자 추가 계정과목 비활성화(소프트삭제) 배선 |
| counterparties | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0.34에서 거래처 비활성화(소프트삭제) 배선. `deactivateAccount`와 동일 패턴 |
| source_transactions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 기준 도메인(전 노드) |
| journal_entries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 거래와 동반 삭제 |
| journal_entry_lines | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 거래와 동반 삭제 |
| evidence_files | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0.12에서 증빙 제거(soft-delete+tombstone) 배선. Cloudinary 원본 삭제는 서명 필요라 후속 |
| audit_logs | ✓ | ✓ | ✓ | ✓ | ✓(append) | ✓ | ✓ | ⊘ | append-only |
| period_closings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | 0.37에서 마감·마감해제 실동작 배선(`AppService.closePeriod`/`reopenPeriod`, `AccountingDomain.isDateClosed`가 저장·삭제를 실제로 막음). 삭제→tombstone은 의도적 제외 — 재개방은 행 삭제가 아니라 `status`를 다시 `'open'`으로 되돌리는 갱신이라 마감 이력(`closed_at`/`reopened_at`)이 감사 기록으로 남는다 |
| tombstones | ✓ | ✗ | ✓ | ✓ | ✓ | ✓(apply) | ✓(apply) | ⊘ | 삭제 신호 자체 |
| sync_queue | ✓ | ✓(개수) | ✓ | ✓ | ⊘ | ⊘ | superseded | ⊘ | 오프라인 대기열 |
| app_research_notes | ✓ | ✗ | ✓ | ✓ | ⊘ | ⊘ | ⊘ | ⊘ | local-only |

## Gap 심각도순과 수정안 (형제 도메인 대조)

1. ~~evidence_files 삭제→tombstone 미배선~~ **(0.12 해결)**. `AppService.removeEvidence`가 형제 `deleteTransaction`과 동일 규칙(soft-delete + tombstone + 감사 + 큐)으로 증빙 링크를 제거하고, 다른 증빙이 없으면 거래를 `not_attached`로 되돌린다. Cloudinary **원본** 삭제는 서명 API(secret) 필요라 브라우저 직접 불가 → `delete_status='unlinked'` 표시 후 Edge Function 후보.
2. ~~counterparties 삭제 미배선~~ **(0.34 해결)**. `AppService.deactivateCounterparty`가 형제 `deactivateAccount`와 동일 규칙으로 비활성화하고, 설정 화면 "거래처 관리" 패널에서 조작한다.
3. **import 미리보기 부재** (중간, 백업/가져오기 대칭). `imports`는 placeholder다. 실제 구현 시 백업 5봉합점(백업 생성·읽기·적용·미리보기 계산·미리보기 표시)을 대칭으로 배선하고, 미리보기는 적용과 같은 규칙(id 키·merge/append/replace)으로 계산한다.
4. **ledger_period_settings·tombstones·app_research_notes state 미보관** (낮음/의도적). ad-hoc 읽기 또는 infra라 reload state에 담지 않는다.

## 불변조건 (교훈 반영)

- 빈 클라우드 가드: canonical replace는 클라우드 businesses가 0이고 로컬에 있으면 중단(`EMPTY_CLOUD_GUARD`)해 wipe를 막는다. 일반 merge 경로는 로컬을 Map 기반으로 유지해 빈 응답에도 소실되지 않는다.
- 삭제는 hard delete 금지: `deleted_at` + tombstone. 병합은 updated_at 최신 승리라 삭제(갱신된 updated_at)가 오래된 활성 행을 이긴다.
- 백업은 `LOCAL_STORES` 기반이라 새 도메인이 자동 포함되고, tombstones·schemaVersion·canonicalVersion을 함께 담는다.
