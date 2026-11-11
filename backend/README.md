PresentAI API서버 코드입니다. <br>
.env파일에 GEMINI_API_KEY와 GEMINI_MODEL을 입력해주세요. <br>
GEMINI_MODEL이 비어 있으면 gemini-3.8-flash를 사용합니다. <br>
또한 발음 평가를 위해 AZURE_SPEECH_KEY와 AZURE_SPEECH_REGION도 추가해주세요. <br>
python3 -m venv .venv 가상환경 설치 <br>
source .venv/bin/activate 가상환경 활성화 후 pip install -r requirements.txt로 필요 라이브러리들을 설치해주세요.

## DB 스키마 관리

테이블 정의와 변경 SQL은 `backend`와 같은 위치에 있는 `../db/` 폴더에서
관리합니다. 프로젝트 배치는 `PresentAi/backend`, `PresentAi/front`,
`PresentAi/db`입니다. 실행 코드도 이 상대 위치에서 SQL 파일을 찾습니다.

- `../db/schema.sql`: 통합 후 4개 테이블 전체 정의. 새 빈 DB에 실행합니다.
- `../db/migrations/`: 기존 DB에 적용하는 변경 SQL입니다.
- [DB 사용 안내](../db/README.md): 새 DB 준비, 변경 적용, GitHub 공유 방법입니다.

전체 구조를 다시 내보낼 때는 `backend` 폴더에서 실행합니다.

```bash
python -m scripts.export_db_schema
```

이 명령은 `.env`의 DB에서 테이블 구조만 읽어 `../db/schema.sql`에 저장합니다.
이 저장소는 프로젝트 루트에서 `backend/`, `front/`, `db/`를 함께
관리하므로, 저장소를 복제하면 DB 스키마와 변경 SQL도 포함됩니다.

## 로그인 API

로그인 코드는 아래 순서로 읽으면 처리 흐름을 따라갈 수 있습니다.

| 파일 | 역할 |
| --- | --- |
| `routers/auth.py` | API 요청을 받아 회원가입·로그인·로그아웃 처리 연결 |
| `schemas/auth.py` | 요청에 필요한 값과 응답할 사용자 정보 정의 |
| `services/auth_service.py` | 사용자 확인, DB 저장, 세션 생성·조회·삭제 |
| `services/auth_security.py` | 비밀번호 해시 검증, 로그인 시도 횟수 제한 |
| `database.py` | MySQL 연결 생성·종료 및 DB 오류 처리 |
| `config.py` | 환경 변수와 공통 설정 |

기존 `users` 테이블에 이메일과 Argon2id 비밀번호 해시를 저장합니다.
백엔드는 `.env`의 공통 DB 계정으로 MySQL에 접속합니다.
사용자마다 별도 MySQL 계정을 만들지 않습니다.

1. `.env.example`을 참고해 기존 `.env`에 DB 접속 정보를 추가합니다.
2. `python -m pip install -r requirements.txt`로 의존성을 설치합니다.
3. `python -m scripts.init_auth_db`로 로그인 테이블을 준비합니다.
   기존 `users`가 있으면 유지하고, `auth_sessions`와 `users.role`을 준비합니다.
4. `uvicorn main:app --reload`로 서버를 실행합니다.

MySQL 연결은 TLS와 서버 인증서 검증을 사용합니다.
별도 CA 인증서가 필요한 환경은 `DB_SSL_CA`에 해당 파일 경로를 지정합니다.

| 요청 | 기능 | 입력 |
| --- | --- | --- |
| `POST /auth/register` | 회원가입 | JSON `email`, `password` |
| `POST /auth/login` | 로그인 및 세션 쿠키 발급 | JSON `email`, `password` |
| `GET /auth/me` | 로그인한 사용자 확인 | 로그인 쿠키 |
| `GET /auth/admin/me` | 관리자 권한 확인 | 관리자 로그인 쿠키 |
| `POST /auth/logout` | 현재 세션 삭제 및 쿠키 만료 | 로그인 쿠키 |

회원가입 비밀번호는 8~128자이며 이메일 앞뒤 공백과 대소문자는 정규화합니다.
회원가입 후 `/auth/login`을 호출하면 로그인됩니다.
회원가입·로그인·내 정보 응답에는 `user_id`, `email`, `role`이 포함됩니다.

```json
{
  "email": "your-email@example.com",
  "password": "your-long-password"
}
```

로그인 쿠키는 HttpOnly, SameSite=Lax이며 24시간 후 만료됩니다.
DB에는 쿠키 원문 대신 SHA-256 해시만 저장합니다.
로그아웃하면 서버의 세션도 삭제되므로 이전 쿠키를 재사용할 수 없습니다.
동일 브라우저에서 다시 로그인하면 기존 세션을 교체합니다.

브라우저 요청은 `CORS_ORIGINS`에 쉼표로 구분해 등록한 출처만 허용합니다.
프론트엔드는 로그인 이후 요청에 `credentials: 'include'`를 지정해야 합니다.
로컬에서는 프론트의 `/api/presentation` 프록시로 브라우저 요청을 같은 출처로 유지합니다.
같은 사이트의 HTTPS 환경에 배포할 때는 `AUTH_COOKIE_SECURE=true`로 설정합니다.
로컬 HTTP에서만 `AUTH_COOKIE_SECURE=false`를 사용합니다.
서로 다른 사이트에 배포하는 경우에는 쿠키/CSRF 정책을 추가로 설계해야 합니다.

단일 서버 프로세스에서 IP당 1분에 로그인 10회, 회원가입 5회로 제한합니다.
여러 프로세스나 여러 서버로 운영할 때는 공유 저장소 기반 요청 제한이 필요합니다.
프론트의 로그인 창은 계정 API에 연결되어 있습니다. 로그인한 사용자의 실제
발표자료 분석 결과는 계정별로 저장합니다. 이메일 인증과 비밀번호 재설정은 포함하지 않습니다.

## 발표자료 피드백 저장

`POST /upload/`는 비회원에게도 분석 결과를 반환합니다. 비회원 결과와
`POST /mock/upload/` 예시 결과는 DB에 저장하지 않습니다.
로그인 쿠키가 있으면 요청 시작 시 세션을 검증합니다.
위조·만료·삭제된 세션은 401로 거절합니다. 회원 요청은 DB에 `pending`으로 먼저
기록하고 `result_id`, `status`를 반환한 뒤 백그라운드에서 분석합니다.
`GET /feedback/{result_id}`로 `pending`, `processing`, `completed`, `failed`를
조회할 수 있으며 완료되면 피드백 전체를 반환합니다.

로그인한 사용자의 결과는 `slides_feedback_result` 한 테이블에서 관리합니다.
`user_id`, 제목, 작업 상태는 기존 컬럼에 두고, 피드백 본문 전체는
`feedback_result JSON NULL`에 저장합니다. 분석 전이나 실패한 요청의 본문은
SQL `NULL`이며, 완료 시 피드백 JSON과 `completed` 상태를 한 UPDATE로 저장합니다.
`entire_result`, `entire_improvements`, `slide_feedback`는 통합 이후 사용하지 않습니다.

JSON에는 점수, 종합 평가, 장점 배열, 개선 항목 배열, 수정 대본,
슬라이드별 피드백 배열을 원래 구조대로 보관합니다. 조회 API의 응답 형식은 유지합니다.
자료만 분석한 경우 수정 대본과 대본 연관성은 빈 문자열입니다.
로그인한 사용자가 파일을 업로드하면 원본도 S3에 저장하고, `input_files`의 파일 ID를
피드백 기록에 연결합니다. 원본 저장 실패는 분석 실패와 구분해 반환합니다.
현재 결과 화면과 내 피드백 상세 화면에서 소유자만 ‘원본 자료 받기’를 사용할 수 있습니다.
기존 DB에는 `python -m scripts.init_file_storage --apply`로 nullable 연결 컬럼을
추가합니다. 인증과 버킷 설정은 [S3 연결 안내](docs/s3.md)를 참고하세요.
[Azure 서버 담당자용 배포 절차](docs/azure-s3.md)에는 서버 인증 설정과 검증 순서가 있습니다.
음성파일 저장도 현재 범위에 포함되지 않습니다. 프론트에서 선택한 리허설 음성은
브라우저 미리 듣기에만 사용하며 발표자료 분석 요청에 포함하지 않습니다.

완료된 회원 결과의 조회 응답에는 피드백 필드와 `saved_result_id`,
`title`, `created_at`, `status: "completed"`가 포함됩니다.
백그라운드 분석이나 저장이 실패하면 JSON 저장을 롤백하고 작업을 `failed`로
표시하며, 상세 API에 사용자용 `error_message`를 반환합니다.
비회원은 기존처럼 모델 결과를 즉시 반환하며 ID는 `null`, 저장 상태는 `guest`입니다.
DB 연결 또는 작업 생성에 실패한 경우에도 동기로 분석하고 저장 실패를 표시합니다.
비회원의 파싱되지 않은 모델 텍스트는 `raw_result`로 반환합니다.
`GET /feedback/{saved_result_id}`는 로그인한 사용자의 결과만 반환하며,
다른 사용자의 결과와 없는 결과는 모두 404입니다.

`GET /feedback?page=1&page_size=20`은 로그인한 사용자의 저장된 피드백 목록을
최신순으로 반환합니다. 목록에는 결과 ID, 제목, 점수, 생성 시각이 포함되며,
선택한 결과 ID로 상세 API를 호출하면 전체 피드백을 받을 수 있습니다.
상세 응답은 main의 형식에 따라 피드백 필드와 결과 ID·제목·생성일·상태를 최상위 JSON으로 반환합니다.
프런트엔드 프록시 경로, 응답 예시와 오류 처리는 [피드백 조회 API 안내](docs/feedback-api.md)를 참고하세요.

기존 DB의 피드백 JSON 통합은 아래 명령으로 준비합니다.

```bash
python -m scripts.migrate_feedback_json
python -m scripts.migrate_feedback_json --apply
```

첫 명령은 확인만 하며, `--apply`는 기존 기록을 비공개 로컬 백업에 보관하고
JSON 컬럼에 복사·검증합니다. 기존 세 테이블은 이 단계에서 유지합니다.
같은 DB를 쓰는 백엔드를 모두 새 코드로 전환한 뒤 최종 정리합니다.

```bash
python -m scripts.migrate_feedback_json --apply --drop-legacy
```

최종 명령은 새로 추가된 기존 형식 결과도 다시 이관·검증한 다음 세 테이블을
삭제합니다. 처리 중 작업이나 내용이 다른 JSON이 있으면 삭제를 중단합니다.
`python -m scripts.init_feedback_db`도 같은 명령의 별칭입니다.
자세한 순서와 백업 위치는 [DB 사용 안내](../db/README.md)를 참고하세요.
새 DB의 `../db/schema.sql`에는 nullable JSON 컬럼과 작업 상태 컬럼이 포함되어 있습니다.

`GET /health`는 피드백 본문을 읽지 않고 JSON 컬럼 접근을 확인합니다.
응답의 `feedback_storage`는 `json`이며, Render의 `revision`은 배포된 커밋 SHA입니다.
최종 테이블 삭제 전에 이 경로에서 새 커밋과 정상 상태를 확인합니다.

로컬 프론트는 같은 출처의 `/api/presentation` 프록시를 통해
기본적으로 `http://127.0.0.1:8000`에 연결합니다. 브라우저에 DB 자격 증명을
보내지 않으며 `presentai_session` 쿠키로 계정을 확인합니다.

## 관리자 계정

`users.role`은 일반 사용자 `user`와 관리자 `admin`으로 구분합니다.
공개 회원가입 API에서는 항상 `user`로 생성합니다.
관리자는 백엔드 폴더에서 다음 명령으로 생성합니다.

```bash
python -m scripts.create_admin your-email@example.com
```

새 계정은 무작위 비밀번호로 생성하며 초기 비밀번호는
`admin-credentials.local.txt`에 저장됩니다. 이 파일은 Git에서 제외되고,
파일을 만든 사용자만 읽고 쓸 수 있습니다.
다른 경로가 필요하면 `--credentials-file 파일경로`를 지정합니다.
기존 계정이면 비밀번호와 자료를 유지하고 관리자 역할만 부여합니다.
같은 계정으로 명령을 다시 실행해도 비밀번호를 초기화하지 않습니다.

관리자도 `/auth/login`으로 로그인합니다.
관리자 전용 API에는 `Depends(get_current_admin)`을 사용합니다.
권한은 매 요청마다 DB에서 확인하므로 관리자 역할을 회수하면 기존 로그인
세션으로도 관리자 API를 사용할 수 없습니다.

## 로그인 테스트

```bash
python -m pip install -r requirements-dev.txt
RUN_MYSQL_TESTS=1 python -m pytest -q
```

테스트는 준비된 DB 스키마를 복제한 연결 전용 임시 테이블을 사용합니다.
실제 사용자 및 세션 테이블의 데이터는 읽거나 변경하지 않습니다.
등록·중복 이메일·비밀번호 검증·로그인 유지·만료·로그아웃 후 재사용 차단·
세션 교체·다른 출처의 요청 차단·시도 횟수 제한·DB 장애 응답을 검증합니다.
