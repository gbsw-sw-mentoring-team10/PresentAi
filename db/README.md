# PresentAI DB

DBeaver에서 확인한 현재 DB 구조와 변경 SQL을 관리합니다.

## 현재 테이블 구조

| 테이블 | 저장 내용 |
| --- | --- |
| `users` | 사용자 계정 |
| `auth_sessions` | 로그인 세션 |
| `input_files` | 원본 파일 정보 |
| `slides_feedback_result` | 발표 정보, 분석 상태, 피드백 JSON 전체 |

`slides_feedback_result.feedback_result`는 **`JSON DEFAULT NULL`**입니다.
분석 전·실패한 요청은 SQL `NULL`로 둘 수 있으며, 분석이 완료되면 아래 내용을
객체 하나로 저장합니다. JSON 내부 배열과 객체를 별도 테이블로 분리하지 않습니다.

```json
{
  "score": 85,
  "feedback": "종합 평가",
  "strengths": ["명확한 주제"],
  "improvements": [
    {"issue": "근거 부족", "deduction": 15, "solution": "출처 추가"}
  ],
  "revised_script": "수정한 대본",
  "slides": [
    {
      "slide_number": 1,
      "summary": "발표 주제 소개",
      "good_points": ["좋은 제목"],
      "issues": [{"problem": "작은 글씨", "solution": "글자 크기 확대"}],
      "script_connection": "도입 대본과 연결됨"
    }
  ]
}
```

결과 ID, 사용자 ID, 제목, 상태, 생성·수정 시각은 기존 컬럼에서 관리합니다.
`entire_improvements`, `entire_result`, `slide_feedback`는 삭제된 테이블이며
현재 `schema.sql`에는 포함하지 않습니다.

## 폴더 구성

```text
PresentAi/
├── backend/
├── front/
└── db/
    ├── README.md
    ├── schema.sql
    └── migrations/
        ├── README.md
        ├── 001_auth.sql
        ├── 002_user_roles.sql
        ├── 003_slide_feedback_key.sql
        ├── 004_slides_feedback_result.sql
        └── 005_feedback_result_json.sql
```

## 파일별 역할

| 파일 | 역할 |
| --- | --- |
| [schema.sql](schema.sql) | 현재 DB 전체 테이블 구조. 새 빈 DB를 준비할 때 사용 |
| [migrations/README.md](migrations/README.md) | 과거 변경 이력과 현재 구조에서의 실행 기준 |
| [migrations/001_auth.sql](migrations/001_auth.sql) | 로그인 테이블 준비 |
| [migrations/002_user_roles.sql](migrations/002_user_roles.sql) | 기존 `users`에 관리자 역할 컬럼 추가 |
| [migrations/003_slide_feedback_key.sql](migrations/003_slide_feedback_key.sql) | 통합 전 슬라이드 키 변경 이력 |
| [migrations/004_slides_feedback_result.sql](migrations/004_slides_feedback_result.sql) | 분석 작업 상태 컬럼 추가 이력 |
| [migrations/005_feedback_result_json.sql](migrations/005_feedback_result_json.sql) | JSON 컬럼 추가와 기존 세 테이블 삭제. 아래 이관 스크립트로만 실행 |

`schema.sql`에는 위 4개 테이블의 컬럼·키·외래키·인덱스가 포함됩니다.
테이블 데이터와 DB 접속 계정 정보는 포함하지 않습니다.

## 새 DB 준비

MySQL 8.0 이상에서 `utf8mb4`를 사용하는 빈 DB를 만든 뒤,
DBeaver에서 해당 DB를 선택하고 `schema.sql` 전체를 실행합니다.
외래키가 참조하는 테이블부터 생성하도록 순서가 정리되어 있습니다.

`schema.sql`은 기존 구조 변경용 파일이 아닙니다. 이미 테이블이 있는 DB에
실행하면 중복 테이블 오류가 발생합니다. 이 파일에는 `users.role`도 이미
포함되어 있으므로 `002_user_roles.sql`을 따로 실행하지 않습니다.

## 기존 DB에 로그인 관련 변경 적용

`backend` 폴더에서 다음 명령을 실행합니다.

```bash
python -m scripts.init_auth_db
```

이 명령은 `db/migrations/`의 SQL을 읽습니다. 기존 `users`는 유지하고,
`auth_sessions`와 `users.role`을 준비합니다. 이미 적용된 역할 컬럼은 건너뜁니다.
관리자 계정 생성 명령도 같은 SQL 파일을 사용하므로 `db` 폴더를
`backend` 옆에 함께 배치해야 합니다.

## 구조 변경 및 내보내기

피드백은 `slides_feedback_result.feedback_result`에 JSON 객체 하나로 저장합니다.
컬럼은 `JSON NULL`이며 분석 전·실패한 요청은 비워 둘 수 있습니다.
완료된 결과의 `score`, `feedback`, `strengths`, `improvements`, `revised_script`,
`slides`를 원래 배열과 객체 구조 그대로 저장합니다.
현재 DB에서는 JSON 이관과 기존 세 상세 테이블 삭제가 완료된 상태입니다.
아래 절차는 아직 통합하지 않은 다른 DB를 위한 안내입니다.

기존 DB는 `backend` 폴더에서 아래 순서로 전환합니다.

1. `python -m scripts.migrate_feedback_json`으로 데이터와 컬럼을 확인합니다.
2. `python -m scripts.migrate_feedback_json --apply`로 JSON 컬럼을 추가하고 기존 결과를 복사·검증합니다. 기존 테이블은 유지합니다.
3. 이 DB를 사용하는 모든 백엔드를 새 저장·조회 코드로 배포하거나 재시작합니다.
4. `python -m scripts.migrate_feedback_json --apply --drop-legacy`로 최종 복사·검증 후 `entire_improvements`, `slide_feedback`, `entire_result`를 삭제합니다.

`005_feedback_result_json.sql`을 DBeaver에서 단독 실행하지 않습니다.
이관 스크립트는 JSON 배열 순서와 문자열을 보존하며, 과거 `problem`·`solution`
컬럼에만 기록된 내용도 슬라이드 `issues`에 옮깁니다.
이미 저장된 JSON이 기존 결과와 다르거나 처리 중 작업이 남아 있으면 최종 삭제를 중단합니다.
과거에 완료 결과가 저장되었지만 `pending`·`processing`으로 표시되던 기록은
결과를 검증한 뒤 `completed`로 정리합니다.

변경 전 테이블 정의와 전체 기록은 프로젝트의 `.git/db-backups/날짜-식별자/feedback-tables.json`에
백업합니다. 폴더는 0700, 파일은 0600 권한이며 Git에 포함되지 않습니다.
`--backup-dir`로 다른 로컬 경로를 지정할 수도 있습니다. 백업에는 사용자 피드백이
포함되므로 소스 저장소에 올리지 않습니다. MySQL DDL은 자동 커밋되므로
백업과 이관 검증을 마친 다음에만 삭제합니다.

비회원 분석과 예시 분석은 저장하지 않습니다. 음성파일 저장도 포함하지 않습니다.

DB 구조를 DBeaver에서 바꿨다면 기존 DB에 적용할 변경 SQL을 새 번호의
`migrations/*.sql`로 남깁니다. 이후 `backend` 폴더에서 다음 명령을 실행해
현재 전체 구조도 갱신합니다.

```bash
python -m scripts.export_db_schema
```

이 명령은 `backend/.env`의 DB에서 읽기 전용 조회만 수행하고,
`db/schema.sql`을 덮어씁니다. 내보내기 코드는
[backend/scripts/export_db_schema.py](../backend/scripts/export_db_schema.py)에 있습니다.
내보내기 대상은 테이블 정의이며 뷰·트리거·프로시저는 포함하지 않습니다.

## GitHub 공유

`schema.sql`과 변경 SQL은 코드와 함께 관리합니다.
`.env`, 관리자 초기 비밀번호 파일, 사용자 데이터 덤프는 올리지 않습니다.

Git 저장소는 프로젝트 루트에 있으며 `backend/`, `front/`, `db/`를 함께
관리합니다. 저장소를 복제하면 DB 스키마와 변경 SQL도 포함됩니다.
다른 환경에서도 `backend`와 `db`를 같은 부모 폴더 아래에 배치합니다.
