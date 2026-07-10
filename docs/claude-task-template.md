# Claude Task Template

아래 내용을 Claude에 전달하고, `<...>` 부분만 해당 작업에 맞게 채운다.

```text
Accounting Ledger 저장소에서 다음 작업을 수행해 주세요.

작업: <구현하거나 조사할 내용>
완료 기준: <사용자 관점의 완료 조건>
제약 또는 제외 범위: <변경하면 안 되는 항목>

시작 전 반드시 AGENTS.md, CLAUDE.md, docs/claude-handoff.md와 관련 docs/skills 문서를 읽으세요.
현재 Git 상태와 기존 변경을 먼저 확인하고, 기존 작업을 되돌리거나 참고용 원본 파일을 커밋하지 마세요.

데이터, Auth, RLS, IndexedDB, 동기화, 백업, 증빙, 법정서식에 영향을 주면 Schema/Contract, Security, Migration 관점의 검토를 포함하세요.
동기화는 updated_at 병합과 canonical_version 최종본 모드를 분리해야 합니다.
service role, Cloudinary secret, OAuth client secret을 코드·문서·커밋에 넣지 마세요.
RLS를 제거하지 마세요.

작업 후에는 변경 파일, 검증 결과, 데이터/보안 영향, 남은 위험, 버전·연구노트 갱신 여부를 보고하세요.
`npm run harness:check`를 실행하고, Required 실패·Baseline·Manual 항목을 구분해 보고하세요.
원격 push나 배포는 명시적으로 요청받은 경우에만 하세요.
```

## 작업 유형별 추가 문구

| 작업 | 템플릿 뒤에 추가할 문구 |
|---|---|
| 화면 구현 | 데스크톱과 모바일, 로딩·오류·빈 상태, 긴 한국어 문구를 검토하세요. |
| Supabase 변경 | DDL은 로컬 migration 파일과 원격 적용 내역을 일치시키고, RLS·권한·보안 advisor 결과를 확인하세요. |
| 동기화/저장 변경 | 기존 IndexedDB와 Supabase 데이터의 이전·복원·부분 실패·재실행 안전성을 검증하세요. |
| 세무/리포트 | 기준 법령·서식의 확인일과 버전을 남기고, 최신 스냅샷 없이는 확정 출력으로 표시하지 마세요. |
| 버그 수정 | 재현 조건, 원인, 수정, 회귀 테스트 결과를 순서대로 남기세요. |
