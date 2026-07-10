> 기준일: 2026-07-11
> 앱 버전: `0.01`
> 상태: 첫 단일 HTML 런타임과 로컬 회계 코어 구현 완료, 외부 연동·V1 확장 기능 구현 중

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
| 최근 기준 커밋 | `f7d1a5a docs: add privacy and offline guardians`. 앱 0.01 변경은 현재 작업 트리 기준 |

## 다음 구현 우선순위

앱 `0.02`는 아래 순서로 진행한다.

1. 실제 publishable key와 Redirect URL 설정 후 Google OAuth·allowlist·RLS 브라우저 왕복 검증
2. 일반 동기화와 canonical version 변경 수렴의 다기기 자동 테스트
3. Cloudinary 이미지/PDF 업로드와 증빙 파일 메타·삭제 상태 연결
4. 국세청 간편장부 Excel import 미리보기·원본 행 보존·확정 흐름
5. 거래 수정·soft delete·마감 후 변경 통제와 감사로그 고도화
6. 법정서식 스냅샷과 리포트 필드 매핑

현재 0.01에서 외부 설정 없이 검증한 범위는 로컬 IndexedDB 저장, 사업자 설정, 2025 소급 거래 입력, VAT 금액 후보 분리, 복식 전표 균형, 장부·개발자 모드 표시다. Google OAuth 실로그인, 원격 RLS, Cloudinary, Excel, 법정서식 출력은 아직 완료 기능이 아니다.

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
