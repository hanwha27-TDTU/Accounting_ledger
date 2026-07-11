> **📌 Sub_tax-vat-classification_0.05** · 개정 2026-07-11

# Accounting Ledger Tax/VAT Classification Skill

이 문서는 회계장부 앱의 사업자 유형 판정, 과세유형 판정, VAT 엔진, 법령 출처 확인을 다룰 때 적용하는 별도 스킬 문서다. 사업자 정보 입력, 간이/일반/면세/겸영 판정, VAT 자동계산, 세무 기준 업데이트, 법령 MCP 확인, 국세청 출처 저장을 만질 때 이 문서를 먼저 본다.

> **부가세 면세 조문·목록의 SSOT는 `docs/skills/accounting-legal-basis-reference-skill.md`** 다. 부가가치세법 제26조 제1항 20개 호(의료보건 5·교육 6·금융보험 11·인적용역 15 등)와 "면세는 공급의 성질로 판단·개별 확인" 원칙은 그 문서에서 읽는다. 앱 구현: `VatExemption`(대분류·94접두→면세 후보 호). 조문은 법령 MCP 원문 대조로 확인한다.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 사업자 과세유형 | 사용자가 직접 고정 입력하는 값이 아니라 판정 엔진의 출력값 |
| VAT 로직 | 판정 엔진 결과를 기본값으로 사용 |
| 거래별 최종 판단 | 증빙과 거래별 과세구분이 우선 |
| 법령 기준 | `legal_reference_checks`에 출처/조문/확인일 저장 |
| 사용자 표시 | 확정값이 아니라 후보, 경고, 확인 필요 상태로 표시 |
| 사용자 확정 | 사용자가 확인한 값만 `confirmed` 필드에 저장 |
| 업종 입력 | 큰 업종에서 시작해 세부 조건으로 좁혀가며 장부 로직 결정 |
| 업종코드 | 국세청/홈택스 기준·단순경비율 업종코드 사용 |
| 장부 시작 | 2025년 소급 입력 가능 |

## 2026-07-09 확인 기준

2026-07-09 기준 확인한 핵심 기준:

| 기준 | 확인 내용 |
|---|---|
| 부가가치세법 제61조 | 직전연도 공급대가, 신규사업자 환산, 복수 사업장, 배제 조건을 통해 간이과세 적용 범위를 판단 |
| 부가가치세법 시행령 제109조 | 2026-07-09 현재 간이과세 금액 기준은 1억400만원, 업종별 배제 조건 존재 |
| 부가가치세법 제26조 | 의료보건용역, 인적용역, 미가공 식료품 등 면세 가능 범주 존재 |
| 국세청 신고납부 안내 | 일반과세자는 통상 6개월 과세기간, 간이과세자는 1년 과세기간. 과세유형 전환/세금계산서 발급 간이과세자는 예외 신고기간 존재 |
| 국세청 1인미디어 안내 | 인적시설과 물적시설이 없는 1인 미디어 콘텐츠 창작자는 면세사업자 후보 |
| 국세청 원천징수 대상 사업소득 안내 | 의료보건용역, 저술가·작곡가 등 직업상 인적용역은 원천징수/사업소득 검토 대상 |
| 홈택스 업종코드 조회 | 업종명 또는 업종코드로 기준·단순경비율 업종코드 조회 가능 |

출처:

- 국세청 부가가치세 신고납부기한: https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7694&mi=2273
- 국세청 부가가치세 기본정보: https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7693&mi=2272
- 국세청 1인미디어 창작자 세무 안내: https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7802&mi=2480
- 국세청 원천징수 대상 사업소득: https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7900&mi=6620
- 홈택스 기준·단순경비율 업종코드 조회: https://hometax.go.kr/websquare/websquare.html?tm2lIdx=4103090000&tm3lIdx=4103090400&tmIdx=41&w2xPath=%2Fui%2Fpp%2Findex_pp.xml
- 부가가치세법 제61조: https://www.law.go.kr/lsInfoP.do?ancYnChk=0&lsId=001571
- 부가가치세법 시행령 제109조: https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=112708

## 국세청 업종코드 원장

업종코드는 앱 자체 분류가 아니라 국세청/홈택스 기준·단순경비율 업종코드를 사용한다. 앱 내부 큰 업종은 질문지를 고르는 UI 분류일 뿐, 세무 판단의 기준 코드는 공식 업종코드다.

```sql
nts_industry_codes (
  id uuid primary key,
  tax_year int not null,
  industry_code text not null,
  industry_name text not null,
  major_category text,
  middle_category text,
  minor_category text,
  detail_category text,
  business_type_name text,
  standard_industry_code text,
  standard_industry_name text,
  simple_expense_rate numeric(8,4),
  standard_expense_rate numeric(8,4),
  source_check_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique (tax_year, industry_code)
)
```

불변조건:

1. 업종코드는 `tax_year`와 함께 저장한다.
2. 사용자가 업종명을 입력하면 공식 업종코드 후보를 검색해 연결한다.
3. 사용자 별칭은 공식 코드의 alias일 뿐 공식 코드를 대체하지 않는다.
4. 기타인적용역자 같은 포괄 코드는 더 정확한 코드가 없을 때만 후보로 둔다.
5. 업종코드가 바뀌면 장부의무, 경비율, VAT, 원천징수, 신고자료를 모두 재검토한다.
6. 업종코드 원본은 출처와 확인일을 `legal_reference_checks`에 남긴다.

## 2025년 소급 장부

장부 시작은 2026년으로 고정하지 않는다. 2025년 자료를 소급 입력하거나 기존 엑셀 장부를 가져올 수 있어야 한다.

```sql
ledger_period_settings (
  id uuid primary key,
  business_id uuid not null,
  ledger_start_year int not null default 2025,
  ledger_start_date date not null default '2025-01-01',
  first_import_year int,
  opening_balance_date date,
  retroactive_import_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

소급 처리 원칙:

1. 2025년 거래는 2025년 귀속 거래로 처리한다.
2. `created_at`은 입력 시각이고, `transaction_date`는 장부 귀속일이다.
3. 2025년 거래에는 2025년 업종코드/경비율/세무 기준 출처를 적용한다.
4. 2025년 엑셀 import 원본은 삭제하지 않고 import 원장에 보관한다.
5. 기초잔액과 소급거래가 중복되지 않도록 검증한다.
6. 2025년 마감 이후 수정은 감사로그와 거래 판단메모를 남긴다.

## 판정 흐름

```text
사업자 기본정보 입력
  -> 큰 업종 선택 또는 업종명 검색
  -> 업종별 추가 질문 생성
  -> 법령/국세청 기준 로드
  -> 사업자 유형 후보 계산
  -> VAT 기본 처리 후보 생성
  -> 사용자 확인 또는 거래 판단메모 작성
  -> 거래 입력 기본값에 반영
  -> 신고자료 출력 전 재검토
```

## 입력 질문

| 질문 | 저장 필드 | 이유 |
|---|---|---|
| 개인사업자인가 법인사업자인가 | `entity_type` | 간이과세 후보 여부 |
| 사업 개시일은 언제인가 | `business_started_on` | 신규사업자 환산 |
| 사업장이 여러 개인가 | `has_multiple_business_sites` | 사업장 합산/배제 조건 |
| 업종코드는 무엇인가 | `industry_code` | 간이과세 배제, 면세/과세, 장부의무 |
| 직전연도 공급대가는 얼마인가 | `previous_year_supply_consideration` | 간이/일반 후보 |
| 올해 예상 공급대가는 얼마인가 | `expected_year_supply_consideration` | 신규사업자 후보 |
| 일반과세/간이과세 포기 이력이 있는가 | `tax_type_election_status` | 신고 선택 이력 |
| 세금계산서를 발급했는가 | `issued_tax_invoice_in_period` | 신고기간/거래 처리 |
| 과세와 면세 매출이 섞이는가 | `has_taxable_and_exempt_sales` | 공통매입세액 검토 |
| 의료/전문직 성격이 있는가 | `is_medical_service`, `is_professional_service` | 면세 가능성과 간이과세 배제 가능성 |
| 인적시설이 있는가 | `has_human_facility` | 크리에이터/인적용역 과세·면세 판단 |
| 물적시설이 있는가 | `has_physical_facility` | 크리에이터/사업장 성격 판단 |
| 3.3% 원천징수를 떼고 받는가 | `has_withholding_income` | 프리랜서 사업소득 처리 |

## 업종 좁혀가기 로직

업종은 장부 로직을 고르는 라우터다. 큰 업종을 고르면 다음 질문지가 바뀌고, 답변에 따라 VAT, 원천징수, 장부의무, 증빙 요구가 좁혀진다.

```text
큰 업종
  -> 세부 업종
  -> 실질 조건
  -> 세무 후보
  -> 장부 로직
  -> 거래 입력 기본값
```

| 큰 업종 | 반드시 묻는 추가 질문 | 장부/VAT 후보 |
|---|---|---|
| 의료 | 의료보건용역인지, 자문/강의/콘텐츠/상품 판매가 섞이는지 | 면세 후보 + 겸영 경고 + 전문직 장부의무 검토 |
| 자문·전문직 | 자격사/전문서비스인지, 개인/법인인지, 원천징수 여부 | 간이배제 가능성 + 일반과세/면세/원천징수 검토 |
| 프리랜서 | 사업자등록 여부, 3.3% 원천징수 여부, 반복성/계속성 | 사업소득 원천징수, 종합소득세 자료, VAT 면세 인적용역 검토 |
| 농업·임업·어업 | 직접 생산인지, 가공/유통/도소매인지, 식용 미가공인지 | 면세/영세율/과세/간이 부가가치율 후보 분기 |
| 크리에이터 | 직원/상주 외주/스튜디오 등 인적·물적 시설 여부, 광고/후원/협찬 수익 | 시설 없음 면세 후보, 시설 있음 과세사업자 후보 |
| 도소매 | 도매/소매/상품중개인지, 플랫폼 판매인지 | 과세사업 기본, 간이배제/매출기준 검토 |
| 제조 | 소비자 직접 판매인지, 재고/원가 관리가 필요한지 | 재고/원가/자산 장부 필요, 간이배제 예외 검토 |
| 부동산 | 주택임대/상가임대/매매/전대 여부 | 면세/과세/간이배제 강한 검토 |
| 교육·강의 | 인허가 교육인지, 개인 강의인지, 콘텐츠 판매인지 | 면세 교육용역 또는 과세 콘텐츠/자문 수익 검토 |
| 법인 | 법인 여부, 법인계좌/카드/대표자거래 구분 | 복식부기와 법인 회계 전제 |

저장 모델:

```sql
business_activity_profiles (
  id uuid primary key,
  business_id uuid not null,
  tax_year int not null,
  activity_label text not null,
  activity_category text not null,
  industry_code text,
  industry_name text,
  decision_path jsonb not null default '[]'::jsonb,
  tax_classification_candidate text,
  vat_treatment_candidate text,
  income_treatment_candidate text,
  book_logic_candidate text,
  requires_review boolean default true,
  source_check_id uuid,
  user_note_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

업종 라우팅 불변조건:

1. 업종명 하나만 저장하지 말고 결정 경로를 `decision_path`에 남긴다.
2. 겸업은 하나의 업종으로 뭉개지 않고 활동 프로필을 여러 개 만든다.
3. 큰 업종은 후보만 고르고, 세부 조건과 증빙으로 최종 좁힌다.
4. 업종 판정 변경은 VAT, 원천징수, 계정과목 추천, 신고자료 출력에 전파한다.
5. 예외가 많은 업종은 기본값을 `requires_review=true`로 둔다.

## 판정 결과 모델

```sql
business_tax_determinations (
  id uuid primary key,
  business_id uuid not null,
  tax_year int not null,
  period_label text,
  determination_type text not null,
  candidate_value text not null,
  confirmed_value text,
  confidence text,
  requires_review boolean default true,
  reason text,
  source_check_id uuid,
  user_note_id uuid,
  user_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
)
```

`determination_type` 예시:

| 값 | 의미 |
|---|---|
| `vat_payer_type` | 일반과세/간이과세/면세/겸영 후보 |
| `book_obligation` | 간편장부/복식부기 후보 |
| `vat_filing_period` | 신고기간 후보 |
| `vat_input_deduction_policy` | 매입세액 공제 검토 기준 |
| `tax_invoice_policy` | 세금계산서 발급/수취 검토 기준 |

## VAT 엔진 연결 규칙

| 사업자/거래 상태 | 기본 처리 |
|---|---|
| 일반과세 + 과세거래 | 공급가액/부가세/합계 분리 |
| 일반과세 + 면세거래 | VAT 0, 면세 사유 표시 |
| 간이과세 | 간이과세 계산식 후보, 세금계산서 발급 여부 확인 |
| 면세사업자 | 매출 VAT 0, 매입세액은 불공제/비용화 검토 |
| 과세·면세 겸영 | 거래별 과세구분 필수, 공통매입세액 안분 검토 |
| 영세율 | VAT 0이지만 영세율 증빙 검토 |
| 검토 필요 | 자동 계산 결과를 잠정값으로 표시 |

## 불변조건

1. 사업자 과세유형 자동판정은 확정 세무판단으로 표시하지 않는다.
2. 사용자가 확인한 값만 `confirmed_value` 또는 `vat_payer_type_confirmed`에 저장한다.
3. 사업자 기본 과세유형이 있어도 거래별 증빙의 과세구분이 우선할 수 있다.
4. 자동판정 결과가 바뀌어도 기존 거래를 조용히 재작성하지 않는다.
5. 변경 영향이 있는 거래는 `requires_review`로 표시하고 거래 판단메모를 남긴다.
6. 모든 기준값은 `TAX_RULE_VERSION`과 `legal_reference_checks`에 연결한다.
7. 2026년 이후 기준 변경 가능성이 있으므로 세무 기준은 코드 상수가 아니라 데이터로 관리한다.
8. 신고자료 내보내기 전에는 판정 기준 확인일과 출처를 함께 보여준다.

## 검증 체크리스트

| 테스트 | 기대 결과 |
|---|---|
| 직전연도 공급대가 기준 판정 | 간이/일반 후보와 근거 조문 표시 |
| 신규사업자 환산 | 사업개시일부터 환산 기준 후보 표시 |
| 법인사업자 | 간이과세 후보에서 제외 |
| 전문직/의료 업종 | 간이 배제/면세/과세 검토 경고 표시 |
| 복수 사업장 | 합산/배제 검토 필요 표시 |
| 과세·면세 겸영 | 거래별 과세구분 필수 경고 |
| 과세유형 변경 | 기존 거래 자동 재작성 금지, 재검토 목록 생성 |
| 국세청/법령 기준 변경 | `TAX_RULE_VERSION` 증가 및 기존 판정 재검토 |
| 신고자료 출력 | 사업자 과세유형 후보, 사용자 확인값, 출처, 확인일 포함 |

## 금지사항

- 총액을 무조건 1.1로 나누어 VAT를 확정하지 않는다.
- 사업자 유형 하나만으로 모든 거래의 VAT를 확정하지 않는다.
- 법령 기준을 코드에만 박아두고 출처/확인일 없이 사용하지 않는다.
- AI나 자동판정 결과를 사용자 확인 없이 신고용 확정값으로 표시하지 않는다.
- 과세유형이 바뀌었을 때 과거 거래를 조용히 덮어쓰지 않는다.
