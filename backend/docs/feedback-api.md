# 저장한 피드백 조회 API

`POST /upload/`로 저장한 결과를 로그인한 사용자별로 조회합니다.
`slides_feedback_result.feedback_result`의 JSON 본문을 사용하며 S3 인증 없이 조회할 수 있습니다.
분석 전·실패한 요청의 JSON은 SQL NULL이며 완료 시 본문 전체를 한 번에 저장합니다.
화면은 목록을 조회한 뒤, 선택한 항목의 `saved_result_id`로 상세 내용을 요청하면 됩니다.

로그인한 사용자의 새 분석은 `POST /upload/`에서
`{"result_id": 42, "status": "pending"}`을 먼저 반환하고 백그라운드에서 처리합니다.
이 ID로 상세 API를 반복 조회하면 `pending` → `processing` → `completed` 또는
`failed` 상태를 확인할 수 있습니다. 프런트의 `createFeedback`은 이 조회를 자동으로
진행하며 분석이 완료된 피드백을 기존 결과 화면에 전달합니다.

분석 중 상세 응답은 `{"saved_result_id": 42, "status": "pending"}` 또는
`{"saved_result_id": 42, "status": "processing"}`입니다. 실패하면 `status`가
`failed`이고 사용자용 `error_message`를 반환합니다.

| 용도 | 백엔드 | 프런트엔드의 같은 출처 프록시 |
| --- | --- | --- |
| 내 피드백 목록 | `GET /feedback?page=1&page_size=20` | `GET /api/presentation/feedback?page=1&page_size=20` |
| 피드백 상세 | `GET /feedback/{saved_result_id}` | `GET /api/presentation/feedback/{saved_result_id}` |

두 요청 모두 `/auth/login`에서 발급한 `presentai_session` 쿠키를 사용합니다.
사용자 ID를 쿼리로 전달하지 않습니다. 서버가 로그인 세션에서 사용자를 확인하며,
관리자를 포함해 자신의 결과만 조회할 수 있습니다. 응답은 `Cache-Control: no-store`입니다.

## 목록

- `page`: 1부터 시작하며 기본값은 1입니다.
- `page_size`: 1~100이며 기본값은 20입니다.
- 생성 시각이 최신인 순서이며, 생성 시각이 같으면 결과 ID가 큰 순서입니다.
- `total`은 로그인한 사용자의 전체 결과 수입니다.
- 분석이 완료되어 전체 피드백이 저장된 결과만 목록에 포함합니다.
- 저장한 결과가 없거나 페이지 범위를 넘으면 `items`는 빈 배열입니다.
- 날짜는 UTC 시간대가 포함된 ISO 8601 형식입니다.
- `/feedback/` 경로도 리디렉션 없이 사용할 수 있습니다.

```json
{
  "items": [
    {
      "saved_result_id": 42,
      "title": "프로젝트 발표",
      "score": 85,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

## 상세

분석이 완료된 `GET /feedback/{saved_result_id}`는 모델이 처음 반환한 피드백처럼
내용을 최상위 JSON 필드로 반환합니다. 별도의 `result` 객체로 감싸지 않습니다.
main의 응답 형식에 따라 결과 ID, 제목, 생성일, 완료 상태를 함께 포함합니다.

- `feedback`: 종합 평가
- `strengths`: 장점 문자열 배열
- `improvements`: `issue`, `deduction`, `solution`이 있는 개선 항목 배열
- `revised_script`: 수정 대본. 자료만 분석했다면 빈 문자열입니다.
- `slides`: `slide_number`, `summary`, `good_points`, `issues`, `script_connection`이 있는 배열

```json
{
  "score": 85,
  "feedback": "핵심 메시지가 명확하지만 근거를 보완하면 더 좋습니다.",
  "strengths": ["명확한 주제"],
  "improvements": [
    {"issue": "근거 부족", "deduction": 15, "solution": "출처 추가"}
  ],
  "revised_script": "피드백을 반영한 수정 대본",
  "slides": [
    {
      "slide_number": 1,
      "summary": "발표 주제 소개",
      "good_points": ["좋은 제목"],
      "issues": [{"problem": "작은 글씨", "solution": "글자 크기 확대"}],
      "script_connection": "도입 대본과 연결됨"
    }
  ],
  "saved_result_id": 42,
  "title": "프로젝트 발표",
  "created_at": "2026-01-01T00:00:00",
  "status": "completed"
}
```

대본만 분석해 슬라이드가 없으면 `slides`는 빈 배열이며, 수정 대본이나
슬라이드의 대본 연관성이 없는 경우 해당 필드는 빈 문자열입니다.
`slides[].issues`는 `problem`, `solution`이 있는 객체 배열입니다.
`saved_result_id`, `title`, `created_at`, `status`는 main의 상세 응답 형식과 같습니다.

파일을 업로드한 새 기록에는 원본 저장 정보도 최상위 필드로 포함합니다.
피드백 JSON 본문에는 파일 정보를 끼워 넣지 않습니다.

- `file_storage_status`: `pending`, `saved`, `failed`. 분석 상태와 별도로 관리합니다.
- `saved_file_id`, `file_name`, `file_size`, `file_content_type`: 저장된 원본 정보.
- `file_storage_message`: 원본 저장 실패 시 사용자 안내. 분석 결과는 계속 조회할 수 있습니다.

과거 기록과 대본만 입력한 기록에는 위 정보가 없습니다. 파일 정보는 분석 중 응답에도
포함될 수 있으며, 완료 응답을 기준으로 원본 저장 성공·실패를 화면에 표시합니다.

`GET /files/{saved_file_id}/download`를 같은 세션 쿠키로 호출하면 아래처럼 5분간
유효한 주소를 받습니다. 같은 출처 프록시는 `/api/presentation/files/{id}/download`입니다.
주소를 보관하지 않고 다운로드 버튼을 누를 때마다 새로 요청합니다.

```json
{
  "file_id": 37,
  "file_name": "발표자료.pdf",
  "download_url": "https://...임시 서명 주소...",
  "expires_in": 300
}
```

본인 소유 파일만 요청할 수 있고 다른 계정·없는 파일은 404, 로그인 만료는 401,
S3 인증·설정 오류는 503으로 반환합니다. URL 응답도 `Cache-Control: no-store`입니다.

## 화면에서 호출하기

```js
const response = await fetch('/api/presentation/feedback?page=1&page_size=20', {
  credentials: 'include',
})
if (!response.ok) throw new Error(`피드백 목록 조회 실패: ${response.status}`)
const { items, total } = await response.json()

// 사용자가 목록에서 선택한 항목의 ID를 사용합니다.
async function loadFeedback(savedResultId) {
  const response = await fetch(`/api/presentation/feedback/${savedResultId}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`피드백 상세 조회 실패: ${response.status}`)
  return response.json()
}
```

실패 응답은 기존 API와 같이 `{ "detail": ... }` 형식입니다.

| 상태 | 의미 |
| --- | --- |
| `401` | 로그인하지 않았거나 세션이 만료·삭제됨 |
| `404` | 상세 결과가 없거나 다른 사용자의 결과임 |
| `422` | 페이지 값이 범위를 벗어났거나 결과 ID가 양의 정수가 아님 |
| `503` | DB에 연결할 수 없거나 조회 중 DB 오류 발생 |

로컬 서버의 `/docs`에서 요청과 응답 스키마를 확인할 수 있습니다.
