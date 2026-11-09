PresentAI API서버 코드입니다. <br>
.env파일에 GEMINI_API_KEY와 GEMINI_MODEL을 입력해주세요. <br>
또한 발음 평가를 위해 AZURE_SPEECH_KEY와 AZURE_SPEECH_REGION도 추가해주세요. <br>
python3 -m venv .venv 가상환경 설치 <br>
source .venv/bin/activate 가상환경 활성화 후 pip install -r requirements.txt로 필요 라이브러리들을 설치해주세요.

## DB 스키마 관리

테이블 정의와 변경 SQL은 `Backend`와 같은 위치에 있는 `../DB/` 폴더에서
관리합니다. 프로젝트 배치는 `PresentAi/Backend`, `PresentAi/Front`,
`PresentAi/DB`입니다. 실행 코드도 이 상대 위치에서 SQL 파일을 찾습니다.

- `../DB/schema.sql`: 현재 7개 테이블 전체 정의. 새 빈 DB에 실행합니다.
- `../DB/migrations/`: 기존 DB에 적용하는 변경 SQL입니다.
- [DB 사용 안내](../DB/README.md): 새 DB 준비, 변경 적용, GitHub 공유 방법입니다.

전체 구조를 다시 내보낼 때는 `Backend` 폴더에서 실행합니다.

```bash
python -m scripts.export_db_schema
```

이 명령은 `.env`의 DB에서 테이블 구조만 읽어 `../DB/schema.sql`에 저장합니다.
현재 `DB` 폴더는 `Backend` Git 저장소 밖에 있으므로, `Backend`만 GitHub에
올리면 DB 파일은 포함되지 않습니다. 공유할 때 `DB` 폴더도 함께 관리해야 합니다.

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
로컬 개발 시 프론트와 백엔드의 호스트 이름을 모두 `localhost`로 통일합니다.
같은 사이트의 HTTPS 환경에 배포할 때는 `AUTH_COOKIE_SECURE=true`로 설정합니다.
로컬 HTTP에서만 `AUTH_COOKIE_SECURE=false`를 사용합니다.
서로 다른 사이트에 배포하는 경우에는 쿠키/CSRF 정책을 추가로 설계해야 합니다.

단일 서버 프로세스에서 IP당 1분에 로그인 10회, 회원가입 5회로 제한합니다.
여러 프로세스나 여러 서버로 운영할 때는 공유 저장소 기반 요청 제한이 필요합니다.
현재 로그인 API까지만 연결했으며, 프론트의 로그인 창과 파일/분석 API의 사용자별
접근 제어는 후속 작업입니다. 이메일 인증과 비밀번호 재설정은 포함하지 않습니다.

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
