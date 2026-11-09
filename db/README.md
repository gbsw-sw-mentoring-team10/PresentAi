# PresentAI DB

DBeaver에서 만든 테이블을 포함해 현재 DB 구조와 이후 변경 SQL을 모아 둡니다.

```text
PresentAi/
├── backend/
├── front/
└── db/
    ├── README.md
    ├── schema.sql
    └── migrations/
        ├── 001_auth.sql
        ├── 002_user_roles.sql
        └── 003_slide_feedback_key.sql
```

## 파일별 역할

| 파일 | 역할 |
| --- | --- |
| [schema.sql](schema.sql) | 현재 DB 전체 테이블 구조. 새 빈 DB를 준비할 때 사용 |
| [migrations/001_auth.sql](migrations/001_auth.sql) | 로그인 테이블 준비 |
| [migrations/002_user_roles.sql](migrations/002_user_roles.sql) | 기존 `users`에 관리자 역할 컬럼 추가 |
| [migrations/003_slide_feedback_key.sql](migrations/003_slide_feedback_key.sql) | 슬라이드 키를 `(slides_result_id, slide_number)`로 변경 |

`schema.sql`에는 `users`, `input_files`, `slides_feedback_result`,
`entire_result`, `entire_improvements`, `slide_feedback`, `auth_sessions`의
컬럼·키·외래키·인덱스가 포함됩니다. 현재 테이블 이름과 컬럼 이름을 그대로
보존하며, 테이블 데이터와 DB 접속 계정 정보는 포함하지 않습니다.

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

기존 DB에서 로그인 사용자의 발표별 피드백 저장을 준비하려면 `backend`에서
`python -m scripts.init_feedback_db`를 실행합니다. 이미 적용한 키는 건너뜁니다.
기존 데이터는 유지하며, 여러 발표에 같은 슬라이드 번호를 저장할 수 있게 합니다.

로그인한 실제 분석은 `slides_feedback_result`, `entire_result`,
`entire_improvements`, `slide_feedback`에 한 트랜잭션으로 저장합니다.
장점과 슬라이드별 문제 목록은 TEXT 컬럼에 JSON으로 보관합니다.
비회원 분석과 예시 분석은 저장하지 않습니다.
현재 음성파일 저장 기능은 없으며, 이 작업에서는 음성파일이나 보관 경로를 DB에 저장하지 않습니다.

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
