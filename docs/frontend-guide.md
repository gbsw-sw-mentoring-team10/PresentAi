# 프런트엔드 코드 읽는 법

이 프로젝트는 발표자료 입력 → 분석 → 피드백 확인 순서로 동작합니다. 파일을 찾을 때는 먼저 화면을 고른 뒤, 그 화면이 사용하는 기능 폴더를 따라가세요.

## 먼저 읽을 파일

1. `src/main.jsx`: React를 실행하는 시작점.
2. `src/App.jsx`: 공통 헤더·푸터, 화면 이동, 입력값과 분석 요청 상태.
3. `src/pages/FeedbackPage.jsx`: 발표 정보·자료·대본·음성 입력 화면의 조립 순서.
4. `src/features/feedback/useFeedbackForm.js`: 입력 검증, TXT 읽기, 예시 채우기.
5. `src/pages/FeedbackResultsPage.jsx`: 실제 서버 결과를 요약과 슬라이드 화면에 연결.
6. `src/features/slides/useSlideReview.js`: 두 결과 페이지의 선택·필터·확인 규칙.
7. `src/features/slides/SlideWorkspace.jsx`: 공통 슬라이드 상태와 각 패널의 연결.

## 폴더 기준

```text
src/
├── App.jsx
├── main.jsx
├── pages/                 # 주소별 화면 구성
├── components/
│   ├── layout/            # 헤더, 푸터, 오류 경계, 모바일 메뉴
│   └── ui/                # 버튼, 아이콘, 로고, 모달
├── features/
│   ├── home/              # 홈의 각 소개 섹션
│   ├── feedback/          # 발표 입력, 파일 검증, 분석 API 요청
│   ├── analysis/          # 분석 진행, 오류, 재시도
│   ├── results/           # 점수, 장점, 수정 제안, 보고서
│   ├── slides/            # 슬라이드 탐색, 원본 표시, 개별 피드백
│   └── auth/              # 로그인·회원가입 미리보기
├── hooks/                 # 화면 이동과 일시적인 알림
├── data/                  # 화면 체험용 발표·슬라이드 데이터
└── styles/                # 기존 CSS와 반응형 규칙
```

`pages`는 어떤 컴포넌트를 보여 줄지 결정합니다. `features`의 컴포넌트는 각 화면의 실제 내용을 그립니다. 버튼처럼 여러 기능에서 사용하는 작은 요소만 `components/ui`에 둡니다. 컴포넌트 파일명과 함수명은 같습니다.

## 화면별 파일

| 파일                            | 담당하는 일                                         |
| ------------------------------- | --------------------------------------------------- |
| `pages/HomePage.jsx`            | 홈 섹션을 화면 순서대로 배치                        |
| `pages/FeedbackPage.jsx`        | 자료·음성 모드에 맞게 입력 폼 배치                  |
| `pages/AnalysisPage.jsx`        | 자료 없음·진행·실패·완료 상태 선택                  |
| `pages/FeedbackResultsPage.jsx` | 실제 서버 응답, 수정사항 체크, 보고서 다운로드 연결 |
| `pages/ExampleResultsPage.jsx`  | 예시 자료·음성 결과, 예시 슬라이드와 체크 상태 연결 |

## 홈: `features/home`

| 컴포넌트                   | 담당하는 일                  |
| -------------------------- | ---------------------------- |
| `HeroSection`              | 첫 소개 문구와 시작 버튼     |
| `FeedbackShowcase`         | 홈에 보이는 발표 피드백 예시 |
| `SupportedFormats`         | 업로드 지원 형식 안내        |
| `FeatureSection`           | 자료·음성 피드백 기능 소개   |
| `HowItWorks`               | 서비스 이용 순서             |
| `FrequentlyAskedQuestions` | 자주 묻는 질문               |
| `GetStartedSection`        | 홈 마지막 시작 안내          |

## 입력·요청: `features/feedback`

| 파일                     | 담당하는 일                              |
| ------------------------ | ---------------------------------------- |
| `PresentationFields.jsx` | 목적·제목·추가 설명 입력                 |
| `MaterialUpload.jsx`     | 발표자료 업로드와 전송 안내              |
| `ScriptInput.jsx`        | 직접 입력·TXT 업로드 전환                |
| `AudioUpload.jsx`        | 음성 선택, 미리듣기, 재생 URL 정리       |
| `FileUpload.jsx`         | 파일 선택·드래그, 크기·확장자 검사, 삭제 |
| `FeedbackFormGuide.jsx`  | 입력 도움말과 예시 채우기 버튼           |
| `SubmissionNotice.jsx`   | 실제 요청·서버 샘플·음성 미리보기 안내   |
| `FeedbackSteps.jsx`      | 입력 → 분석 → 결과 단계 표시             |
| `useFeedbackForm.js`     | 입력 검증, TXT 읽기, 예시 채우기         |
| `useFeedbackRequest.js`  | 요청 상태를 React 화면과 연결            |
| `feedbackRequest.js`     | 중복 요청 방지, 취소, 타임아웃, 재시도   |
| `feedbackApi.js`         | 서버 요청 전송, 응답 정리, 오류 메시지   |
| `uploadRules.js`         | 지원 확장자와 파일·대본 크기 제한        |

대본 입력 방식과 오류 상태는 `useFeedbackForm`이 함께 관리합니다. 직접 입력으로 전환하면 TXT 오류 대신 현재 대본을 다시 검증하고 진행 중인 파일 읽기를 무효화합니다. `scriptReadVersion`은 이전 읽기 결과가 최신 입력을 덮어쓰지 못하게 하는 번호입니다. `ScriptInput`은 전달받은 모드와 오류를 표시하며, 직접 입력에서도 오류를 숨기지 않습니다. 제출 시에도 현재 모드와 대본을 기준으로 검증합니다.

## 분석: `features/analysis`

| 파일                       | 담당하는 일                                      |
| -------------------------- | ------------------------------------------------ |
| `AnalysisProgressCard.jsx` | 분석 파일명, 진행 표시, 단계별 상태              |
| `MissingMaterials.jsx`     | 분석할 입력이 없을 때 안내                       |
| `AnalysisError.jsx`        | 오류 내용, 재시도·뒤로가기 버튼                  |
| `useAnalysisProgress.js`   | 서버 대기 시간, 음성 미리보기 단계와 타이머 정리 |

## 결과: `features/results`

| 컴포넌트·파일           | 담당하는 일                                |
| ----------------------- | ------------------------------------------ |
| `FeedbackSummary`       | 서버의 전체 피드백                         |
| `PresentationScore`     | 100점 기준 발표 점수                       |
| `PresentationStrengths` | 발표의 장점 목록                           |
| `ImprovementChecklist`  | 감점·수정 제안과 확인 체크                 |
| `PrioritySlideIssues`   | 먼저 확인할 슬라이드 문제와 상세 이동      |
| `RevisedScript`         | 서버가 제공한 수정 대본                    |
| `FeedbackResultTabs`    | 실제 결과의 요약·슬라이드 탭과 키보드 이동 |
| `ExampleResultTabs`     | 예시 결과의 네 가지 탭과 키보드 이동       |
| `ExampleOverview`       | 예시 결과의 전체 요약과 우선 수정사항      |
| `StoryFlowPanel`        | 예시 발표의 논리 흐름                      |
| `FactCheckPanel`        | 예시 발표의 정보·출처 확인                 |
| `SpeechComparison`      | 대본·발화 비교와 음성 개선 제안 미리보기   |
| `feedbackReport.js`     | 실제·예시 결과 TXT 보고서 생성과 다운로드  |

실제 서버 결과와 예시 결과는 데이터의 성격이 달라 별도 페이지로 둡니다. 슬라이드 확인 체크는 각 페이지에서 호출한 `useSlideReview`에 둬서 요약과 상세 화면이 같은 상태를 보여 줍니다. 일반 개선사항과 정보 확인 체크는 별도 상태로 관리합니다.

## 슬라이드: `features/slides`

| 컴포넌트·파일         | 담당하는 일                                      |
| --------------------- | ------------------------------------------------ |
| `SlideWorkspace`      | 선택·필터·확인 상태를 각 패널에 연결             |
| `SlideReviewProgress` | 전체 피드백 중 확인한 개수                       |
| `SlideSidebar`        | 썸네일 목록, 필터, 키보드 탐색, 선택 항목 스크롤 |
| `SlideViewer`         | 선택한 슬라이드, 문제 위치, 핵심 요약            |
| `SlideNavigation`     | 이전·다음 이동; 데스크톱과 모바일에서 사용       |
| `SlideFeedbackPanel`  | 해당 장의 문제 목록·장점·평가 없음 안내          |
| `SlideIssueCard`      | 한 문제의 이유·수정 제안·문장 비교·복사·확인     |
| `SlidePreviewDialog`  | 원본 확대창과 확대·축소 상태                     |
| `SlidePreview`        | 예시·PDF·이미지 중 표시할 원본 선택              |
| `PdfPageCanvas`       | PDF 한 페이지 렌더링과 렌더 작업 정리            |
| `SlideImage`          | 서버 원본 이미지와 로딩 실패 안내                |
| `ExampleSlide`        | 예시 결과용 슬라이드 그림                        |
| `SampleSlideArtwork`  | 홈·요약용 작은 예시 슬라이드 그림                |
| `useSlideReview.js`   | 선택·필터·이전/다음·문제 열기·확인 상태 관리     |
| `usePdfDocument.js`   | PDF 문서 로딩과 Worker 정리                      |
| `slideFeedback.js`    | 페이지별 응답 정리, 필터, 상태, PDF 페이지 대응  |

스크롤 DOM ref는 그 DOM을 가진 패널에 둡니다. 확대 비율은 확대창에, 음성 재생 URL은 음성 컴포넌트에 둡니다. 여러 패널이 함께 쓰는 선택·확인 상태는 `useSlideReview`가 관리합니다.

`useSlideReview`는 다음 세 역할과 페이지 진입 함수 `showSlide`를 반환합니다. 페이지에서 각 역할을 이름으로 꺼내 `SlideWorkspace`에 따로 전달합니다.

| 입력             | 포함하는 값과 동작                                                     | 사용하는 곳                            |
| ---------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| `navigation`     | 전체 장수, 필터된 목록, 선택한 장·순서, 필터, 선택·필터 변경·이전/다음 | 목록, 원본 표시, 탐색 버튼             |
| `feedback`       | 열린 문제 ID, 확인한 문제 ID 목록, 문제 선택·확인 토글                 | 문제 표시, 확인 체크, 목록의 확인 배지 |
| `progress`       | 확인한 개수와 전체 문제 개수                                           | 진행률 표시                            |
| `preview`        | PDF 문서·로딩 상태·오류                                                | 원본 표시와 로딩 안내                  |
| `onShowOverview` | 전체 요약으로 돌아가기                                                 | 빈 상태와 피드백 안내                  |
| `onNotify`       | 복사 결과 알림                                                         | 추천 문장 복사                         |

`showSlide`는 요약에서 상세로 진입하는 페이지에서만 사용하고 `SlideWorkspace`에는 전달하지 않습니다. 원본 표시 패널은 탐색 상태를 받지 않습니다. `SlideWorkspace`가 만든 이전·다음 버튼을 `children`으로 배치하며, 같은 버튼 구성을 모바일 하단에도 사용합니다.

하위 컴포넌트에는 필요한 값만 명시합니다.

- `SlideReviewProgress`: 확인 개수·전체 개수. 문제 배열을 받지 않습니다.
- `SlideNavigation`: 현재 순서·장수·필터·이동 함수. 슬라이드 배열을 받지 않습니다.
- `SlideSidebar`: 전체 장수·필터된 목록·선택 ID·확인 ID와 탐색 동작. 전체 목록과 선택한 장 전체 객체를 중복 전달하지 않습니다.
- `SlideViewer`, `SlideFeedbackPanel`: 선택한 장과 열린 문제 ID. 열린 문제 전체 객체를 전달하지 않습니다.

실제 결과 페이지는 PDF 페이지 수와 서버 분석을 `mergeDocumentSlides`로 합친 뒤 공통 훅에 전달합니다. 선택·필터·확인 상태의 원본은 계속 `useSlideReview` 한곳에 있습니다. `review` 전체 전달, `...selection`, 단순 전달용 `UploadedSlides`는 사용하지 않습니다. 새 Context나 상태 관리 라이브러리를 추가하지 않았습니다.

## 공통 코드와 스타일

- `components/layout/AppHeader.jsx`, `AppFooter.jsx`: 공통 상·하단.
- `components/layout/PageErrorBoundary.jsx`: 화면을 읽거나 그리지 못했을 때 복구 안내.
- `components/layout/useMobileMenu.js`: 모바일 메뉴의 닫기·포커스·외부 클릭 처리.
- `components/ui/Button.jsx`, `Icon.jsx`, `Logo.jsx`, `Modal.jsx`: 공통 UI.
- `features/auth/AuthModal.jsx`: 로그인·회원가입 입력 미리보기.
- `hooks/useHashRoute.js`: URL 해시와 화면 제목·스크롤.
- `hooks/useToastMessage.js`: 잠시 표시했다 사라지는 알림.
- `data/examplePresentation.js`, `exampleSlides.js`: 체험용 데이터.
- `styles/app.css`: 화면별 스타일을 기존 우선순위대로 불러오는 진입점.
- `styles/global.css`, `responsive.css`, `brand.css`: 기본·반응형·브랜드 스타일.

CSS 규칙과 불러오는 순서는 기존 화면을 유지하도록 보존했습니다. 개별 컴포넌트마다 임의로 CSS를 다시 import하지 마세요.

## 코드를 추가할 때

- 새 화면은 `pages`, 화면 안의 독립된 역할은 해당 `features` 폴더에 추가합니다.
- 이름은 화면에서 하는 일로 짓습니다. 예: `ScriptInput`, `PresentationScore`, `SlideIssueCard`.
- 클릭 처리가 길어지면 같은 파일의 `handle...` 함수로 옮깁니다.
- 한 화면에서만 필요한 상태는 그 화면이나 컴포넌트에 둡니다.
- 성능 문제가 확인되기 전에는 단순한 계산에 `useMemo`·`memo`를 추가하지 않습니다.
- 추상적인 공통 폼·카드 생성기 대신 필요한 JSX와 props를 직접 작성합니다.
- import는 실제 구현 파일을 가리킵니다. 모든 컴포넌트를 모으는 재수출 파일은 두지 않습니다.

## GitHub 벤치마킹

2026-11-08에 아래 공개 저장소의 코드 구조를 확인했습니다. 이 프로젝트의 기존 React 코드를 재구성하는 데 설계 방식만 참고했습니다.

| 저장소와 확인한 코드                                                                                                                                            | 참고한 부분                                       | 이번 프로젝트에 적용                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| [Coherence: UploadPage](https://github.com/ramizik/coherence/blob/72aae52057ffa985fb069fb16a08d902b5116a62/frontend/components/upload/UploadPage.tsx)           | 업로드 페이지를 소개·업로드·진행 컴포넌트로 조립  | `FeedbackPage`와 입력별 컴포넌트 분리                                |
| [Coherence: ResultsPage](https://github.com/ramizik/coherence/blob/72aae52057ffa985fb069fb16a08d902b5116a62/frontend/components/results/ResultsPage.tsx)        | 요약·코칭·전사문·미디어 표시를 역할별 파일로 구분 | 점수·장점·수정 제안·슬라이드 패널 분리                               |
| [Echo: MetricCard](https://github.com/poolanithinreddy/echo-ai-speaking-coach/blob/004cd4d1a9fa05b3beedccc107bff14f13d5df35/apps/web/components/MetricCard.tsx) | 지표 카드가 필요한 값과 표시만 담당               | `PresentationScore`, `SlideReviewProgress`처럼 표시 역할을 분명히 함 |

외부 프로젝트의 라이브러리나 UI 테마를 새로 도입하지 않았습니다. 서버 오류를 예시 결과로 대체하지 않는 기존 동작도 유지합니다.

## 검증 명령

```sh
npm run lint
npm run check
```

`npm run check`는 포맷 확인 → 배포 빌드 → 함수/API 테스트 23개 → UI 테스트 11개를 실행합니다. `npm run test:unit`과 `npm run test:ui`로 각각 실행할 수도 있습니다. 생성되는 `public/pdfjs`는 외부 라이브러리 파일이므로 앱 소스 린트에서 제외합니다. PDF 훅의 로딩 상태 초기화에는 해당 줄에만 사유를 적어 성능 권고 규칙을 예외 처리했습니다. 파일 변경 시 이전 문서를 지우는 기존 동작을 유지하기 위한 것입니다.

## 최초 파일 분리 때의 확인 결과

- 린트, 포맷 확인, 배포 빌드, 기존 자동 테스트 23개 통과.
- 홈·입력·분석 상태·실제/예시 결과·로그인·슬라이드 필터 등 16가지 렌더 결과를 변경 전과 대조해 HTML이 동일함을 확인.
- CSS 15개는 경로 변경을 제외한 규칙·값·순서가 동일함을 확인.
- 브라우저에서 요약 확인 체크와 상세 화면 연결, 수정 필요 필터, 이전/다음 이동, 문장 복사, 확대·Escape 닫기를 확인.
- 필수 목적 검증, 예시 채우기, TXT 파일 내용 반영, 합성 WAV 파일의 미리듣기 로딩 확인. 브라우저 오류 로그 없음.
- 실제 분석 서버를 다시 호출하거나 PDF 원본 렌더링을 새로 수행한 검증은 포함하지 않음.

주요 파일 길이는 홈 343 → 19줄, 입력 화면 359 → 97줄, 슬라이드 화면 501 → 155줄로 줄었습니다. 화면 내용은 각각 이름이 있는 기능 컴포넌트로 옮겼습니다.

## 2026-11-09 상태 처리와 UI 테스트 보강

- 재현 순서: 예시 채우기 → 빈 TXT 선택 → 직접 입력 → 분석 시작. 이전에는 숨은 오류 때문에 제출이 막혔고, 이제 기존 대본을 유지한 채 제출할 수 있습니다.
- 수정 전에 추가한 UI 테스트에서 숨은 오류와 진행 중인 TXT 읽기 취소 시나리오가 실패하는 것을 확인했습니다.
- `tests/ui/feedback-form.test.jsx`: 모드 전환, 빈 파일 후 정상 TXT 재선택, 파일 읽기 실패 복구, 늦게 도착한 읽기 결과 무시, 필수 입력 후 재시도.
- `tests/ui/slide-review.test.jsx`: 두 결과 페이지의 요약·상세 체크 공유, 비연속 페이지의 필터·이전/다음·키보드 이동, 미확인 목록의 빈 상태 복구, 정보 확인과 슬라이드 체크 분리, 탭 클릭과 키보드의 동일한 처리.
- `tests/ui/analysis-retry.test.jsx`: 실제 App에서 서버 오류 → 다시 시도 → 결과 보기까지 조작하고 입력이 유지되는지 확인. 네트워크만 합성 응답으로 대체합니다.
- UI 테스트는 Vitest, React Testing Library, user-event, jsdom으로 실제 페이지를 렌더링합니다. CSS 배치나 PDF 캔버스 렌더링, 실서비스 서버의 가용성을 검증하는 테스트는 아닙니다.
