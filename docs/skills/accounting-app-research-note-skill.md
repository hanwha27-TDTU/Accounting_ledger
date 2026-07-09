> **📌 Sub_app-research-note_0.01** · 개정 2026-07-09

# Accounting Ledger App Research Note Skill

이 문서는 회계장부 앱의 연구노트를 다룰 때 적용하는 별도 스킬 문서다. 여기서 연구노트는 거래나 세무 판단 기록이 아니라 앱 개발, 설계 결정, 업데이트 이력, 스킬 문서 변경, 오류 재발 방지 교훈을 남기는 기록이다.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 연구노트 용도 | 앱 개발 및 업데이트 이력 |
| 거래 판단 기록 | `decision_notes`로 별도 관리 |
| 앱 버전 | `0.00`에서 시작, 업데이트마다 `0.01` 증가 |
| 스킬 버전 | 공유한 `Sub_<name>_N.MM` 체계 사용 |
| AI | API 키가 없으므로 향후 확장 계획만 기록 |

## 권장 테이블

```sql
app_research_notes (
  id uuid primary key,
  app_version text,
  skill_version text,
  note_type text not null,
  title text not null,
  body text,
  related_file text,
  related_commit text,
  source_type text,
  source_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
```

## 노트 유형

| note_type | 의미 |
|---|---|
| `design_decision` | 설계 결정 |
| `update_history` | 앱 업데이트 이력 |
| `skill_update` | 스킬 문서 변경 |
| `bug_lesson` | 오류 원인과 재발 방지 |
| `legal_form_update` | 법정서식 업데이트 반영 |
| `future_ai_plan` | 향후 AI/API 연동 계획 |

## 불변조건

1. 연구노트는 앱 개발과 업데이트 이력만 다룬다.
2. 거래·증빙·세무 판단 근거는 `decision_notes`에 남긴다.
3. 앱 버전이 올라갈 때는 관련 연구노트 또는 업데이트 이력을 남긴다.
4. 스킬 문서가 바뀌면 해당 스킬 버전을 올리고 연구노트에 변경 이유를 남긴다.
5. AI 기능은 현재 API 키가 없으므로 활성 기능으로 쓰지 않고 향후 확장 계획만 기록한다.

## 금지사항

- 거래 판단 기록을 연구노트라고 부르지 않는다.
- 앱 업데이트 이력 없이 버전만 올리지 않는다.
- AI API 키가 없는 상태에서 AI 자동기능을 완료된 기능처럼 기록하지 않는다.
