> **Sub_code-architecture-guardians_0.01** · 개정 2026-07-11

# Accounting Ledger Code Architecture Guardians Skill

이 문서는 단일 HTML 기반 대한민국 개인사업자용 회계장부 앱의 코드 구조가 장기간 유지보수 가능한 상태를 유지하도록 검토하는 코드 설계 효율화 에이전트 체계다. 회계 도메인 Guardian이 “장부가 맞는가”를 본다면, 이 문서의 Guardian은 “앱 구조가 오래 버틸 수 있는가”를 본다.

## 핵심 원칙

1. 단일 HTML을 유지하더라도 UI, 상태, 도메인, 저장소, 원격 adapter, 검증, 리포트 경계를 분리한다.
2. 회계·세무 판단 로직을 DOM 이벤트 핸들러나 Supabase 호출 안에 직접 섞지 않는다.
3. IndexedDB, localStorage, Supabase, Cloudinary, OAuth, 향후 APK 연결부는 adapter로 격리한다.
4. 오류 처리는 저장 실패, 동기화 실패, 로그인 실패, import 실패를 사용자 메시지와 내부 진단으로 분리한다.
5. 외부 의존성은 단일 HTML 유지성과 보안·오프라인 동작에 미치는 영향을 검토한 뒤 추가한다.

## 코드 설계 에이전트

| 에이전트 | 우선순위 | 책임 | 최소 산출물 |
|---|---|---|---|
| Single HTML Architecture Guardian | 필수 | 단일 HTML 내부 모듈 경계와 섹션 구조 유지 | 레이어별 코드 위치, 금지된 전역 누수, 분리 필요 블록 |
| State Management Guardian | 필수 | UI 상태, 도메인 상태, IndexedDB 상태, Supabase 동기화 상태 분리 | 상태 소유자, 상태 전이, stale/dirty/sync 플래그 |
| Domain Boundary Guardian | 필수 | 회계 로직, 세무 로직, UI 로직, 저장소 로직 혼합 방지 | 경계 위반 목록, 이동 대상 함수, 의존 방향 |
| Adapter Layer Guardian | 필수 | Supabase, Cloudinary, IndexedDB, OAuth, GitHub Pages, APK 연결부 격리 | adapter 목록, 입력/출력 계약, mock 가능성 |
| Complexity Budget Reviewer | 매우 권장 | 함수 길이, 중복, 거대 조건문, 암묵적 전역 상태 감시 | 복잡도 초과 목록, 분리 후보, 중복 제거 후보 |
| Refactor Safety Agent | 매우 권장 | 구조 개선 시 기능 회귀와 데이터 계약 변경 위험 확인 | 변경 전후 동작 체크리스트, 회귀 테스트, 롤백 기준 |
| Performance Budget Guardian | 권장 | 단일 HTML 초기 로딩, 대량 거래 렌더링, IndexedDB 조회 성능 관리 | 성능 예산, 병목 후보, 지연 로딩·페이지네이션 후보 |
| Dependency Minimalism Reviewer | 권장 | CDN/외부 라이브러리 남용 방지와 의존성 근거 검토 | 의존성 목록, 사용 이유, 대체 가능성, 제거 후보 |
| Error Handling Guardian | 필수 | 저장·동기화·로그인·import·리포트 실패 처리 일관화 | 오류 코드, 사용자 메시지, 복구 동작, 진단 로그 |
| Developer Experience Agent | 권장 | 개발자 모드, 디버그 패널, 내부 상태·버전·검증 결과 표시 | 개발자 모드 항목, 표시 상태, 진단 export 후보 |

## 권장 레이어

| 레이어 | 책임 | 금지사항 |
|---|---|---|
| UI Layer | 화면, 입력폼, 버튼, 모달, 개발자 모드 표시 | 회계 분개·세금 계산을 직접 수행하지 않는다 |
| State Layer | 현재 사용자, 사업장, 선택 거래, 동기화 상태 | DB adapter를 직접 호출하지 않는다 |
| Domain Layer | 분개, 복식부기, 계정과목, 세무 판단 | DOM, Supabase client, localStorage에 직접 접근하지 않는다 |
| Persistence Layer | IndexedDB, localStorage, JSON 백업 | UI 문구와 세무 판단을 포함하지 않는다 |
| Remote Adapter Layer | Supabase, Cloudinary, OAuth, 향후 Edge Function | service role, secret, UI 상태를 보유하지 않는다 |
| Validation Layer | Guardian 결과, 오류, 경고, manual review | 저장소 구현 세부사항에 의존하지 않는다 |
| Report Layer | 간편장부, 원장, 세무사 패키지, 법정서식 | 최신 법정서식 검증 없이 확정 출력하지 않는다 |

## 개발자 모드 표시 목록

앱 개발자 모드에는 아래 역할과 기능을 표시한다. 실제 구현 상태는 `implemented`, `manual_only`, `planned`, `blocked` 중 하나로 별도 관리한다.

| ID | 표시명 | 역할 | 주요 기능 | 상태 기준 |
|---|---|---|---|---|
| `single_html_architecture_guardian` | 단일 HTML 구조 검사 | 단일 파일 내부 모듈 경계 유지 | 섹션 구조, 전역 누수, 모듈 경계, script 순서 확인 | `index.html` 변경 시 실행 |
| `state_management_guardian` | 상태 관리 검사 | UI·도메인·저장소·동기화 상태 분리 | dirty/sync 플래그, 선택 상태, 캐시 상태 확인 | 상태 추가·변경 시 실행 |
| `domain_boundary_guardian` | 도메인 경계 검사 | 회계·세무·UI·저장소 로직 혼합 방지 | 의존 방향, 함수 위치, 경계 위반 확인 | 도메인 로직 변경 시 실행 |
| `adapter_layer_guardian` | 어댑터 계층 검사 | 외부 서비스와 저장소 연결부 격리 | Supabase, Cloudinary, IndexedDB, OAuth adapter 확인 | 외부 연결 변경 시 실행 |
| `complexity_budget_reviewer` | 복잡도 예산 검사 | 거대 함수·중복·조건문 팽창 감시 | 함수 길이, 중복 블록, 분리 후보 확인 | 큰 기능 추가 전후 실행 |
| `refactor_safety_agent` | 리팩터링 안전성 검사 | 구조 개선 중 회귀 방지 | 변경 전후 동작, 테스트, 롤백 기준 확인 | 리팩터링 전후 실행 |
| `performance_budget_guardian` | 성능 예산 검사 | 로딩·조회·렌더링 성능 관리 | 초기 로딩, 대량 거래 렌더링, IndexedDB 조회 확인 | 목록·대량 데이터 기능 변경 시 실행 |
| `dependency_minimalism_reviewer` | 의존성 최소화 검사 | CDN·외부 라이브러리 추가 근거 검토 | 의존성 이유, 대체 가능성, 제거 후보 확인 | 라이브러리 추가·변경 시 실행 |
| `error_handling_guardian` | 오류 처리 검사 | 실패 메시지와 복구 흐름 일관화 | 오류 코드, 사용자 문구, 재시도, 진단 로그 확인 | 실패 가능 기능 변경 시 실행 |
| `developer_experience_agent` | 개발자 경험 검사 | 개발자 모드와 내부 진단 개선 | 버전, Guardian 상태, sync 상태, export 후보 표시 | 개발자 모드 변경 시 실행 |

앱에 옮길 때는 아래 JSON을 초기 레지스트리 후보로 사용한다.

```json
{
  "registryVersion": "Sub_code-architecture-guardians_0.01",
  "displayTarget": "developer_mode",
  "agents": [
    {
      "id": "single_html_architecture_guardian",
      "name": "Single HTML Architecture Guardian",
      "labelKo": "단일 HTML 구조 검사",
      "priority": "required",
      "role": "단일 파일 내부 모듈 경계 유지",
      "functions": ["섹션 구조 확인", "전역 누수 확인", "모듈 경계 확인", "script 순서 확인"],
      "triggers": ["index_html_change", "feature_add", "release_check"],
      "outputs": ["layer_map", "global_leaks", "split_candidates"]
    },
    {
      "id": "state_management_guardian",
      "name": "State Management Guardian",
      "labelKo": "상태 관리 검사",
      "priority": "required",
      "role": "UI·도메인·저장소·동기화 상태 분리",
      "functions": ["상태 소유자 확인", "dirty 플래그 확인", "sync 플래그 확인", "stale 상태 확인"],
      "triggers": ["state_add", "sync_change", "form_flow_change"],
      "outputs": ["state_owners", "state_transitions", "dirty_sync_flags"]
    },
    {
      "id": "domain_boundary_guardian",
      "name": "Domain Boundary Guardian",
      "labelKo": "도메인 경계 검사",
      "priority": "required",
      "role": "회계·세무·UI·저장소 로직 혼합 방지",
      "functions": ["의존 방향 확인", "함수 위치 확인", "경계 위반 확인", "분리 후보 표시"],
      "triggers": ["domain_logic_change", "tax_logic_change", "ui_handler_change"],
      "outputs": ["boundary_violations", "move_candidates", "dependency_direction"]
    },
    {
      "id": "adapter_layer_guardian",
      "name": "Adapter Layer Guardian",
      "labelKo": "어댑터 계층 검사",
      "priority": "required",
      "role": "외부 서비스와 저장소 연결부 격리",
      "functions": ["Supabase adapter 확인", "Cloudinary adapter 확인", "IndexedDB adapter 확인", "OAuth adapter 확인"],
      "triggers": ["remote_service_change", "storage_change", "auth_change"],
      "outputs": ["adapter_contracts", "mock_points", "leaked_service_calls"]
    },
    {
      "id": "complexity_budget_reviewer",
      "name": "Complexity Budget Reviewer",
      "labelKo": "복잡도 예산 검사",
      "priority": "strongly_recommended",
      "role": "거대 함수·중복·조건문 팽창 감시",
      "functions": ["함수 길이 확인", "중복 블록 확인", "조건문 깊이 확인", "분리 후보 확인"],
      "triggers": ["large_diff", "feature_add", "release_check"],
      "outputs": ["complexity_findings", "duplicate_blocks", "simplification_candidates"]
    },
    {
      "id": "refactor_safety_agent",
      "name": "Refactor Safety Agent",
      "labelKo": "리팩터링 안전성 검사",
      "priority": "strongly_recommended",
      "role": "구조 개선 중 회귀 방지",
      "functions": ["변경 전후 동작 확인", "데이터 계약 확인", "회귀 테스트 확인", "롤백 기준 확인"],
      "triggers": ["refactor_start", "refactor_complete", "contract_change"],
      "outputs": ["regression_checklist", "contract_changes", "rollback_criteria"]
    },
    {
      "id": "performance_budget_guardian",
      "name": "Performance Budget Guardian",
      "labelKo": "성능 예산 검사",
      "priority": "recommended",
      "role": "로딩·조회·렌더링 성능 관리",
      "functions": ["초기 로딩 확인", "대량 거래 렌더링 확인", "IndexedDB 조회 확인", "지연 로딩 후보 확인"],
      "triggers": ["list_render_change", "bulk_data_change", "import_flow_change"],
      "outputs": ["performance_budget", "bottleneck_candidates", "pagination_candidates"]
    },
    {
      "id": "dependency_minimalism_reviewer",
      "name": "Dependency Minimalism Reviewer",
      "labelKo": "의존성 최소화 검사",
      "priority": "recommended",
      "role": "CDN·외부 라이브러리 추가 근거 검토",
      "functions": ["의존성 목록 확인", "사용 이유 확인", "대체 가능성 확인", "제거 후보 확인"],
      "triggers": ["dependency_add", "cdn_change", "build_change"],
      "outputs": ["dependency_inventory", "justification", "removal_candidates"]
    },
    {
      "id": "error_handling_guardian",
      "name": "Error Handling Guardian",
      "labelKo": "오류 처리 검사",
      "priority": "required",
      "role": "실패 메시지와 복구 흐름 일관화",
      "functions": ["오류 코드 확인", "사용자 메시지 확인", "재시도 동작 확인", "진단 로그 확인"],
      "triggers": ["save_flow_change", "sync_flow_change", "login_flow_change", "import_flow_change"],
      "outputs": ["error_codes", "user_messages", "recovery_actions", "diagnostic_logs"]
    },
    {
      "id": "developer_experience_agent",
      "name": "Developer Experience Agent",
      "labelKo": "개발자 경험 검사",
      "priority": "recommended",
      "role": "개발자 모드와 내부 진단 개선",
      "functions": ["버전 표시 확인", "Guardian 상태 표시 확인", "sync 상태 표시 확인", "진단 export 후보 확인"],
      "triggers": ["developer_mode_change", "debug_panel_change", "release_check"],
      "outputs": ["developer_panel_items", "debug_state_summary", "diagnostic_export_candidates"]
    }
  ]
}
```

## 변경 유형별 적용

| 변경 유형 | 반드시 적용할 코드 설계 에이전트 |
|---|---|
| `index.html` 신규 생성·대규모 수정 | Single HTML Architecture, Domain Boundary, State Management, Error Handling |
| 거래 입력·분개·세무 로직 | Domain Boundary, State Management, Refactor Safety |
| Supabase·IndexedDB·Cloudinary·OAuth | Adapter Layer, Error Handling, State Management, Security Reviewer |
| import/export·백업·복원 | Adapter Layer, State Management, Error Handling, Performance Budget |
| 대량 거래 목록·검색·리포트 | Performance Budget, Complexity Budget, State Management |
| CDN·라이브러리 추가 | Dependency Minimalism, Security Reviewer, Performance Budget |
| 리팩터링 | Refactor Safety, Complexity Budget, Harness Quality Gate |
| 개발자 모드·디버그 패널 | Developer Experience, Single HTML Architecture, Error Handling |

## 코드 구조 게이트

1. UI 이벤트 핸들러는 사용자 입력을 수집하고 상태/도메인 함수에 위임한다.
2. 도메인 함수는 DOM, Supabase client, Cloudinary URL, localStorage에 직접 접근하지 않는다.
3. adapter 함수는 외부 I/O를 감싸고, 도메인 판단을 포함하지 않는다.
4. validation 결과는 공통 구조로 저장하고, 화면 문구는 별도 formatter에서 만든다.
5. 오류는 내부 코드와 사용자 메시지를 분리한다.
6. 대량 데이터는 필터링, 정렬, 페이지네이션, 렌더링 비용을 분리해 검토한다.
7. 새 외부 의존성은 기능 필요성, 대체 방법, 오프라인 영향, 보안 영향을 기록한다.
8. 리팩터링은 동작 변경 여부를 명시하고, 변경 전후 검증 명령을 남긴다.

## 금지 사항

- 단일 HTML이라는 이유로 모든 함수를 전역에 놓지 않는다.
- UI 함수 안에서 회계 분개, VAT 계산, 법령 판단을 직접 수행하지 않는다.
- Supabase, IndexedDB, Cloudinary 호출을 여러 화면에 중복 분산하지 않는다.
- 오류를 `alert()` 하나로 처리하고 내부 원인을 잃어버리지 않는다.
- 의존성 추가를 “편해서”라는 이유만으로 허용하지 않는다.
- 개발자 모드 표시를 실제 테스트 통과 또는 보안 검토로 대체하지 않는다.
