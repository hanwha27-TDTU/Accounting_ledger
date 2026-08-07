# Accounting Ledger 데이터 도메인 × 생명주기 매트릭스

> 개정 2026-08-07 · 대상 앱 버전 `0.68`
> 목적: 각 데이터 종류(도메인)가 생명주기 노드(로컬저장·로드·백업·복원·동기화 push·merge·최종본·삭제→tombstone·개수/버전)에 빠짐없이 배선됐는지 한눈에 보고, "다른 도메인엔 있는 노드가 특정 도메인만 조용히 빠진" 버그 클래스를 원천 차단한다. 새 동기화 도메인을 추가하면 이 표에도 반드시 추가한다(하네스 `data-lifecycle-matrix` 게이트가 강제).

범례: ✓ 배선됨 · ✗ 미배선(gap) · ⊘ 데이터 클래스상 의도적 제외

## 데이터 클래스

의도적 제외는 개별 나열이 아니라 아래 "클래스"에서 파생한다.

| 클래스 | 도메인 | 제외 규칙 |
|---|---|---|
| ledger-synced | businesses, business_sites, ledger_period_settings, accounts, counterparties, fixed_expenses, source_transactions, journal_entries, journal_entry_lines, evidence_files, period_closings | 전 노드 배선 대상 |
| append-only-audit | audit_logs (+ 클라우드 auth_access_logs) | 수정·삭제·tombstone 없음(감사 무결성). 병합은 append |
| sync-infra | sync_queue, tombstones | 사용자 도메인 아님. tombstone은 삭제 "신호" 자체 |
| local-only | app_research_notes | 동기화·최종본·삭제 제외(기기 로컬 개발 메모) |
| config-localStorage | supabase/cloudinary/canonical 설정, deviceId, 최근 CBU 일일환율 캐시 | IDB 백업 아님. localStorage에 별도 보관. 환율 캐시는 재조회 가능한 참조 데이터이며 사용자 정본이 아님 |
| owner-reference | app_allowed_users, accounting_sync_meta | owner 관리 흐름으로 별도 배선(§허용 사용자·최종본). ledger 백업 대상 아님 |

## 매트릭스 (ledger-synced + infra)

| 도메인 | 로컬저장 | 로드(state) | 백업 | 복원 | push | merge | 최종본 | 삭제→tombstone | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| businesses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓(정확 비교) | ✓ | 0.36부터 사용자당 여러 개(가계부 추가) 가능. `state.config.activeBusinessId`(로컬)로 "지금 보는" 가계부만 고르고, 나머지 도메인은 `reload()`가 그 가계부 id로 필터링. 0.38에서 `AppService.deleteLedger`가 배선. 0.58부터 최종본 지정은 원격 전체와 비교해 로컬에 없는 business와 자식까지 tombstone+child-first 소프트삭제하고 version을 마지막에 갱신(audit_logs는 append-only라 제외) |
| business_sites | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | 사업장 삭제 후속 |
| ledger_period_settings | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | state 미보관, setupBusiness에서 ad-hoc 읽기 |
| accounts | ✓ | ✓ | ✓ | ✓ | ✓(remoteSafe) | ✓ | ✓ | ✓ | local_key/설명은 remote 제외. 0.33에서 사용자 추가 계정과목 비활성화(소프트삭제) 배선 |
| counterparties | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0.34에서 거래처 비활성화(소프트삭제) 배선. `deactivateAccount`와 동일 패턴 |
| fixed_expenses | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0.59에서 고정지출 CRUD·거래 입력 연계를 배선. 0.60에서 `currency_code`·`original_amount`·`exchange_rate_*`를 같은 행에 추가해 전 생명주기가 자동 적용된다. 저장 당시 `amount`는 KRW 예상액으로 유지하고, 최신 CBU 환율 화면 예상액은 행을 재작성하지 않는다 |
| source_transactions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 기준 도메인(전 노드). 0.60부터 원화 전기액(`total_amount`)과 원통화·원금액·환율 증거를 같은 행에 보존한다. legacy `foreign_*`는 구버전 클라이언트 호환용으로 함께 읽고 쓴다 |
| journal_entries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 거래와 동반 삭제 |
| journal_entry_lines | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 거래와 동반 삭제 |
| evidence_files | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0.12에서 증빙 제거(soft-delete+tombstone) 배선. Cloudinary 원본 삭제는 서명 필요라 후속 |
| audit_logs | ✓ | ✓ | ✓ | ✓ | ✓(append) | ✓ | ✓ | ⊘ | append-only |
| period_closings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | 0.37에서 마감·마감해제 실동작 배선(`AppService.closePeriod`/`reopenPeriod`, `AccountingDomain.isDateClosed`가 저장·삭제를 실제로 막음). 삭제→tombstone은 의도적 제외 — 재개방은 행 삭제가 아니라 `status`를 다시 `'open'`으로 되돌리는 갱신이라 마감 이력(`closed_at`/`reopened_at`)이 감사 기록으로 남는다 |
| tombstones | ✓ | ✗ | ✓ | ✓ | ✓ | ✓(apply) | ✓(apply) | ⊘ | 삭제 신호 자체 |
| sync_queue | ✓ | ✓(개수) | ✓ | ✓(격리) | ⊘ | ⊘ | superseded | ⊘ | 오프라인 대기열. 백업에는 감사·복구용으로 포함하지만 로컬 복원 시 pending 상태로 되살리지 않고 `quarantined_by_restore`로 격리 |
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
- 0.68 백업 스키마는 0.04다. 신규 백업은 생성/복원 공통 상한과 SHA-256, 필수 필드·참조·복식부기 균형 사전검증, 변경 건수 미리보기, 전체 store 단일 IndexedDB transaction을 사용한다. 기존 0.01~0.03 백업도 읽되 파일에 없던 저장소는 보존하고, `sync_queue`는 어떤 버전에서도 자동 재활성화하지 않는다.
- 환율 캐시는 canonical·백업 대상이 아니다. 각 기기가 CBU 같은 날짜의 공개 스냅샷을 다시 받을 수 있는 참조 데이터이고, 감사에 필요한 실제 적용환율·기준일·출처는 동기화되는 거래·고정지출 행 자체에 고정한다.
- 0.68부터 `accounting_export_snapshot()`이 클라우드 표·tombstone·canonical version을 한 statement snapshot으로 반환하고, 로컬 snapshot도 모든 store를 한 readonly transaction에서 읽는다. `restoreBackup`은 누락 store를 보존하되 현재 pending queue를 격리해 “이 기기만 복원”이 나중에 클라우드를 바꾸지 않게 한다.
- 일반 동기화는 cloud-first LWW다. 클라이언트가 먼저 최신 원격 행과 queue payload를 비교하고, DB `set_updated_at` trigger도 더 오래되거나 같은 `updated_at`의 UPDATE를 무시한다. 정본 발행은 `accounting_publish_canonical()` 한 transaction에서 expected canonical version을 `FOR UPDATE`로 잠그고 부모→자식 upsert, tombstone, 자식→부모 delete, version 갱신을 함께 commit한다.
- 0.58부터 tombstone은 무조건 승리하지 않고 `deleted_at`과 행의 `updated_at`을 비교한다. tombstone보다 나중에 canonical 복원된 활성 행은 유지하고, canonical 변경을 소비하는 기기는 로컬 tombstone을 재업로드하지 않는다.
- 가계부 자체를 삭제할 때는 그 business가 숨겨진 뒤에도 다른 기기가 삭제 신호를 읽어야 하므로 cascade tombstone을 의도적으로 `business_id = null`(허용 사용자 전용 RLS scope)로 기록한다. 개별 행 삭제는 기존처럼 활성 business scope를 유지한다.
- 원격 pull은 500행씩 `updated_at desc, id asc`(감사로그는 `created_at`)로 끝까지 페이지네이션한다. 일반 동기화는 마지막 성공 시각에서 5분 겹쳐 변경분을 받고, canonical·백업·강제 새로고침은 전체를 받는다.
