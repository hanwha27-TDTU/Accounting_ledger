> **📌 Sub_evidence-archive_0.01** · 개정 2026-07-09

# Accounting Ledger Evidence Archive Skill

이 문서는 회계장부 앱의 증빙 보관, Cloudinary 업로드, 이미지/PDF 첨부, 증빙대장, 세무사 전달 패키지를 다룰 때 적용하는 별도 스킬 문서다. 영수증, 카드전표, 세금계산서, 계산서, 현금영수증, 계약서, 입금표, PDF 명세서를 첨부하거나 내보낼 때 이 문서를 먼저 본다.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 증빙 원본 | Cloudinary에 이미지와 PDF 모두 업로드 |
| 로컬 저장 | IndexedDB에는 메타와 임시 캐시 중심 |
| DB 저장 | Supabase에는 파일 메타, public_id, URL, 해시, 삭제상태 저장 |
| 세무사 전달 | 증빙대장, Cloudinary 링크, 필요 시 파일 묶음 내보내기 |
| AI | 현재 API 키가 없으므로 향후 확장 자리만 둠 |
| 삭제 | DB soft delete와 Cloudinary public_id 수명주기 추적 |

## 지원 파일

| 종류 | 처리 |
|---|---|
| 이미지 | 원본 업로드, 썸네일/미리보기 URL 저장 |
| PDF | 원본 업로드, 가능하면 첫 페이지 미리보기 또는 썸네일 저장 |
| 기타 파일 | 1차 범위 밖. 필요 시 수동 첨부 후보로만 둠 |

## 권장 테이블

```sql
evidence_files (
  id uuid primary key,
  business_id uuid not null,
  evidence_document_id uuid,
  source_transaction_id uuid,
  storage_provider text default 'cloudinary',
  cloudinary_public_id text,
  resource_type text,
  secure_url text,
  thumbnail_url text,
  original_filename text,
  mime_type text,
  file_size bigint,
  file_hash text,
  page_count int,
  preview_status text,
  future_ocr_text text,
  manual_summary text,
  future_ai_summary text,
  future_ai_status text default 'not_configured',
  upload_status text default 'uploaded',
  delete_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 보관 불변조건

1. 증빙 원본은 이미지와 PDF 모두 Cloudinary 업로드를 지원한다.
2. `cloudinary_public_id` 없이 장기 보관 완료로 표시하지 않는다.
3. 파일 해시를 저장해 중복 업로드와 중복 증빙 후보를 잡는다.
4. PDF는 원본 보관을 기본으로 하고 미리보기 생성 실패가 원본 보관 실패를 의미하지 않는다.
5. 거래 1건에는 여러 증빙 파일을 붙일 수 있다.
6. 증빙 1건이 여러 거래와 관련될 수 있으므로 연결 테이블 확장을 열어둔다.
7. 삭제는 hard delete가 아니라 `deleted_at`, `delete_status`, Cloudinary 삭제결과를 함께 추적한다.

## 세무사 전달 패키지

세무사에게 전달할 때는 숫자 파일만 보내지 않는다.

| 산출물 | 내용 |
|---|---|
| 국세청 간편장부 호환 Excel | 장부 검토용 |
| 법정 최신 신고서식 PDF/Excel | 신고서식 검토용 |
| 증빙대장 Excel/PDF | 거래일, 거래처, 금액, 증빙유형, Cloudinary 링크 |
| 증빙 파일 목록 | 이미지/PDF 원본 파일명, 해시, 업로드 상태 |
| 판단메모 | 검토 필요 거래와 세무 판단 근거 |

## AI 확장 원칙

현재 API 키가 없으므로 AI/OCR 자동분석은 구현 필수 기능이 아니다.

허용:

- 사용자가 직접 입력한 요약 `manual_summary`
- 향후 OCR/AI 연동을 위한 `future_ocr_text`, `future_ai_summary`, `future_ai_status`
- 외부 도구 결과를 사용자가 붙여넣는 수동 메모

금지:

- API 키 없이 AI 자동분석이 되는 것처럼 UI에 표시
- AI 결과를 사용자 확인 없이 확정 증빙 판단으로 사용
- AI 필드가 비어 있다는 이유로 증빙 보관 실패 처리

## 검증 체크리스트

| 테스트 | 기대 결과 |
|---|---|
| 이미지 업로드 | Cloudinary public_id와 secure_url 저장 |
| PDF 업로드 | 원본 PDF 링크와 mime_type 저장 |
| 중복 파일 | file_hash로 중복 후보 표시 |
| 삭제 | DB soft delete와 Cloudinary delete_status 추적 |
| 세무사 전달 | 증빙대장에 이미지/PDF 링크가 모두 포함 |
| AI 미설정 | AI 키가 없어도 증빙 저장과 내보내기가 정상 동작 |
