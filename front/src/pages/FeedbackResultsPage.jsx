import FeedbackResultTabs from '../features/results/FeedbackResultTabs.jsx'
import RevisedScript from '../features/results/RevisedScript.jsx'
import ImprovementChecklist from '../features/results/ImprovementChecklist.jsx'
import PresentationStrengths from '../features/results/PresentationStrengths.jsx'
import PrioritySlideIssues from '../features/results/PrioritySlideIssues.jsx'
import PresentationScore from '../features/results/PresentationScore.jsx'
import FeedbackSummary from '../features/results/FeedbackSummary.jsx'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import { buildApiReport, downloadTextFile } from '../features/results/feedbackReport.js'
import useToastMessage from '../hooks/useToastMessage.js'
import SlideWorkspace from '../features/slides/SlideWorkspace.jsx'
import useSlideReview from '../features/slides/useSlideReview.js'
import usePdfDocument from '../features/slides/usePdfDocument.js'
import { getPrioritySlideIssues, mergeDocumentSlides } from '../features/slides/slideFeedback.js'
import { StorageNotice } from '../features/results/ModelResponse.jsx'
import OriginalFileDownload from '../features/results/OriginalFileDownload.jsx'
import { exampleSlides } from '../data/exampleSlides.js'

export default function FeedbackResultsPage({ request, onEdit, onNew }) {
  if (request.result.raw_only) return <UnformattedResult request={request} onEdit={onEdit} />
  return <StructuredResults request={request} onEdit={onEdit} onNew={onNew} />
}

// 화면 형식으로 정리하지 못한 응답: 읽을 수 있는 글이면 그대로 보여 주고, JSON 같은 데이터는 노출하지 않는다.
function UnformattedResult({ request, onEdit }) {
  const raw = request.result.raw_response
  const text = typeof raw === 'string' && !/^\s*(```|[{[])/.test(raw) ? raw.trim() : ''
  return (
    <div className="results-page section-wrap">
      <div className="page-heading">
        <div>
          <h1>{text ? '모델이 정리한 피드백' : '피드백을 화면에 보여 드리지 못했어요'}</h1>
          <p>
            {text
              ? '결과 화면 형식으로 정리하지 못해 받은 내용을 그대로 보여 드려요.'
              : '분석은 끝났지만 응답 형식이 달라 결과를 정리하지 못했어요. 잠시 후 다시 시도해 주세요.'}
          </p>
        </div>
      </div>
      {!request.mock && <StorageNotice result={request.result} />}
      {text && (
        <section className="summary-card">
          <p className="api-feedback-text">{text}</p>
        </section>
      )}
      <Button onClick={onEdit}>입력 수정하기</Button>
    </div>
  )
}

function StructuredResults({ request, onEdit, onNew }) {
  const { result, submission, mock } = request
  const [resolved, setResolved] = useState([])
  const [tab, setTab] = useState('overview')
  const preview = usePdfDocument(submission.file)
  const pageCount = preview.document?.numPages
  // 슬라이드가 빠진 예시 결과에도 원본 예시 자료와 슬라이드별 피드백을 보여 줍니다.
  const resultSlides = useMemo(
    () => (result.slides?.length ? result.slides : mock ? exampleSlides : []),
    [result.slides, mock],
  )
  const slides = useMemo(
    () => mergeDocumentSlides(resultSlides, pageCount),
    [resultSlides, pageCount],
  )
  const {
    navigation: slideNavigation,
    feedback: slideFeedback,
    progress: slideProgress,
    showSlide,
  } = useSlideReview(slides)
  const slidePriorities = useMemo(() => getPrioritySlideIssues(resultSlides), [resultSlides])
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
  const hasSlides = !!submission.file || !!resultSlides.length
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
        <button className="back-link" onClick={onEdit}>
          <Icon name="back" size={16} />
          입력 수정하기
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
          <span className="tag tag-yellow">예시 결과</span>
          <p>
            아래 내용은 <b>‘{submission.title}’</b> 예시 자료의 피드백입니다. 입력한 내용의 실제
            분석 결과가 아닙니다.
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
      <div className="result-bottom-cta">
        <div>
          <span>한 번의 점검, 더 나은 한 번의 발표.</span>
          <h3>다음 자료도 함께 다듬어 볼까요?</h3>
        </div>
        <Button variant="yellow" onClick={onNew}>
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
