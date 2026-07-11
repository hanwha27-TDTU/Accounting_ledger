> **📌 Sub_auth-login_0.03** · 개정 2026-07-11

# Accounting Ledger Auth/Login Skill

이 문서는 회계장부 앱의 로그인, 허용 사용자, RLS, 감사로그를 다룰 때 적용하는 별도 스킬 문서다. 앱 기능 개발 중 로그인, Google OAuth, Supabase Auth, allowlist, RLS, 접근 차단, 허용 사용자 추가/해제, Auth Hook을 만질 때 이 문서를 먼저 본다.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 로그인 방식 | Supabase Auth + Google OAuth 전용 |
| 초기 소유자 이메일 | `hanwha27@gmail.com` |
| 허용 사용자 원장 | Supabase `app_allowed_users` |
| 허용 사용자 관리 권한 | active owner만 |
| owner 판정 | 검증된 JWT 이메일 + active owner allowlist. 사업장 소유권은 `auth.uid()` |
| 비허용 계정 | 앱 데이터 접근 차단, 가능하면 사용자 생성 전 차단 |
| 비밀번호 로그인 | 사용하지 않음 |
| 익명 로그인 | 사용하지 않음 |
| service role key | 단일 HTML에 절대 포함 금지 |

## 운영 원칙

1. `hanwha27@gmail.com`을 bootstrap owner로 seed한다.
2. 첫 Google 로그인 때 Supabase `auth.users`와 Google `auth.identities`가 생성되고, JWT 이메일을 active allowlist와 대조한다.
3. 이후 허용 이메일 추가/해제/권한 변경은 active owner만 할 수 있다.
4. owner 관리 화면은 편의 기능일 뿐이고, 실제 보안은 RLS와 DB 정책으로 보장한다.
5. 클라이언트에서 이메일을 비교하는 로직은 UX 가드로만 사용한다.
6. 권한 판단은 사용자가 수정 가능한 `user_metadata`에 의존하지 않는다.
7. Google OAuth 외 provider는 기본 비활성으로 둔다.
8. Supabase 테이블은 명시적 `GRANT` + RLS + 정책을 한 묶음으로 관리한다.

## V1 현행 허용 사용자 테이블

```sql
create extension if not exists citext;

create table if not exists app_allowed_users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  status text not null check (status in ('active', 'blocked', 'pending')),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into app_allowed_users (email, role, status, label)
values ('hanwha27@gmail.com', 'owner', 'active', 'bootstrap owner')
on conflict (email) do nothing;

create table if not exists auth_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email citext,
  target_user_id uuid,
  target_email citext,
  action text not null,
  result text not null,
  reason text,
  created_at timestamptz not null default now()
);
```

## RLS 불변조건

| 대상 | 정책 |
|---|---|
| 회계 데이터 | active allowed user만 접근 |
| owner 전용 관리 | active owner만 insert/update/revoke |
| 허용 사용자 목록 | 본인 row 또는 owner만 조회 |
| 감사로그 | owner만 전체 조회, 일반 사용자는 본인 관련 로그만 제한 조회 |

주의:

- `TO authenticated`만으로는 부족하다. 반드시 owner 또는 allowed user 조건을 함께 둔다.
- UPDATE 정책에는 `USING`과 `WITH CHECK`를 함께 둔다.
- 같은 테이블을 RLS 정책에서 직접 재귀 조회하면 위험하므로, 필요하면 private schema의 검증 함수를 사용한다.
- `SECURITY DEFINER` 함수가 필요하면 public schema에 노출하지 않고, `auth.uid()` 검증과 execute revoke/grant를 명시한다.

## 로그인 흐름

```text
앱 열기
  -> Supabase 세션 확인
  -> 세션 없음: Google 로그인 버튼 표시
  -> Google OAuth 완료
  -> auth user email 확인
  -> app_allowed_users에서 active 여부 확인
  -> 허용됨: owner/editor/viewer 권한 로드 후 앱 진입
  -> 비허용: 접근 차단 안내, auth_access_logs 기록 시도, signOut
```

owner 최초 연결:

```text
if verified_jwt.email == 'hanwha27@gmail.com'
and app_allowed_users.email == 'hanwha27@gmail.com'
and app_allowed_users.status == 'active'
then allow owner access

businesses.owner_user_id는 로그인한 auth.uid()로 저장한다.
```

## 허용 계정 추가 흐름

```text
owner로 로그인
  -> 허용 계정 관리 화면
  -> 추가할 Google 이메일 입력
  -> 이메일 정규화(lowercase/trim)
  -> app_allowed_users upsert(status='pending' 또는 'active')
  -> auth_access_logs 기록
  -> 추가된 사용자가 Google 로그인
  -> 첫 로그인 뒤 JWT 이메일과 allowlist 상태 재확인
```

권장 기본값:

| 항목 | 기본값 |
|---|---|
| 일반 보조 사용자 | `role='editor'`, `status='active'` |
| 조회 전용 계정 | `role='viewer'`, 필요한 출력/조회 권한만 |
| 임시 허용 | `status='pending'`, 첫 로그인 후 active 확인 |
| 접근 해제 | hard delete 금지, `status='blocked'` 또는 `deleted_at` |

## Before User Created Hook

가장 강한 방식은 Supabase Before User Created Hook으로 허용되지 않은 이메일의 Auth 사용자 생성을 사전에 차단하는 것이다.

적용 원칙:

1. Hook은 `event.user.email`을 읽는다.
2. `app_allowed_users`에서 `status in ('pending', 'active')`인지 확인한다.
3. 없으면 403 에러를 반환해 사용자 생성을 거부한다.
4. 허용되면 빈 JSON `{}`을 반환한다.
5. Hook 함수 또는 Edge Function에는 secret key가 필요할 수 있으므로 단일 HTML에 넣지 않는다.

단계 전략:

| 단계 | 적용 |
|---|---|
| 1차 | Google OAuth + allowlist + RLS + 로그인 후 차단 |
| 강화 | Before User Created Hook으로 생성 전 차단 |
| 운영 | owner 화면에서 allowlist 관리, 변경 이력 감사로그 |

## 단일 HTML 금지사항

- service role key, secret key, Hook secret 저장 금지
- owner 권한을 localStorage 값만으로 판단 금지
- 비허용 계정 로그인을 단순 alert로만 처리 금지
- RLS 없는 세무 테이블 공개 금지
- 허용 사용자 변경을 감사로그 없이 처리 금지

## 2026-07-11 운영 프로젝트 검증 결과

| 항목 | 확인 결과 |
|---|---|
| 브라우저용 키 | modern publishable key 사용. secret/service role key는 사용하지 않음 |
| Data API | publishable key로 정상 응답 |
| 익명 RLS | 로그인 전 `businesses?select=id&limit=1`이 HTTP 200과 빈 배열을 반환 |
| RLS 정책 SQL | `businesses` SELECT는 `authenticated` 역할과 본인 `auth.uid()` 조건만 허용 |
| 현재 원격 row | `businesses` 0건. 빈 배열 검사는 노출 감지 canary이며 정책 검증은 SQL 결과와 함께 판정 |
| owner allowlist | `hanwha27@gmail.com` 1건 존재 |
| Auth 사용자 | `hanwha27@gmail.com` 1명 생성 확인 |
| Google identity | Google identity 연결 1건 확인 |
| Google provider | 활성. 실제 Google OAuth 왕복 성공 |
| owner allowlist 상태 | `owner`, `active`, `bootstrap owner`, `deleted_at is null` |
| 앱 동작 | Data API 정상, 익명 RLS 차단 정상, Google OAuth 사용 가능, owner 로그인과 초기 동기화 완료 |

빈 테이블의 익명 조회 결과만으로 RLS 정책 전체가 증명되지는 않는다. 런타임 진단은 데이터 노출 감지 장치로 사용하고, 릴리스 보안 검토에서는 `pg_policies`의 역할·조건을 함께 확인한다. Google 로그인 완료는 Auth 사용자, Google identity, active allowlist와 앱 세션을 함께 확인한다.

완료된 인증 연결과 별도로 남은 보안 검증은 다음과 같다.

1. 사업자 row를 생성한 뒤 `owner_user_id = auth.uid()` 저장과 인증 RLS CRUD를 왕복 검증한다.
2. 비허용 Google 계정의 앱 데이터 접근 차단과 자동 로그아웃을 검증한다.
3. owner가 허용 사용자를 추가·차단하는 관리 UI와 감사로그를 구현한 뒤 권한별 RLS를 검증한다.

## 앱 연결 가이드 SSOT 규칙

앱 `0.03`부터 `가이드 → 구글클라우드 연결방법`은 별도 하드코딩 문서가 아니라 런타임 기준값을 사용한다.

1. 앱 버전, owner 이메일, Google Cloud 프로젝트, OAuth 클라이언트 이름, GitHub Pages 주소는 `APP_INFO`를 읽는다.
2. Supabase Project URL과 callback은 현재 저장된 앱 설정을 읽어 계산한다.
3. Data API, 익명 RLS, Google provider, owner 로그인 완료 표시는 `connectionDiagnostics`, session, allowlist 상태를 읽는다.
4. Google Client Secret은 가이드 상수, 앱 상태, 문서, Git에 절대 저장하지 않는다.
5. `APP_INFO` 또는 인증 연결 계약을 바꾸면 가이드 렌더링과 하네스 표식도 같은 변경에서 검토한다.

## 검증 체크리스트

| 테스트 | 기대 결과 |
|---|---|
| owner 로그인 | `hanwha27@gmail.com`으로 앱 진입 및 허용계정 관리 가능 |
| 비허용 Google 로그인 | 앱 데이터 접근 차단 및 로그아웃 |
| owner가 이메일 추가 | allowlist에 추가되고 감사로그 생성 |
| 일반 사용자가 이메일 추가 시도 | RLS 또는 RPC에서 거부 |
| blocked 사용자 로그인 | 앱 접근 차단 |
| HTML 키 검사 | service role/secret 문자열 없음 |
| RLS 검사 | authenticated 전체허용 정책 없음 |
| Data API 검사 | 필요한 테이블만 explicit GRANT + RLS 적용 |
| provider 미설정 | 설정 필요 표시, Google 로그인 버튼 비활성 |
| 익명 공개 연결 | Data API는 응답하지만 회계 row는 0건 |

## 참고 공식 문서

- Supabase Google Auth: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Before User Created Hook: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Changelog: https://supabase.com/changelog
