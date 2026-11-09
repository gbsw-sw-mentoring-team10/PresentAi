# PresentAi

발표자료와 대본을 분석해 발표 준비를 돕는 서비스입니다.
백엔드, 프런트엔드, DB 스키마를 이 저장소에서 함께 관리합니다.

- [backend/](backend/README.md): FastAPI API 서버, 인증, 발표 피드백
- [front/](front/README.md): React + Vite 웹 화면과 API 프록시
- [db/](db/README.md): MySQL 스키마와 변경 SQL

## 백엔드 실행

`backend` 폴더에서 가상환경을 만들고 `requirements.txt`를 설치합니다.
API 키와 DB 연결 정보는 `backend/.env`에 설정한 뒤
`uvicorn main:app --reload`로 실행합니다.
자세한 설정은 [백엔드 안내](backend/README.md)를 참고하세요.

## 프런트엔드 실행

Node.js 22.13 이상에서 `front` 폴더로 이동해 `npm ci`,
`npm run dev`를 실행합니다. 기본 API 연결 주소는
`http://127.0.0.1:8000`입니다.
`npm run build`로 빌드하고 `npm test`로 테스트합니다.

## DB와 Git 관리

DB 스키마와 변경 SQL은 `db/`에 있으며 `backend/` 옆에 유지합니다.
실제 DB 데이터, `.env`, 관리자 초기 비밀번호 파일, 설치된 패키지,
가상환경과 캐시는 커밋하지 않습니다.
프로젝트 루트인 `PresentAi` 폴더에서 Git을 사용합니다.
