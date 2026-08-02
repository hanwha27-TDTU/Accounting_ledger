> **Sub_multicurrency-fx_0.01** · 제정 2026-08-02

# Accounting Ledger 다중통화·일일환율 스킬

회계 앱에서 원·숨·달러·엔 등 여러 통화를 입력받고 대한민국 원화 장부로 확정할 때 적용한다. 통화 선택 UI만 추가하는 작업이 아니라 원금액, 적용환율, 기준일, 출처와 원화 전기금액의 감사 가능성을 보존하는 데이터 계약이다.

## 기준 원칙

1. 장부와 복식 전표의 기능통화는 KRW다. 차변·대변, VAT, 리포트와 세무 계산에는 저장 당시 확정한 원화 금액만 사용한다.
2. 외화 거래는 `currency_code`, `original_amount`, `exchange_rate_to_krw`, `exchange_rate_date`, `exchange_rate_source`, `exchange_rate_fetched_at`, `exchange_rate_manual`을 원화 금액과 함께 보존한다.
3. 과거 거래는 오늘의 환율로 다시 계산하지 않는다. 거래 저장 시점의 환율 증거와 원화 금액은 변경 이력 없는 재평가 대상이 아니다.
4. 고정지출 일정은 외화 원금액을 보존한다. 목록·대시보드 예상액은 최신 일일 환율로 다시 보여줄 수 있지만, 실제 거래가 생성될 때 거래일의 환율을 별도로 확정한다.
5. 통화와 `is_overseas`는 분리한다. 외화 결제와 해외 세무거래는 같은 개념이 아니며 원화 결제 해외 서비스도 존재한다.
6. 대한민국 법정 계산기의 입력은 최종적으로 KRW여야 한다. 사용자가 외화로 입력하면 계산 엔진 호출 전에 원화로 변환하고, 결과는 원화로 표시한다.

## 지원 통화와 환율원

- 초기 입력 선택지는 `KRW`, `UZS`, `USD`, `JPY` 네 개다. DB는 기존 ISO 4217 데이터의 읽기 호환을 위해 3글자 대문자 코드를 보존할 수 있다.
- 기본 환율원은 우즈베키스탄 중앙은행(CBU)의 공개 JSON 일일환율이다. API 키·secret을 저장하지 않는다.
- CBU는 각 외화를 UZS로 고시한다. `Nominal`을 반드시 반영해 `UZS_per_unit = Rate / Nominal`로 정규화한다.
- KRW 교차환율은 `KRW_per_unit(X) = UZS_per_unit(X) / UZS_per_unit(KRW)`다. UZS는 `1 / UZS_per_unit(KRW)`다.
- 주말·공휴일·미래 고정지출일에는 요청일 이하 가장 최근 고시일을 사용하고 실제 `exchange_rate_date`를 표시·보존한다.

## 실패·오프라인 규칙

1. 같은 요청일의 로컬 캐시가 있으면 재사용한다. 날짜별 캐시는 최근 항목만 제한적으로 보관한다.
2. 네트워크 실패 시 마지막 정상 스냅샷을 쓰려면 화면에 “마지막 정상 환율” 경고를 표시하고 거래를 검토 대상으로 남긴다.
3. 정상 스냅샷도 없으면 임의의 `1` 환율로 저장하지 않는다. 환율 입력을 비우고 사용자가 직접 입력하도록 차단한다.
4. 수동 환율은 허용하되 `exchange_rate_source='MANUAL'`, `exchange_rate_manual=true`로 저장한다.
5. 외부 응답은 HTTP 성공처럼 보여도 반드시 `response.ok`와 JSON 구조, 필수 통화·양수 rate·날짜 형식을 검증한다.

## 데이터·동기화 호환

- 기존 `source_transactions.foreign_currency/foreign_amount/exchange_rate`는 구버전 클라이언트 호환용으로 유지하고 새 앱은 generic 필드를 SSOT로 사용하면서 외화 저장 시 legacy 필드도 함께 기록한다.
- migration은 기존 `total_amount`·`fixed_expenses.amount`를 바꾸지 않고 generic 필드를 backfill한다. 구버전 클라이언트가 generic 필드를 보내지 않아도 기존 원화·외화 필드로 읽을 수 있어야 한다.
- 다중통화 필드는 기존 행에 포함되어 IndexedDB, JSON 백업, Supabase LWW, canonical, tombstone 생명주기를 그대로 따른다. 환율 캐시는 참조 데이터이며 canonical 사용자 데이터로 취급하지 않는다.
- 스키마 계약을 바꾸면 `docs/accounting-ledger-data-lifecycle-matrix.md`, `docs/accounting-ledger-concept-ledger.md`, 연구노트와 handoff를 같은 변경에서 갱신한다.

## UI 계약

- 모든 사용자 금액 입력에는 통화 선택을 금액 입력보다 먼저 또는 같은 그룹에 둔다. 기본값은 KRW다.
- 외화 선택 시 원화 환산액, 공식 환율일, 출처, stale/수동 상태를 즉시 보여준다.
- 환율은 수정 가능해야 하고 공식환율 새로고침 버튼을 제공한다.
- 목록은 외화 원금액을 우선 보여주고 `≈ 원화`를 보조 표시한다. 장부·전표·집계는 원화 확정액을 사용한다.
- 통화 변경·거래일 변경 시 일일 환율을 다시 조회하되 입력 중 자동 동기화 전체 렌더가 폼을 지우지 않게 한다.

## 검증 체크리스트

- [ ] CBU `Nominal`이 1이 아닌 fixture에서도 교차환율이 맞다.
- [ ] USD/JPY/UZS→KRW 환산과 원 단위 반올림이 맞다.
- [ ] 주말 요청의 `requestedDate`와 실제 `rateDate`가 분리된다.
- [ ] 거래 저장 후 원화 전표가 균형이고 외화 증거 필드가 남는다.
- [ ] 고정지출 최신 예상액을 보여줘도 저장 당시 원화 금액을 조용히 덮어쓰지 않는다.
- [ ] legacy 외화 행과 KRW 행을 새 앱이 올바르게 읽는다.
- [ ] 오프라인 캐시·캐시 없음·수동 환율 세 경로가 구분된다.
- [ ] RLS, canonical, backup restore 계약과 비밀값 부재를 검토한다.

## 금지사항

- 현재 환율로 과거 거래와 이미 생성된 전표를 자동 재평가하지 않는다.
- 통화 기호만 바꾸고 숫자는 그대로 두지 않는다.
- 외화라는 이유만으로 `is_overseas=true`를 자동 저장하지 않는다.
- 무료 제3자 API의 키나 service role을 공개 HTML에 넣지 않는다.
- 환율 조회 실패를 숨기거나, 출처·기준일 없이 환산액만 표시하지 않는다.
