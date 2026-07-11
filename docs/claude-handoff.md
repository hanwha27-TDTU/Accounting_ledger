> 기준일: 2026-07-11
> 앱 버전: `0.09`
> 상태: canonical 최종본 지정(0.08)에 이어 Cloudinary unsigned 증빙 업로드와 evidence_files 메타 동기화(0.09)

## 앱 목적 (미션)

이 앱은 초등학생도 이해할 만큼 쉬운 화면으로 수입·지출을 관리하면서, 그 기록이 복식부기 SSOT와 최신 법정서식·세법 근거로 뒷받침되어, 사용자가 세무사 없이도 스스로 국세청에 세무사 수준의 최신 법적 신고자료를 만들 수 있게 AI 역량을 총동원해 돕는다. 쉬움과 정확성 어느 하나도 포기하지 않는다. SSOT는 `docs/accounting-ledger-design-directive-v2.md`의 `0. 최상위 결론`이다.

# Claude Handoff

이 문서는 이 저장소를 처음 받은 Claude가 현재 상태와 변경 금지선을 빠르게 파악하기 위한 인수인계 기준이다. Git의 최신 커밋과 작업 트리가 실제 변경 상태의 최종 기준이며, 이 문서는 중요한 결정의 요약이다.

## 시작 순서

1. `git status --short`, `git log --oneline -5`로 현재 상태를 확인한다.
2. `AGENTS.md`, 루트 `CLAUDE.md`를 읽는다.
3. 요청과 관련된 스킬 문서를 읽는다.
4. 코드·스키마·문서의 현재 상태를 확인한 뒤에만 구현 계획을 제시하거나 변경한다.

## 제품 기준

| 항목 | 확정 내용 |
|---|---|
| 제품 | 대한민국 개인사업자용 간편장부·복식부기 통합 회계 앱 |
| V1 형태 | 단일 HTML + GitHub Pages, PWA/APK 확장 가능 구조 |
| 사용자 | 개인사업자 1인 중심, 향후 복수 사업장·법인 확장 가능 DB |
| 회계 SSOT | 원천거래와 복식 전표. 간편장부는 입력/출력 view |
| 로그인 | Supabase Auth + Google OAuth only |
| 초기 owner | `hanwha27@gmail.com` |
| 로컬 저장 | IndexedDB/localStorage |
| 클라우드 | Supabase Postgres + RLS |
| 증빙 | Cloudinary 이미지/PDF 원본, DB에는 메타데이터 |
| 법정 리포트 | 최신 법정서식 스냅샷 확인 전에는 확정 출력 차단 |
| 앱 버전 | `0.00`에서 시작, 확정 사용자 변경마다 `0.01` 증가 |

## 완료된 사항

| 구분 | 완료 내용 |
|---|---|
| 설계 | V1 상세 설계, 스키마 설계, 화면 흐름, 범위 고정 |
| Supabase | 회계 테이블 38개, RLS 38/38, FK 보조 인덱스 누락 0개 |
| 동기화 | `updated_at` 병합, tombstone, `canonical_version` 최종본 모드 설계 |
| 로그인 | `app_allowed_users`에 owner allowlist seed, Google OAuth/RLS 정책 설계 |
| 운영 | 역할 기반 개발 운영·품질 게이트 및 연구노트 체계 도입 |
| 하네스 | Node 기반 `npm run harness:check` 및 동일 명령을 실행하는 GitHub Actions 도입 |
| 앱 0.01 | 단일 HTML 업무 대시보드, 사업자 설정, 거래 입력, 자동 복식분개, 장부·전표 검토, IndexedDB, JSON 백업·복원, Supabase/Auth adapter, 개발자 Guardian 레지스트리 구현 |
| 앱 0.02 | 운영 Supabase URL과 publishable key 기본 연결, Data API 응답·익명 `businesses` RLS 격리·Google provider 활성 상태 진단, provider 비활성 시 로그인 차단 구현 |
| 앱 0.03 | Google OAuth owner 실로그인과 Google identity·active owner allowlist 확인, 앱 설정·진단 state에 연동되는 단계별 연결 가이드와 복사 기능 구현 |
| 앱 0.04 | 로그인한 owner 권한으로 `businesses`에 격리된 임시 행을 만들어 생성·조회·수정·소프트삭제 격리·정리를 실제 RLS로 왕복 검증하는 설정 자가검증과 개발 기록 상태 표시 구현. 임시 행은 로컬 장부에 저장하지 않고 검증 종료 시 삭제 |
| 앱 0.05 | `관리 → 데이터 관리` 화면 추가. 로컬 저장 상태 확인, JSON 백업·복원, 클라우드 동기화, 거래 부분 삭제(전표·라인 동반 소프트삭제 + tombstone + 감사로그 + 동기화 큐), 이 기기 전체 삭제를 2열 대칭 그리드로 통합. 백업·복원은 설정에서 데이터 관리로 이동 |
| 앱 0.06 | tombstone 기반 다기기 삭제 수렴. `SyncService.convergeTombstones`가 동기화 시 로컬 tombstone을 클라우드에 push(ignore-duplicates)하고 cloud tombstone을 pull해 모든 기기에 소프트삭제를 멱등 적용. RLS SELECT가 `deleted_at is null`로 삭제 행을 숨겨 pull로 전파되지 않던 삭제가 tombstone 채널로 수렴. `tombstones` 테이블·RLS는 기존 스키마 사용(마이그레이션 없음) |
| 앱 0.07 | 소유자 전용 허용 사용자 관리. 설정에 `허용 사용자 관리(owner 전용)` 패널을 추가해 `app_allowed_users`를 조회·추가·차단(status blocked)·재허용(active)하고 변경을 `auth_access_logs`에 기록. bootstrap owner(`hanwha27@gmail.com`)에게만 노출, 소유자 자기 차단 방지 가드. role은 `owner/editor/viewer`, status는 `active/blocked/pending` CHECK 제약에 맞춤. 비허용 계정은 기존 `checkAllowed`가 `status='active'` 아니면 차단·로그아웃. 마이그레이션 없음 |
| 앱 0.08 | canonical version 최종본 지정 배선. 데이터 관리 동기화 카드의 owner 전용 `이 기기를 최종본으로` 버튼이 `SyncService.designateCanonical`을 호출해 전체 로컬 행·tombstone을 클라우드에 업로드하고 `accounting_sync_meta.canonical_version`을 +1. 다른 기기는 기존 소비 경로(`cloudCanonical > localCanonical` → 전체 replace)에서 로컬 전용 변경을 버리고 수렴. `accounting_sync_meta` 쓰기는 bootstrap owner 전용(RLS). 다기기 자동 테스트 9/9 통과. 마이그레이션 없음 |
| 앱 0.09 | Cloudinary 증빙 첨부. `CloudinaryAdapter`(unsigned preset 전용, secret 차단)로 증빙 화면에서 거래별 이미지·PDF 업로드, `AppService.attachEvidence`가 `evidence_files` 메타를 로컬 저장 + 동기화 큐 반영하고 거래를 `attached`로 표시. `evidence_files`를 IDB store(버전 1→2, 추가형)와 `SYNC_TABLE_ORDER`에 편입. 썸네일은 URL 변환으로 파생, 감사로그는 secure_url 대신 public_id만 보관. 설정에 Cloudinary cloud name·preset 입력 폼. `evidence_files` 테이블·RLS는 기존 스키마 사용(마이그레이션 없음) |
| 최근 기준 커밋 | `ecb1ac8 feat: canonical version designation and multi-device convergence for app 0.08`. 앱 0.09 변경은 `claude/businesses-crud-rls-validation-v5dzbu` 브랜치 기준 |

## 다음 구현 우선순위

다음 사용자 영향 변경은 앱 `0.06`이며 아래 순서로 진행한다.

1. (완료 · 0.04) 인증 사용자 기준 `businesses` CRUD와 RLS 왕복 검증
2. (완료 · 0.07) 비허용 Google 계정 차단과 owner 허용 사용자 관리 흐름 검증
3. (완료 · 0.08) 일반 동기화와 canonical version 변경 수렴의 다기기 자동 테스트 (0.06 tombstone 삭제 수렴 + 0.08 canonical 최종본 지정 배선·자동 테스트 9/9. 실브라우저 2대 왕복은 수동 체크리스트로 남음)
4. (완료 · 0.09) Cloudinary 이미지/PDF 업로드와 증빙 파일 메타 연결 (첨부·조회·동기화 구현. 증빙 삭제/교체와 Cloudinary 원본 삭제(서명 필요)는 후속)
5. 국세청 간편장부 Excel import 미리보기·원본 행 보존·확정 흐름
6. 거래 수정·마감 후 변경 통제와 감사로그 고도화 (0.05에서 거래 부분 소프트삭제 구현)
7. 법정서식 스냅샷과 리포트 필드 매핑

0.04에서 로그인한 owner 세션의 access token으로 `businesses` INSERT·SELECT·UPDATE·soft delete·DELETE를 실제 REST로 왕복하는 자가검증을 구현했다. Supabase `businesses` 정책은 SELECT `owner_user_id = auth.uid() and deleted_at is null`, INSERT `owner_user_id = auth.uid() and accounting_is_allowed_user()`, UPDATE·DELETE `owner_user_id = auth.uid()`로 확인했고(RLS 4/4), owner allowlist는 `hanwha27@gmail.com:owner:active`, canonical_version은 `0`이다. owner uid `c9ff5188-51a7-4c01-b653-b6e1d73d0790`로 시뮬레이션한 인증 세션에서 create·read·update 왕복이 통과했으며, soft delete 격리와 정리는 확인된 SELECT/DELETE 정책의 직접 결과다. 실제 브라우저 owner 로그인 왕복은 수동 체크리스트로 남는다. Cloudinary, Excel, 법정서식 출력은 아직 완료 기능이 아니다.

0.05에서 `데이터 관리` 화면을 추가해 저장 상태 확인, JSON 백업·복원, 클라우드 동기화, 거래 부분 삭제, 이 기기 전체 삭제를 2열 대칭 그리드로 통합했다. 거래 부분 삭제는 원천거래와 그 전표·전표라인을 함께 `deleted_at` 소프트삭제하고 `tombstones`·`audit_logs`·`sync_queue`에 반영한다. 일괄 삭제는 IndexedDB store만 비우고 localStorage의 Supabase 연결 설정·기기 식별자는 유지한다.

0.06에서 다기기 삭제 수렴을 구현했다. `SyncService.convergeTombstones`가 매 동기화에서 cloud tombstone을 pull, cloud에 없는 로컬 tombstone을 push(`resolution=ignore-duplicates`로 append-only 안전), 모든 tombstone을 해당 store의 로컬 행에 멱등 소프트삭제로 적용한다. `businesses` 등 SELECT RLS가 `deleted_at is null`로 삭제 행을 숨겨 pull로는 전파되지 않던 삭제가 tombstone 채널로 모든 기기에 수렴한다. `tombstones` 테이블은 이미 존재(컬럼 8개, RLS SELECT/INSERT = `(business_id is null and accounting_is_allowed_user()) or accounting_can_access_business(business_id)`, UPDATE/DELETE 정책 없음=append-only)해 마이그레이션이 없었다. 좀비 데이터 방지 근거: (a) 삭제 행은 `updated_at` 최신값 승리 병합에서 활성 복사본에 덮이지 않고, (b) 동기화는 `sync_queue` 항목만 업로드해 비-큐 로컬 행을 재업로드하지 않으며, (c) 삭제 전파는 tombstone으로만 이뤄진다. 로직 테스트 7/7(다기기 수렴·멱등성·재생성 없음·미지 store 안전), owner 인증 tombstone INSERT/SELECT DB 검증(롤백)을 통과했다.

남은 잠재 좀비 트랩: 향후 거래 **수정(update)** 기능을 추가하면, 다른 기기에서 이미 삭제됐지만 아직 tombstone을 못 받은 행을 편집·재업로드해 되살릴 수 있다. 수정 기능 구현 시 upsert 전에 `tombstones`/`deleted_at`를 확인해 tombstoned id는 되살리지 않도록 가드해야 한다. 현재는 거래 수정 UI가 없어 트리거되지 않는다.

0.07에서 소유자 전용 허용 사용자 관리 흐름을 구현했다. `SupabaseAdapter`의 `listAllowedUsers`/`insertAllowedUser`/`updateAllowedUser`/`logAccessEvent`와 `SyncService`의 `loadAllowedUsers`/`addAllowedUser`/`setAllowedUserStatus`로, 설정의 owner 전용 패널에서 `app_allowed_users`를 조회·추가·차단·재허용한다. `app_allowed_users` CHECK 제약(role `owner/editor/viewer`, status `active/blocked/pending`)에 앱 값을 맞췄다(이전 초안의 `member`/`revoked`는 제약 위반이라 수정). DB 검증(모두 롤백): owner 인증 세션에서 insert(viewer/active)·update(blocked)·`auth_access_logs` insert·전체 조회(2행) 통과. 비-owner(`intruder@example.com`) 세션은 `accounting_is_bootstrap_owner()=false`, allowlist 가시 행 0, insert는 RLS 42501로 차단됨을 확인했다. 소유자 자기 차단은 `ALLOWLIST_OWNER_PROTECTED` 가드로 막는다. 마이그레이션 없음. `auth_access_logs` 컬럼: id(default)·actor_user_id·actor_email·action·target_email·result·detail·created_at.

0.08에서 canonical version 최종본 지정을 배선했다. 지금까지 cloud `canonical_version`을 아무도 올리지 않아 잠들어 있던 수렴 소비 경로가, owner의 `designateCanonical`(전체 로컬+tombstone 업로드 후 `accounting_sync_meta.canonical_version` +1)로 활성화됐다. `accounting_sync_meta`는 SELECT=allowed user, INSERT/UPDATE/DELETE=bootstrap owner 전용. 다기기 시뮬레이션 자동 테스트 9/9(일반 병합 수렴, tombstone 삭제 수렴·무재생성, canonical 지정 시 소비 기기가 로컬 전용 변경을 버리고 수렴, 지정 기기가 삭제를 되살리지 않음)와 owner canonical upsert DB 검증(롤백, 실제 canonical은 0 유지)을 통과했다.

0.09에서 Cloudinary 증빙 첨부를 구현했다. 하드룰(secret 금지)에 따라 브라우저에서 제한된 unsigned upload preset으로만 업로드한다(`https://api.cloudinary.com/v1_1/{cloud}/{image|auto}/upload` + `upload_preset`). `evidence_files`(24열)와 `evidence_documents`는 기존 스키마·RLS(business-scoped)를 그대로 사용해 마이그레이션이 없었고, IDB는 버전 1→2로 `evidence_files` store를 추가(추가형, 기존 데이터 보존)했다. 로직 테스트 15/15(썸네일 URL 변환, 업로드 요청 구성·resource_type, upload_preset 전송, secret 차단, 메타 구성·감사 public_id 보관), owner `evidence_files` insert/read DB 검증(롤백)을 통과했다. 실제 파일 업로드 왕복은 사용자의 Cloudinary cloud name·unsigned preset과 브라우저가 필요하므로 수동 체크리스트로 남는다. 남은 후속: 증빙 삭제·교체 UI, Cloudinary 원본 삭제(서명 API=secret 필요, 브라우저 직접 불가 → Edge Function 후보), evidence_documents 그룹핑, 파일 해시.

다음 단계로는 국세청 간편장부 Excel import(#5)를 진행한다.

아직 구현하지 않은 기능을 완료된 기능처럼 보이게 하는 UI는 만들지 않는다.

## 변경 금지선

1. RLS를 제거하거나 `authenticated` 전체 허용 정책으로 바꾸지 않는다.
2. `service_role`, Cloudinary API secret, OAuth client secret을 브라우저·저장소·Git에 넣지 않는다.
3. `canonical_version`을 단순 양방향 upsert와 혼동하지 않는다. 최종본 변경을 감지한 기기는 클라우드 기준으로 수렴하고 재업로드하지 않는다.
4. 마이그레이션 계획 없이 Supabase·IndexedDB·백업의 데이터 계약을 바꾸지 않는다.
5. 법정서식 최신 검증 없이 세무 신고용 “확정” 출력이라고 표시하지 않는다.
6. 기존 비회계 Supabase 테이블(`news_items`, `language_sync_meta`, `vocab_items`, `usmle_cards`)을 이번 앱 작업 범위로 임의 변경하지 않는다.
7. 참고용 Excel·PDF·ZIP 파일을 명시적 요청 없이 커밋하지 않는다.
8. 원격 push나 배포는 사용자 요청 없이 실행하지 않는다.
9. 연결 가이드의 공개 설정값은 `APP_INFO`, `GuideService`, 런타임 진단 state에서 읽고 Client Secret은 표시하거나 저장하지 않는다.

## 배포 요청 처리

사용자가 “배포해주세요”라고 말하면 검증, 필요한 커밋, main 반영, 원격 push, 가능한 호스팅 배포, Claude 인수인계 메시지 작성을 포함해 진행한다.

현재 저장소는 `main` 직접 작업 흐름이다. 기능 브랜치에서 작업 중인 경우에는 사용자 승인 없이 강제 push, rebase, reset 같은 파괴적 재작성은 하지 않고, main 반영 전략을 먼저 확인한다.

## 필수 참조 문서

| 목적 | 문서 |
|---|---|
| 최상위 요구사항 | `docs/accounting-ledger-design-directive-v2.md` |
| 상세 아키텍처 | `docs/accounting-ledger-v1-detailed-design.md` |
| 데이터 계약 | `docs/accounting-ledger-v1-schema-design.md` |
| 화면/사용 흐름 | `docs/accounting-ledger-v1-screen-flow.md` |
| 연구노트 | `docs/accounting-ledger-app-research-notes.md` |
| 개발 품질 게이트 | `docs/skills/accounting-development-governance-skill.md` |
| 회계 도메인 Guardian | `docs/skills/accounting-domain-guardians-skill.md` |
| 코드 설계 Guardian | `docs/skills/accounting-code-architecture-guardians-skill.md` |
| 하네스 기준선 | `docs/accounting-ledger-harness-baseline.md` |
| 하네스 운영 스킬 | `docs/skills/accounting-harness-quality-gate-skill.md` |
| Claude 협업 규칙 | `docs/skills/accounting-claude-collaboration-skill.md` |
| 작업 요청 템플릿 | `docs/claude-task-template.md` |

## 작업 완료 인수인계 형식

작업을 마치면 아래를 짧게 남긴다.

| 항목 | 기록 내용 |
|---|---|
| 작업 | 구현 또는 조사한 내용 |
| 변경 파일 | 추가·수정·삭제 파일 |
| 데이터 영향 | Supabase, IndexedDB, import/export, 동기화 영향 여부 |
| 보안 영향 | Auth, RLS, 비밀키, 증빙 접근 영향 여부 |
| 검증 | 실행한 테스트와 결과 |
| 미완료/위험 | 남은 작업, 의도적으로 제외한 항목 |
| 버전/기록 | 앱·스킬 버전, 연구노트 갱신 여부, 커밋 |

중요 결정이나 다음 작업의 전제 조건이 바뀌면 이 문서와 `docs/accounting-ledger-app-research-notes.md`를 같은 작업에서 갱신한다.
