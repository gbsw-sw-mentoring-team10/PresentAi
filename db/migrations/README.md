# DB 변경 이력

현재 구조는 상위 폴더의 [`schema.sql`](../schema.sql)을 기준으로 합니다.
새 DB는 `schema.sql`만 실행하며, 아래 변경 SQL을 처음부터 다시 실행하지 않습니다.

| 번호 | 변경 내용 | 적용 대상 |
| --- | --- | --- |
| `001_auth.sql` | 사용자·세션 테이블 준비 | 로그인 테이블이 없는 기존 DB |
| `002_user_roles.sql` | 사용자 역할 추가 | `users.role`이 없는 기존 DB |
| `003_slide_feedback_key.sql` | 통합 전 슬라이드 기본키 변경 | 과거 분리 테이블을 사용하던 DB의 변경 이력 |
| `004_slides_feedback_result.sql` | 분석 작업 상태 컬럼 추가 | 상태 컬럼이 없는 기존 DB |
| `005_feedback_result_json.sql` | nullable JSON 컬럼으로 통합하고 세 상세 테이블 제거 | JSON 통합 전 DB. 이관 스크립트로 실행 |
| `006_feedback_files.sql` | 원본 파일 ID와 저장 상태 연결 | S3 원본 연결 컬럼이 없는 기존 DB |

현재 DB에는 `slides_feedback_result.feedback_result JSON DEFAULT NULL`이 있고,
`entire_improvements`, `entire_result`, `slide_feedback`는 삭제되어 있습니다.
따라서 현재 DB에 `003`, `004`, `005`를 다시 직접 실행하지 않습니다.
기존 파일은 변경 이력을 보존하기 위해 남깁니다.

S3 원본 연결은 `backend`에서 `python -m scripts.init_file_storage`로 확인하고,
`python -m scripts.init_file_storage --apply`로 추가합니다. 이미 적용된 경우 건너뜁니다.
`006`은 nullable 컬럼과 외래키만 추가하며 기존 피드백 JSON과 데이터를 유지합니다.

다른 기존 DB의 결과를 통합할 때는 `backend`에서 실행합니다.

```sh
python -m scripts.migrate_feedback_json
python -m scripts.migrate_feedback_json --apply
# JSON 저장 코드를 사용하는 백엔드로 전환한 다음 실행합니다.
python -m scripts.migrate_feedback_json --apply --drop-legacy
```

`005_feedback_result_json.sql`은 이관 스크립트가 백업·복사·검증을 마친 뒤
단계별로 사용하는 SQL입니다. 데이터가 남아 있는 DB에서 단독 실행하지 않습니다.
