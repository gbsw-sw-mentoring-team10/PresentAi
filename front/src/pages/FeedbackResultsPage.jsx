import FeedbackResultTabs from '../features/results/FeedbackResultTabs.jsx'
import RevisedScript from '../features/results/RevisedScript.jsx'
import ImprovementChecklist from '../features/results/ImprovementChecklist.jsx'
import PresentationStrengths from '../features/results/PresentationStrengths.jsx'
import PrioritySlideIssues from '../features/results/PrioritySlideIssues.jsx'
import PresentationScore from '../features/results/PresentationScore.jsx'
import FeedbackSummary from '../features/results/FeedbackSummary.jsx'
import { useLayoutEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import { buildApiReport, downloadTextFile } from '../features/results/feedbackReport.js'
import useToastMessage from '../hooks/useToastMessage.js'
import SlideWorkspace from '../features/slides/SlideWorkspace.jsx'
import useSlideReview from '../features/slides/useSlideReview.js'
import usePdfDocument from '../features/slides/usePdfDocument.js'
import { mergeDocumentSlides } from '../features/slides/slideFeedback.js'
import { ModelResponse, StorageNotice } from '../features/results/ModelResponse.jsx'
import OriginalFileDownload from '../features/results/OriginalFileDownload.jsx'

export default function FeedbackResultsPage({ request, navigate }) {
  if (request.result.raw_only)
    return (
      <div className="results-page section-wrap">
        <h1>모델이 반환한 피드백</h1>
        <p>화면 형식과 다른 응답이어서 원문을 그대로 표시합니다.</p>
        {!request.mock && <StorageNotice result={request.result} />}
        <ModelResponse value={request.result.raw_response} expanded />
        <Button onClick={() => navigate('/materials')}>입력 화면으로 돌아가기</Button>
      </div>
    )
  return <StructuredResults request={request} navigate={navigate} />
}

function StructuredResults({ request, navigate }) {
  const { result, submission, mock } = request
  const [resolved, setResolved] = useState([])
  const [tab, setTab] = useState('overview')
  const preview = usePdfDocument(submission.file)
  const slides = mergeDocumentSlides(result.slides || [], preview.document?.numPages)
  const {
    navigation: slideNavigation,
    feedback: slideFeedback,
    progress: slideProgress,
    showSlide,
  } = useSlideReview(slides)
  const slidePriorities = (result.slides || [])
    .flatMap((slide) => slide.issues.map((issue) => ({ ...issue, page: slide.id })))
    .sort(
      (a, b) =>
        ['high', 'medium', 'low'].indexOf(a.priority) -
        ['high', 'medium', 'low'].indexOf(b.priority),
    )
    .slice(0, 3)
  function openSlide(id, issueId) {
    showSlide(id, issueId)
    setTab('slides')
  }
  const tabsRef = useRef(null)
  useLayoutEffect(() => {
    if (tab === 'slides' && tabsRef.current) {
      window.scrollTo({
        top: window.scrollY + tabsRef.current.getBoundingClientRect().top - 90,
        behavior: 'instant',
      })
    }
  }, [tab])
  const hasSlides = !!submission.file || !!result.slides?.length
  const { message: toast, show: showToast } = useToastMessage()
  function toggle(index) {
    setResolved((items) =>
      items.includes(index) ? items.filter((item) => item !== index) : [...items, index],
    )
  }
  function exportReport() {
    downloadTextFile(buildApiReport(request), 'presentai-feedback.txt')
    showToast('피드백 보고서를 내려받았어요.')
  }
  return (
    <div className={`results-page section-wrap ${tab === 'slides' ? 'deck-results-page' : ''}`}>
      <div className="result-topline">
        <button className="back-link" onClick={() => navigate('/materials')}>
          <Icon name="back" size={16} />
          입력 화면으로
        </button>
        <FeedbackSteps current={3} />
      </div>
      <div className="page-heading">
        <div>
          <span className="section-kicker">A CLEARER STORY. A STRONGER YOU.</span>
          <h1>좋은 발표에 한 걸음 더 가까이.</h1>
          <p>지금 잘하고 있는 것부터, 더 다듬으면 좋을 부분까지.</p>
        </div>
        <div className="result-download-actions">
          {!mock && (
            <OriginalFileDownload key={result.saved_file_id} fileId={result.saved_file_id} />
          )}
          <Button variant="outline" icon="download" onClick={exportReport}>
            보고서 받기
          </Button>
        </div>
      </div>
      {mock && (
        <div className="example-banner">
          <span className="tag tag-yellow">서버 샘플 결과</span>
          <p>
            예시 자료 체험용으로 서버가 반환한 샘플입니다. 입력한 내용의 실제 분석 결과가 아닙니다.
          </p>
        </div>
      )}
      {!mock && <StorageNotice result={result} />}
      <div className="result-meta">
        <div>
          <small>발표 제목</small>
          <strong>{submission.title}</strong>
        </div>
        <div>
          <small>발표 목적</small>
          <span>{submission.purpose}</span>
        </div>
        <div>
          <small>분석 자료</small>
          <span>
            <Icon name="file" size={16} />
            {submission.file?.name || '직접 입력한 대본'}
          </span>
        </div>
      </div>
      {hasSlides && <FeedbackResultTabs tab={tab} setTab={setTab} tabsRef={tabsRef} />}
      <div
        id="api-panel-overview"
        role={hasSlides ? 'tabpanel' : undefined}
        aria-labelledby={hasSlides ? 'api-tab-overview' : undefined}
        hidden={tab !== 'overview'}
        className={hasSlides ? 'result-panel' : ''}
      >
        <div className="overview-grid">
          <FeedbackSummary feedback={result.feedback} />
          <PresentationScore score={result.score} />
        </div>
        {!!slidePriorities.length && (
          <PrioritySlideIssues
            slidePriorities={slidePriorities}
            reviewed={slideFeedback.reviewedIssueIds}
            toggleSlideIssue={slideFeedback.toggleIssue}
            openSlide={openSlide}
            setTab={setTab}
          />
        )}
        <PresentationStrengths strengths={result.strengths} />
        <ImprovementChecklist
          improvements={result.improvements}
          resolved={resolved}
          toggle={toggle}
        />
        {result.revised_script && <RevisedScript script={result.revised_script} />}
      </div>
      {hasSlides && (
        <div
          id="api-panel-slides"
          role="tabpanel"
          aria-labelledby="api-tab-slides"
          hidden={tab !== 'slides'}
          className="result-panel"
        >
          <SlideWorkspace
            navigation={slideNavigation}
            feedback={slideFeedback}
            progress={slideProgress}
            preview={preview}
            onShowOverview={() => setTab('overview')}
            onNotify={showToast}
          />
        </div>
      )}
      {result.raw_response !== undefined && <ModelResponse value={result.raw_response} />}
      <div className="result-bottom-cta">
        <div>
          <span>한 번의 점검, 더 나은 한 번의 발표.</span>
          <h3>다음 자료도 함께 다듬어 볼까요?</h3>
        </div>
        <Button variant="yellow" onClick={() => navigate('/materials')}>
          다른 자료 점검하기
        </Button>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}
