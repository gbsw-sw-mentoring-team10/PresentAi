import { useLayoutEffect, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'
import FeedbackResultTabs from '../results/FeedbackResultTabs.jsx'
import FeedbackSummary from '../results/FeedbackSummary.jsx'
import ImprovementChecklist from '../results/ImprovementChecklist.jsx'
import PresentationScore from '../results/PresentationScore.jsx'
import PresentationStrengths from '../results/PresentationStrengths.jsx'
import PrioritySlideIssues from '../results/PrioritySlideIssues.jsx'
import RevisedScript from '../results/RevisedScript.jsx'
import SlideWorkspace from '../slides/SlideWorkspace.jsx'
import useSlideReview from '../slides/useSlideReview.js'
import { mergeDocumentSlides } from '../slides/slideFeedback.js'
import useSavedOriginal from './useSavedOriginal.js'

const PRIORITY_ORDER = ['high', 'medium', 'low']

// 실제 결과 화면과 같은 구성 요소로 저장된 피드백을 보여 줍니다.
export default function HistoryMaterialDetail({ result, tab, setTab, onNotify }) {
  const [resolved, setResolved] = useState([])
  // 슬라이드 탭을 열면 저장된 PDF 원본을 불러와, 받은 직후 화면처럼 슬라이드를 함께 보여 줍니다.
  const preview = useSavedOriginal({
    fileId: result.saved_file_id,
    fileName: result.file_name,
    contentType: result.file_content_type,
    enabled: tab === 'slides',
  })
  const slides = mergeDocumentSlides(result.slides || [], preview.document?.numPages)
  const {
    navigation: slideNavigation,
    feedback: slideFeedback,
    progress: slideProgress,
    showSlide,
  } = useSlideReview(slides)
  const slidePriorities = slides
    .flatMap((slide) => slide.issues.map((issue) => ({ ...issue, page: slide.id })))
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
    .slice(0, 3)
  const hasSlides = !!result.slides?.length
  const tabsRef = useRef(null)

  useLayoutEffect(() => {
    if (tab === 'slides' && tabsRef.current) {
      window.scrollTo({
        top: window.scrollY + tabsRef.current.getBoundingClientRect().top - 90,
        behavior: 'instant',
      })
    }
  }, [tab])

  function openSlide(id, issueId) {
    showSlide(id, issueId)
    setTab('slides')
  }
  function toggle(index) {
    setResolved((items) =>
      items.includes(index) ? items.filter((item) => item !== index) : [...items, index],
    )
  }

  return (
    <>
      {hasSlides && <FeedbackResultTabs tab={tab} setTab={setTab} tabsRef={tabsRef} />}
      <div
        id="api-panel-overview"
        role={hasSlides ? 'tabpanel' : undefined}
        aria-labelledby={hasSlides ? 'api-tab-overview' : undefined}
        hidden={tab !== 'overview'}
        className={hasSlides ? 'result-panel' : 'history-panel'}
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
          <p className="history-notice">
            <Icon name="info" size={16} />
            {preview.status === 'idle' && result.saved_file_id
              ? '이 원본은 슬라이드로 미리 볼 수 없는 형식이에요. 위의 ‘원본 자료 받기’로 확인할 수 있어요.'
              : result.saved_file_id
                ? '저장된 원본 슬라이드와 함께 피드백을 보여 드려요.'
                : '이 기록에는 원본 슬라이드가 저장되지 않아, 슬라이드별 피드백만 보여 드려요.'}
          </p>
          <SlideWorkspace
            navigation={slideNavigation}
            feedback={slideFeedback}
            progress={slideProgress}
            preview={preview}
            onShowOverview={() => setTab('overview')}
            onNotify={onNotify}
          />
        </div>
      )}
    </>
  )
}
