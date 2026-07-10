> **📌 Sub_legal-forms_0.02** · 개정 2026-07-11

# Accounting Ledger Legal Forms Skill

이 문서는 회계장부 앱에서 신고서식, 세무 리포트, PDF/Excel 출력물을 만들 때 적용하는 법정서식 확인 스킬 문서다. 간편장부소득금액계산서, 총수입금액 및 필요경비명세서, 감가상각비 조정명세서, 부가가치세 관련 명세서, 사업자등록 관련 서식처럼 법령 별지서식에 근거한 출력물을 다룰 때 이 문서를 먼저 본다.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 기본 원칙 | 리포트 기능은 법정 최신양식을 사용한다 |
| 최종 기준 | 국가법령정보센터 현행 법령/시행규칙의 별지서식 |
| 보조 기준 | 국세청, 홈택스, 공식 프로그램, 공식 Excel 양식 |
| 저장 방식 | 서식 확인 결과를 `legal_reference_checks`와 `legal_form_snapshots`에 저장 |
| 출력 조건 | 최신 서식 스냅샷이 없으면 확정 PDF/Excel 출력 금지 |
| 버전관리 | 서식 변경 시 `LEGAL_FORM_VERSION` 또는 `TAX_RULE_VERSION` 증가 |

## 확인 절차

1. 법령명으로 현행 법령/시행규칙을 검색한다.
2. 법령ID, MST, 공포일, 시행일을 기록한다.
3. 별표·서식 조회에서 `knd=2`로 별지서식을 확인한다.
4. 서식 번호, 서식명, `bylSeq`, 파일 형식, 개정일을 기록한다.
5. 서식 본문 또는 추출 결과의 해시를 만들어 `snapshot_hash`로 저장한다.
6. 앱 리포트 템플릿은 `form_snapshot_id`를 반드시 참조한다.
7. 새 서식이 발견되면 기존 리포트와 템플릿을 재검토 대상으로 표시한다.

## 2026-07-09 확인 기준

| 법령 | 확인값 |
|---|---|
| 소득세법 시행규칙 | 현행, 법령ID `007507`, MST `286379`, 공포일 `2026-05-22`, 시행일 `2026-07-01` |
| 부가가치세법 시행규칙 | 현행, 법령ID `007289`, MST `284995`, 공포일 `2026-03-20`, 시행일 `2026-04-01` |

확인한 서식 예:

| 서식 | 확인값 |
|---|---|
| 간편장부소득금액계산서 | 소득세법 시행규칙 별지 제74호서식, `bylSeq=007400`, HWP, 본서식 개정 `2023-03-20` |
| 총수입금액 및 필요경비명세서 | 별지 제74호서식 부표, 부표 개정 `2025-03-21` |

## 권장 테이블

```sql
legal_form_snapshots (
  id uuid primary key,
  tax_year int not null,
  report_type text not null,
  law_name text not null,
  law_id text,
  mst text,
  effective_date date,
  annex_kind text not null,
  form_no text not null,
  form_name text not null,
  byl_seq text,
  form_revision_date date,
  file_format text,
  source_url text,
  source_check_id uuid,
  snapshot_hash text not null,
  raw_snapshot jsonb not null,
  is_current_for_tax_year boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

리포트 테이블에는 다음 필드를 둔다.

| 필드 | 의미 |
|---|---|
| `form_snapshot_id` | 어떤 법정서식을 기준으로 출력했는지 |
| `generated_at` | 출력 생성 시각 |
| `requires_review` | 서식/세법/입력값 재검토 필요 여부 |
| `legal_form_version` | 앱 내부 법정서식 매핑 버전 |

## 리포트 출력 불변조건

1. 법정 신고서식 출력은 `form_snapshot_id` 없이 생성하지 않는다.
2. 출력물에는 기준 법령명, 시행일, 별지서식 번호, 개정일, 조회일을 메타로 남긴다.
3. 사용자가 보는 요약 리포트와 법정 신고서식 리포트를 명확히 구분한다.
4. 국세청 공식 프로그램의 출력 흐름은 참고하되, 서식 최신성은 국가법령정보센터 기준으로 재확인한다.
5. 홈택스 전자신고 입력 항목은 법정서식과 다를 수 있으므로 별도 매핑으로 관리한다.

## 검증 체크리스트

| 테스트 | 기대 결과 |
|---|---|
| 현행 법령 조회 | 법령ID, MST, 시행일이 저장된다 |
| 서식 조회 | 별지서식 번호, 서식명, `bylSeq`, 개정일이 저장된다 |
| 스냅샷 연결 | 리포트가 `form_snapshot_id`를 가진다 |
| 구버전 감지 | 새 서식 발견 시 기존 리포트가 재검토 상태가 된다 |
| 보조 리포트 구분 | 앱 요약표가 법정 신고서식으로 오인되지 않는다 |

## 금지사항

- 국가법령정보센터 확인 없이 신고서식 PDF/Excel을 확정 출력하지 않는다.
- 파일명이나 인터넷 검색 결과만 보고 최신서식이라고 판단하지 않는다.
- 앱 자체 디자인 리포트를 법정서식처럼 표시하지 않는다.
- 구버전 서식 스냅샷을 최신 기준으로 재사용하지 않는다.

## 도메인 Guardian 연결

법령 체계도는 단순 서식 확인용이 아니라 장부 검증 흐름의 상위 근거로 사용한다. 다음 에이전트는 법령·서식 snapshot을 참조해야 한다.

| 도메인 에이전트 | 참조해야 하는 법령·서식 근거 |
|---|---|
| Chart of Accounts Guardian | 국세청 용어, 신고서 항목, 필요경비 분류, 업종별 계정과목 |
| Tax Mapping Reviewer | 소득세법, 부가가치세법, 업종코드, 간편장부/복식부기 의무 기준 |
| Financial Statement Generator | 최신 법정서식 snapshot, 신고서·명세서 별지, 세무사 전달 출력 기준 |
| Period Close Guardian | 신고기간, 마감 기준일, 수정신고·경정청구와 연결되는 변경 제한 |
| Audit Trail Guardian | 법정 보관, 변경 이력, 신고용 출력의 생성 근거 |

세부 역할과 릴리스 게이트는 `docs/skills/accounting-domain-guardians-skill.md`를 따른다.
