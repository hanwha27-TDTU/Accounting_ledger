> **Sub_domain-guardians_0.03** · 개정 2026-07-11

# Accounting Ledger Domain Guardians Skill

이 문서는 대한민국 개인사업자용 간편장부·복식부기 통합 회계 프로그램에서 회계 데이터의 정확성, 세무 매핑, 감사 추적, 마감 안정성을 검토하는 도메인 에이전트 체계다. 개발 에이전트가 코드 품질을 본다면, 이 문서의 에이전트들은 장부 자체가 회계적으로 성립하는지 검증한다.

## 핵심 원칙

1. 사용자 입력 화면은 간편해야 하지만 내부 원장은 복식부기 SSOT를 유지한다.
2. 모든 원천 거래는 분개, 원장, 리포트, 세무 매핑으로 추적 가능해야 한다.
3. 법령·서식·세무 판단은 현재 확인된 근거와 버전을 남긴다.
4. 검증 실패는 조용히 보정하지 않고 사용자에게 원인과 수정 후보를 표시한다.
5. 신고·세무사 전달용 출력은 법정 최신양식 확인 전에는 확정 출력으로 표시하지 않는다.

## 도메인 에이전트

| 에이전트 | 우선순위 | 책임 | 최소 산출물 |
|---|---|---|---|
| Double-Entry Guardian | 필수 | 모든 거래의 차변 합계와 대변 합계가 일치하는지 검증 | 불균형 분개 목록, 차액, 원천 거래 ID |
| Journal Entry Validator | 필수 | 분개 날짜, 금액, 계정과목, 거래처, 증빙, 과세구분의 입력 유효성 검증 | 입력 오류, 누락 필드, 자동분개 근거 |
| Chart of Accounts Guardian | 필수 | 국세청 용어와 내부 계정과목 체계를 일관되게 유지 | 계정과목 매핑표, 비활성/중복/미분류 계정 |
| Ledger Reconciliation Agent | 필수 | 총계정원장, 현금, 통장, 카드, 미수/미지급 잔액 대사 | 대사 차이, 미매칭 거래, 조정 후보 |
| Period Close Guardian | 매우 권장 | 월·분기·연도 마감, 마감취소, 마감 후 수정 이력 관리 | 마감 상태, 잠금 범위, 재개방 사유 |
| Audit Trail Guardian | 필수 | 생성·수정·삭제·동기화·마감·권한 변경 이력 보존 | 변경 전후 값, actor, timestamp, source |
| Import Normalization Agent | 필수 | Excel, CSV, 카드, 통장, 국세청 양식을 표준 거래 구조로 정규화 | import batch, 필드 매핑, 실패 행, 중복 후보 |
| Financial Statement Generator | 매우 권장 | 손익계산서, 재무상태표, 원장, 간편장부, 세무사 전달 패키지 생성 | 리포트 ID, 기준기간, form snapshot, 검증 상태 |
| Tax Mapping Reviewer | 필수 | 부가세, 종합소득세, 필요경비, 불공제, 업종별 세무 매핑 검토 | 세무 매핑 근거, 예외 항목, 검토 필요 표시 |
| Anomaly Detection Agent | 권장 | 중복, 이상금액, 증빙 누락, 계정과목 오분류, 기간 오류 탐지 | anomaly score, 규칙 ID, 사용자 확인 상태 |

## 확장 에이전트

| 에이전트 | 우선순위 | 책임 | 최소 산출물 |
|---|---|---|---|
| Evidence Compliance Guardian | 필수 | 증빙 첨부, 보관, 원본성, 거래 연결 상태 검증 | 증빙 누락 목록, 파일 메타데이터, 거래 연결 상태 |
| VAT Consistency Guardian | 필수 | 공급가액, 부가세, 면세, 불공제, 간이/일반 과세 계산 일관성 검증 | VAT 차이, 과세구분 오류, 불공제 검토 항목 |
| Depreciation & Asset Guardian | 매우 권장 | 고정자산, 감가상각, 처분, 자본적/수익적 지출 판단 관리 | 자산대장 연결, 상각 스케줄, 처분손익 후보 |
| Business Classification Agent | 필수 | 개인/법인, 업종코드, 의료·자문·프리랜서 등 사업 유형 판정 | 사업유형 결정 근거, 적용 세무 로직, 검토 필요 항목 |
| Filing Readiness Guardian | 필수 | 신고 전 누락자료, 마감, 법정서식, 세무사 전달 준비도 점검 | 신고 준비 체크리스트, 차단 오류, 보완 요청 |
| Cashflow & Liquidity Reviewer | 권장 | 손익과 별개로 현금흐름, 미수·미지급, 세금 납부 예정액 검토 | 현금흐름 요약, 미수·미지급 현황, 납부 예정액 |
| Backup & Restore Guardian | 필수 | IndexedDB, Supabase, JSON 백업·복원, canonical version 일관성 검증 | 백업 스냅샷, 복원 검증 결과, canonical 차이 |
| Permission & Owner Guardian | 매우 권장 | Google 로그인 허용 이메일, owner 권한, 추가 허용자 관리 검증 | owner 상태, allowlist 변경 이력, 권한 오류 |
| Legal Update Watcher | 매우 권장 | 법령·서식 변경 감지와 재검토 필요 상태 표시 | 변경 감지 기록, 영향받는 리포트, 재검토 플래그 |
| Developer Mode Registry Agent | 권장 | 앱 개발자 모드에서 Guardian 목록, 구현 상태, 최근 검증 결과 표시 | 레지스트리 버전, 구현 상태, 마지막 실행 결과 |

## 개발자 모드 표시 목록

앱 개발자 모드에는 아래 역할과 기능을 표시한다. 이 목록은 사용자가 “현재 어떤 회계 검증 장치가 설계되어 있는지” 확인하는 용도이며, 각 항목의 실제 구현 상태는 별도 `implemented`, `manual_only`, `planned` 상태값으로 관리한다.

| ID | 표시명 | 역할 | 주요 기능 | 상태 기준 |
|---|---|---|---|---|
| `double_entry_guardian` | 복식부기 균형 검사 | 차변·대변 균형 보장 | 분개 합계 비교, 불균형 차액 표시, 원천 거래 추적 | 거래 저장·수정·import 후 실행 |
| `journal_entry_validator` | 분개 입력 검증 | 입력값과 자동분개의 유효성 확인 | 날짜·금액·계정과목·거래처·증빙·과세구분 검증 | 분개 생성 전후 실행 |
| `chart_of_accounts_guardian` | 계정과목 체계 검사 | 국세청 용어와 내부 계정과목 일관성 유지 | 계정과목 매핑, 중복·비활성·미분류 계정 탐지 | 계정과목 변경·세무 매핑 전 실행 |
| `ledger_reconciliation_agent` | 원장 대사 검사 | 원장과 현금·통장·카드 잔액 차이 확인 | 잔액 대사, 미매칭 거래 탐지, 조정 후보 제시 | 월말·마감 전 실행 |
| `period_close_guardian` | 기간 마감 관리 | 마감 후 수정 통제와 재개방 이력 관리 | 마감 잠금, 마감취소 사유, 후속 수정 이력 | 월·분기·연도 마감 시 실행 |
| `audit_trail_guardian` | 변경 이력 보존 | 생성·수정·삭제·동기화·권한 변경 추적 | 변경 전후 값, actor, timestamp, source 보존 | 모든 중요 변경 시 실행 |
| `import_normalization_agent` | 가져오기 정규화 | 외부 자료를 표준 거래 구조로 변환 | Excel/CSV/카드/통장 행 매핑, 실패 행, 중복 후보 | import 실행 시 실행 |
| `financial_statement_generator` | 재무·세무 리포트 생성 | 장부 데이터를 보고서와 전달 패키지로 생성 | 손익계산서, 재무상태표, 원장, 간편장부, 세무사 패키지 | 리포트 생성 시 실행 |
| `tax_mapping_reviewer` | 세무 매핑 검토 | 세법·업종·과세유형에 맞는 매핑 확인 | 부가세, 종소세, 필요경비, 불공제, 업종 예외 검토 | 세무 리포트·신고 준비 전 실행 |
| `anomaly_detection_agent` | 이상 항목 탐지 | 규칙 기반 오류·누락·중복 후보 탐지 | 중복거래, 이상금액, 증빙 누락, 기간 오류, 계정 오분류 | 저장·import·마감 전후 실행 |
| `evidence_compliance_guardian` | 증빙 적정성 검사 | 증빙 누락·원본성·거래 연결 확인 | 이미지/PDF 첨부, 파일 메타, 거래 연결, 누락 경고 | 거래 저장·리포트 전 실행 |
| `vat_consistency_guardian` | 부가세 일관성 검사 | 과세유형과 VAT 금액 일치 확인 | 공급가액·세액 대조, 면세·불공제 구분, 간이/일반 분기 | VAT 검토·신고 준비 전 실행 |
| `depreciation_asset_guardian` | 자산·감가상각 관리 | 고정자산과 감가상각 흐름 검증 | 자산대장, 상각 스케줄, 처분 후보, 지출 성격 검토 | 자산 등록·결산 전 실행 |
| `business_classification_agent` | 사업유형 판정 | 사업자·업종·과세유형 판단 | 개인/법인, 업종코드, 의료·자문·프리랜서 분기 | 초기 설정·사업정보 변경 시 실행 |
| `filing_readiness_guardian` | 신고 준비도 검사 | 신고 전 차단 오류와 보완자료 확인 | 누락자료, 마감상태, 법정서식, 세무사 패키지 점검 | 신고 준비 화면에서 실행 |
| `cashflow_liquidity_reviewer` | 현금흐름 검토 | 손익과 별개로 자금 흐름 확인 | 현금흐름, 미수·미지급, 세금 납부 예정액 | 월말·분기 검토 시 실행 |
| `backup_restore_guardian` | 백업·복원 검증 | 로컬·클라우드·JSON 복원성 확인 | 백업 스냅샷, 복원 테스트, canonical version 차이 | 백업·복원·기기변경 시 실행 |
| `permission_owner_guardian` | 권한·소유자 검사 | Google owner와 allowlist 관리 확인 | owner 상태, 허용 이메일, 권한 변경 이력 | 로그인·권한 변경 시 실행 |
| `legal_update_watcher` | 법령 업데이트 감시 | 법령·서식 변경 영향 추적 | 변경 감지, 영향 리포트, 재검토 플래그 | 법령 확인·리포트 생성 전 실행 |
| `developer_mode_registry_agent` | 개발자 모드 레지스트리 | Guardian 상태와 최근 결과 표시 | 레지스트리 버전, 구현 상태, 마지막 실행 결과 | 개발자 모드 진입 시 실행 |

앱에 옮길 때는 아래 JSON을 초기 레지스트리 후보로 사용한다. 단, 실제 런타임에서는 코드 안에 하드코딩하기보다 앱 내부 상수 또는 설정 데이터로 분리하고, 구현 상태와 마지막 검증 결과는 별도 상태 저장소에 둔다.

```json
{
  "registryVersion": "Sub_domain-guardians_0.03",
  "displayTarget": "developer_mode",
  "agents": [
    {
      "id": "double_entry_guardian",
      "name": "Double-Entry Guardian",
      "labelKo": "복식부기 균형 검사",
      "priority": "required",
      "role": "차변·대변 균형 보장",
      "functions": ["차변 합계 계산", "대변 합계 계산", "불균형 차액 표시", "원천 거래 추적"],
      "triggers": ["transaction_save", "journal_update", "import_complete"],
      "outputs": ["imbalance_findings", "difference_amount", "source_transaction_id"]
    },
    {
      "id": "journal_entry_validator",
      "name": "Journal Entry Validator",
      "labelKo": "분개 입력 검증",
      "priority": "required",
      "role": "입력값과 자동분개의 유효성 확인",
      "functions": ["날짜 검증", "금액 검증", "계정과목 검증", "거래처 검증", "증빙 연결 검증", "과세구분 검증"],
      "triggers": ["journal_create", "journal_update", "auto_posting"],
      "outputs": ["field_errors", "missing_fields", "auto_posting_basis"]
    },
    {
      "id": "chart_of_accounts_guardian",
      "name": "Chart of Accounts Guardian",
      "labelKo": "계정과목 체계 검사",
      "priority": "required",
      "role": "국세청 용어와 내부 계정과목 일관성 유지",
      "functions": ["계정과목 매핑 확인", "중복 계정 탐지", "비활성 계정 사용 탐지", "미분류 계정 탐지"],
      "triggers": ["account_create", "account_update", "tax_mapping_review"],
      "outputs": ["account_mapping_findings", "inactive_account_usage", "unmapped_accounts"]
    },
    {
      "id": "ledger_reconciliation_agent",
      "name": "Ledger Reconciliation Agent",
      "labelKo": "원장 대사 검사",
      "priority": "required",
      "role": "원장과 현금·통장·카드 잔액 차이 확인",
      "functions": ["총계정원장 대사", "현금 잔액 대사", "통장 잔액 대사", "카드 잔액 대사", "미매칭 거래 탐지"],
      "triggers": ["period_review", "month_close", "statement_import"],
      "outputs": ["reconciliation_differences", "unmatched_transactions", "adjustment_candidates"]
    },
    {
      "id": "period_close_guardian",
      "name": "Period Close Guardian",
      "labelKo": "기간 마감 관리",
      "priority": "strongly_recommended",
      "role": "마감 후 수정 통제와 재개방 이력 관리",
      "functions": ["마감 잠금", "마감취소 사유 기록", "마감 후 수정 탐지", "기간별 상태 표시"],
      "triggers": ["month_close", "quarter_close", "year_close", "period_reopen"],
      "outputs": ["close_status", "locked_periods", "reopen_reason", "post_close_changes"]
    },
    {
      "id": "audit_trail_guardian",
      "name": "Audit Trail Guardian",
      "labelKo": "변경 이력 보존",
      "priority": "required",
      "role": "생성·수정·삭제·동기화·권한 변경 추적",
      "functions": ["변경 전후 값 기록", "actor 기록", "timestamp 기록", "source 기록", "삭제 이력 보존"],
      "triggers": ["create", "update", "delete", "sync", "permission_change", "close"],
      "outputs": ["audit_events", "before_after_values", "actor", "source"]
    },
    {
      "id": "import_normalization_agent",
      "name": "Import Normalization Agent",
      "labelKo": "가져오기 정규화",
      "priority": "required",
      "role": "외부 자료를 표준 거래 구조로 변환",
      "functions": ["Excel 행 매핑", "CSV 행 매핑", "카드자료 매핑", "통장자료 매핑", "실패 행 기록", "중복 후보 탐지"],
      "triggers": ["excel_import", "csv_import", "bank_import", "card_import"],
      "outputs": ["import_batch", "field_mapping", "failed_rows", "duplicate_candidates"]
    },
    {
      "id": "financial_statement_generator",
      "name": "Financial Statement Generator",
      "labelKo": "재무·세무 리포트 생성",
      "priority": "strongly_recommended",
      "role": "장부 데이터를 보고서와 전달 패키지로 생성",
      "functions": ["손익계산서 생성", "재무상태표 생성", "총계정원장 출력", "간편장부 출력", "세무사 전달 패키지 생성"],
      "triggers": ["report_generate", "tax_package_generate", "period_close_review"],
      "outputs": ["report_id", "report_period", "form_snapshot_id", "validation_status"]
    },
    {
      "id": "tax_mapping_reviewer",
      "name": "Tax Mapping Reviewer",
      "labelKo": "세무 매핑 검토",
      "priority": "required",
      "role": "세법·업종·과세유형에 맞는 매핑 확인",
      "functions": ["부가세 매핑 검토", "종합소득세 매핑 검토", "필요경비 검토", "불공제 항목 검토", "업종별 예외 검토"],
      "triggers": ["vat_review", "income_tax_review", "business_type_change", "industry_code_change"],
      "outputs": ["tax_mapping_basis", "exception_items", "manual_review_items"]
    },
    {
      "id": "anomaly_detection_agent",
      "name": "Anomaly Detection Agent",
      "labelKo": "이상 항목 탐지",
      "priority": "recommended",
      "role": "규칙 기반 오류·누락·중복 후보 탐지",
      "functions": ["중복거래 탐지", "이상금액 탐지", "증빙 누락 탐지", "기간 오류 탐지", "계정과목 오분류 후보 탐지"],
      "triggers": ["transaction_save", "import_complete", "period_review", "before_close"],
      "outputs": ["anomaly_score", "rule_id", "candidate_items", "user_confirmation_status"]
    },
    {
      "id": "evidence_compliance_guardian",
      "name": "Evidence Compliance Guardian",
      "labelKo": "증빙 적정성 검사",
      "priority": "required",
      "role": "증빙 누락·원본성·거래 연결 확인",
      "functions": ["이미지/PDF 첨부 확인", "파일 메타데이터 확인", "거래 연결 상태 확인", "증빙 누락 경고"],
      "triggers": ["transaction_save", "evidence_upload", "report_generate", "tax_package_generate"],
      "outputs": ["missing_evidence", "file_metadata", "linked_transaction_status", "evidence_review_items"]
    },
    {
      "id": "vat_consistency_guardian",
      "name": "VAT Consistency Guardian",
      "labelKo": "부가세 일관성 검사",
      "priority": "required",
      "role": "과세유형과 VAT 금액 일치 확인",
      "functions": ["공급가액 검증", "부가세액 검증", "면세 구분 검증", "불공제 구분 검증", "간이/일반 과세 분기 검증"],
      "triggers": ["vat_review", "transaction_save", "business_type_change", "tax_package_generate"],
      "outputs": ["vat_differences", "tax_type_errors", "non_deductible_review_items"]
    },
    {
      "id": "depreciation_asset_guardian",
      "name": "Depreciation & Asset Guardian",
      "labelKo": "자산·감가상각 관리",
      "priority": "strongly_recommended",
      "role": "고정자산과 감가상각 흐름 검증",
      "functions": ["자산대장 연결 확인", "감가상각 스케줄 생성", "처분 후보 탐지", "자본적/수익적 지출 후보 검토"],
      "triggers": ["asset_create", "asset_update", "expense_review", "year_close"],
      "outputs": ["asset_register_links", "depreciation_schedule", "disposal_candidates", "expense_character_review"]
    },
    {
      "id": "business_classification_agent",
      "name": "Business Classification Agent",
      "labelKo": "사업유형 판정",
      "priority": "required",
      "role": "사업자·업종·과세유형 판단",
      "functions": ["개인/법인 구분", "업종코드 매핑", "의료·자문·프리랜서 분기", "간편장부/복식부기 의무 후보 판정"],
      "triggers": ["business_profile_create", "business_profile_update", "industry_code_change"],
      "outputs": ["classification_basis", "applied_tax_logic", "manual_review_items"]
    },
    {
      "id": "filing_readiness_guardian",
      "name": "Filing Readiness Guardian",
      "labelKo": "신고 준비도 검사",
      "priority": "required",
      "role": "신고 전 차단 오류와 보완자료 확인",
      "functions": ["누락자료 점검", "기간 마감 상태 점검", "법정서식 snapshot 점검", "세무사 전달 패키지 점검"],
      "triggers": ["filing_readiness_check", "tax_package_generate", "year_close"],
      "outputs": ["readiness_checklist", "blocking_errors", "required_followups"]
    },
    {
      "id": "cashflow_liquidity_reviewer",
      "name": "Cashflow & Liquidity Reviewer",
      "labelKo": "현금흐름 검토",
      "priority": "recommended",
      "role": "손익과 별개로 자금 흐름 확인",
      "functions": ["현금흐름 요약", "미수금 확인", "미지급금 확인", "세금 납부 예정액 추정"],
      "triggers": ["month_review", "quarter_review", "tax_payment_review"],
      "outputs": ["cashflow_summary", "receivable_payable_status", "estimated_tax_payments"]
    },
    {
      "id": "backup_restore_guardian",
      "name": "Backup & Restore Guardian",
      "labelKo": "백업·복원 검증",
      "priority": "required",
      "role": "로컬·클라우드·JSON 복원성 확인",
      "functions": ["IndexedDB 백업 확인", "Supabase 동기화 확인", "JSON 백업 구조 확인", "canonical version 차이 탐지"],
      "triggers": ["backup_create", "restore_preview", "restore_apply", "device_sync"],
      "outputs": ["backup_snapshot", "restore_validation", "canonical_version_diff"]
    },
    {
      "id": "permission_owner_guardian",
      "name": "Permission & Owner Guardian",
      "labelKo": "권한·소유자 검사",
      "priority": "strongly_recommended",
      "role": "Google owner와 allowlist 관리 확인",
      "functions": ["owner 이메일 확인", "allowlist 상태 확인", "권한 변경 이력 확인", "비허용 로그인 차단 확인"],
      "triggers": ["login", "allowlist_update", "owner_permission_review"],
      "outputs": ["owner_status", "allowed_email_status", "permission_change_events"]
    },
    {
      "id": "legal_update_watcher",
      "name": "Legal Update Watcher",
      "labelKo": "법령 업데이트 감시",
      "priority": "strongly_recommended",
      "role": "법령·서식 변경 영향 추적",
      "functions": ["법령 snapshot 변경 확인", "서식 snapshot 변경 확인", "영향받는 리포트 표시", "재검토 플래그 설정"],
      "triggers": ["legal_reference_check", "report_generate", "tax_rule_refresh"],
      "outputs": ["legal_change_records", "affected_reports", "review_required_flags"]
    },
    {
      "id": "developer_mode_registry_agent",
      "name": "Developer Mode Registry Agent",
      "labelKo": "개발자 모드 레지스트리",
      "priority": "recommended",
      "role": "Guardian 상태와 최근 결과 표시",
      "functions": ["레지스트리 버전 표시", "구현 상태 표시", "마지막 실행 결과 표시", "관련 문서 링크 표시"],
      "triggers": ["developer_mode_open", "guardian_registry_refresh"],
      "outputs": ["registry_version", "implementation_status", "last_run_summary", "document_links"]
    }
  ]
}
```

## 법령 체계도 연결

도메인 에이전트는 법령 체계도와 다음 순서로 연결한다.

| 판단 단계 | 연결 에이전트 | 법령·서식 연결점 |
|---|---|---|
| 사업자 유형·과세유형 판단 | Business Classification Agent, Tax Mapping Reviewer | 소득세법, 부가가치세법, 업종코드, 간편장부/복식부기 의무 기준 |
| 계정과목 선택 | Chart of Accounts Guardian | 국세청 계정과목·신고서 항목·필요경비 분류 |
| 거래 입력·자동분개 | Journal Entry Validator, Double-Entry Guardian, Evidence Compliance Guardian | 장부 기장 원칙, 증빙 보관, 과세/면세/불공제 구분 |
| 원장·잔액 검증 | Ledger Reconciliation Agent | 총수입금액, 필요경비, 자산·부채 잔액 근거 |
| 부가세·종소세 매핑 | VAT Consistency Guardian, Tax Mapping Reviewer | 신고서 항목, 세액계산 구조, 업종별 예외 |
| 자산·감가상각 판단 | Depreciation & Asset Guardian | 감가상각, 고정자산, 처분손익, 지출 성격 판단 근거 |
| 법정 리포트 출력 | Financial Statement Generator, Filing Readiness Guardian, Legal Update Watcher | 최신 법정서식 snapshot, 신고서·명세서 별지 |
| 마감·수정·감사 | Period Close Guardian, Audit Trail Guardian | 신고기한, 수정신고·경정청구, 보관·감사 추적 |
| 백업·권한·개발자 확인 | Backup & Restore Guardian, Permission & Owner Guardian, Developer Mode Registry Agent | 신고자료 보존, owner 권한, 앱 내부 검증 상태 표시 |

## 검증 흐름

```mermaid
flowchart LR
  A["원천 거래 입력·import"] --> B["Import Normalization"]
  A --> K["Business Classification"]
  B --> C["Journal Entry Validator"]
  C --> D["Double-Entry Guardian"]
  C --> L["Evidence Compliance"]
  D --> E["Chart of Accounts Guardian"]
  E --> F["Ledger Reconciliation"]
  E --> M["VAT Consistency"]
  F --> G["Tax Mapping Reviewer"]
  M --> G
  G --> H["Financial Statement Generator"]
  G --> N["Filing Readiness"]
  H --> I["Period Close / Audit Trail"]
  F --> J["Anomaly Detection"]
  G --> J
  K --> G
  O["Legal Update Watcher"] --> H
  P["Backup / Permission / Developer Registry"] --> I
```

## 구현 규칙

1. 모든 검증 결과는 `pass`, `warning`, `error`, `manual_review` 중 하나로 기록한다.
2. `error`는 확정 저장, 마감, 신고용 출력 단계에서 차단 조건으로 사용할 수 있다.
3. `warning`은 저장은 허용하되 대시보드와 리포트 생성 전 검토 목록에 표시한다.
4. `manual_review`는 세무 판단 또는 법령 근거가 불충분한 항목에 사용한다.
5. 자동 보정은 사용자가 승인한 경우에만 원천 거래 또는 분개를 변경한다.
6. 법령·서식 기반 검증은 `legal_form_snapshots`, `legal_reference_checks`, `tax_rule_version`과 연결한다.
7. import 검증은 원본 행 번호, 원본 파일 해시, 변환 전후 값을 보존한다.
8. 동기화 대상 검증 레코드는 `id`, `created_at`, `updated_at`, `deleted_at`과 canonical sync 규칙을 따른다.
9. 증빙 검증은 파일 원본성 자체를 단정하지 않고, 업로드 메타데이터·거래 연결·보관 상태를 기록한다.
10. 법령 업데이트 감시는 최신성 확인 시각과 기준 snapshot을 남기며, 자동 신고 판단으로 표시하지 않는다.
11. 개발자 모드 레지스트리는 구현 상태 표시용이며, 검증 통과 자체를 대체하지 않는다.

## 데이터 모델 권장

```sql
accounting_validation_runs (
  id uuid primary key,
  business_id uuid not null,
  tax_year int not null,
  period_start date,
  period_end date,
  validation_scope text not null,
  status text not null,
  agent_versions jsonb not null,
  legal_snapshot_ids uuid[],
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

accounting_validation_findings (
  id uuid primary key,
  run_id uuid not null,
  business_id uuid not null,
  agent_name text not null,
  severity text not null,
  finding_code text not null,
  source_table text,
  source_id uuid,
  message text not null,
  suggested_action text,
  user_resolution text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 릴리스 게이트

| 변경 유형 | 반드시 적용할 도메인 에이전트 |
|---|---|
| 거래 입력·자동분개 | Double-Entry, Journal Entry, Chart of Accounts, Audit Trail |
| 증빙 첨부·보관 | Evidence Compliance, Audit Trail, Security |
| Excel/CSV/import | Import Normalization, Journal Entry, Double-Entry, Anomaly Detection |
| 사업자·업종코드·과세유형 | Business Classification, Chart of Accounts, Tax Mapping, Legal Forms |
| 부가세·종소세 | VAT Consistency, Tax Mapping, Financial Statement, Legal Forms |
| 고정자산·감가상각 | Depreciation & Asset, Tax Mapping, Audit Trail |
| 리포트·세무사 패키지 | Filing Readiness, Financial Statement, Tax Mapping, Audit Trail, Legal Forms, Legal Update Watcher |
| 마감·수정취소 | Period Close, Audit Trail, Ledger Reconciliation |
| 현금흐름·납부 예정액 | Cashflow & Liquidity, Ledger Reconciliation, Tax Mapping |
| Supabase/IndexedDB 동기화 | Backup & Restore, Audit Trail, Schema/Contract, Migration, Security |
| 로그인·허용 이메일 | Permission & Owner, Security, Audit Trail |
| 개발자 모드 Guardian 표시 | Developer Mode Registry, Release Manager, Harness Quality Gate |

## 금지 사항

- 차변·대변 불균형 거래를 정상 저장된 거래처럼 표시하지 않는다.
- 국세청 용어와 내부 계정과목을 근거 없이 분리하지 않는다.
- 법정 최신양식 확인 없이 신고용 확정 출력으로 표시하지 않는다.
- import 실패 행을 조용히 버리지 않는다.
- 마감 후 수정 이력을 삭제하거나 덮어쓰지 않는다.
- 이상탐지를 AI 추론처럼 표시하지 않는다. V1은 규칙 기반 검증으로 시작한다.
- 증빙 파일 존재만으로 세법상 적격증빙이라고 단정하지 않는다.
- 법령 업데이트 감지 결과를 검토 없이 자동 신고 판단으로 사용하지 않는다.
- 개발자 모드 레지스트리의 `implemented` 표시를 실제 테스트 통과로 대체하지 않는다.
