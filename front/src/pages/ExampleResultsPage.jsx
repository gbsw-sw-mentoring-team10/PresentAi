import ExampleResultTabs from '../features/results/ExampleResultTabs.jsx'
import { useLayoutEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import { buildExampleReport, downloadTextFile } from '../features/results/feedbackReport.js'
import useToastMessage from '../hooks/useToastMessage.js'
import ExampleOverview from '../features/results/ExampleOverview.jsx'
import SlideWorkspace from '../features/slides/SlideWorkspace.jsx'
import StoryFlowPanel from '../features/results/StoryFlowPanel.jsx'
import FactCheckPanel from '../features/results/FactCheckPanel.jsx'
import SpeechComparison from '../features/results/SpeechComparison.jsx'
import { example } from '../data/examplePresentation.js'
import { exampleSlides as slides } from '../data/exampleSlides.js'
import useSlideReview from '../features/slides/useSlideReview.js'

export default function ExampleResultsPage({ navigate, speech = false }) {
  const [tab, setTab] = useState('overview')
  const {
    navigation: slideNavigation,
    feedback: slideFeedback,
    progress: slideProgress,
    showSlide,
  } = useSlideReview(slides)
  const [resolvedFacts, setResolvedFacts] = useState([])
  const { message: toast, show: showToast } = useToastMessage()
  const tabsRef = useRef(null)
  const pendingDetailScroll = useRef(false)
  useLayoutEffect(() => {
    // 작은 화면에서 선택한 탭이 가로 스크롤 밖으로 사라지지 않게 합니다.
    const list = tabsRef.current
    const item = list?.querySelector('[aria-selected="true"]')
    if (item && list.scrollWidth > list.clientWidth) {
      const bounds = list.getBoundingClientRect()
      const itemBounds = item.getBoundingClientRect()
      if (itemBounds.left < bounds.left || itemBounds.right > bounds.right) {
        list.scrollLeft += itemBounds.left - bounds.left - (list.clientWidth - itemBounds.width) / 2
      }
    }
    if (pendingDetailScroll.current && tabsRef.current) {
      pendingDetailScroll.current = false
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({
        top: window.scrollY + tabsRef.current.getBoundingClientRect().top - 90,
        behavior: reduced ? 'instant' : 'smooth',
      })
    }
  }, [tab, slideNavigation.selectedSlide?.id, slideNavigation.filter])
  function toggleFact(id) {
    setResolvedFacts((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    )
  }
  function selectTab(tabId) {
    if (tabId === 'slides') pendingDetailScroll.current = true
    setTab(tabId)
  }
  function openSlide(id, issueId = null) {
    pendingDetailScroll.current = true
    showSlide(id, issueId)
    setTab('slides')
  }
  function exportReport() {
    downloadTextFile(buildExampleReport(example, slides, speech), 'presentai-example-feedback.txt')
    showToast('예시 피드백 보고서를 내려받았어요.')
  }

  return (
    <div
      className={`results-page section-wrap ${!speech && tab === 'slides' ? 'deck-results-page' : ''}`}
    >
      <div className="result-topline">
        <button className="back-link" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          <Icon name="back" size={16} />
          입력 화면으로
        </button>
        <FeedbackSteps current={3} />
      </div>
      <div className="page-heading">
        <div>
          <span className="section-kicker">A CLEARER STORY. A STRONGER YOU.</span>
          <h1>{speech ? '말을 돌아보면, 전달이 달라져요.' : '좋은 발표에 한 걸음 더 가까이.'}</h1>
          <p>
            {speech
              ? '대본과 리허설을 비교하고, 다음 연습의 방향을 찾아보세요.'
              : '지금 잘하고 있는 것부터, 더 다듬으면 좋을 부분까지.'}
          </p>
        </div>
        <Button variant="outline" icon="download" onClick={exportReport}>
          보고서 받기
        </Button>
      </div>
      <div className="example-banner">
        <span className="tag tag-yellow">예시 결과</span>
        <p>
          아래 내용은 <b>‘2026 하반기 서비스 로드맵’</b> 예시 자료의 피드백입니다. 선택한 파일의
          실제 분석 결과가 아닙니다.
        </p>
      </div>
      <div className="result-meta">
        <div>
          <small>발표 제목</small>
          <strong>{example.title}</strong>
        </div>
        <div>
          <small>발표 목적</small>
          <span>{example.purpose}</span>
        </div>
        <div>
          <small>{speech ? '예시 음성' : '예시 자료'}</small>
          <span>
            <Icon name={speech ? 'mic' : 'file'} size={16} />
            {speech ? '리허설_1차.m4a' : example.file.name}
          </span>
        </div>
      </div>
      {speech ? (
        <SpeechComparison />
      ) : (
        <>
          <ExampleResultTabs tab={tab} tabsRef={tabsRef} onTabChange={selectTab} />
          <div
            id="result-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className="result-panel"
          >
            {tab === 'overview' && (
              <ExampleOverview
                resolved={slideFeedback.reviewedIssueIds}
                toggle={slideFeedback.toggleIssue}
                openSlide={openSlide}
                onShowSlides={() => openSlide(slideNavigation.selectedSlide?.id)}
              />
            )}
            {tab === 'slides' && (
              <SlideWorkspace
                navigation={slideNavigation}
                feedback={slideFeedback}
                progress={slideProgress}
                onShowOverview={() => setTab('overview')}
                onNotify={showToast}
              />
            )}
            {tab === 'flow' && <StoryFlowPanel />}
            {tab === 'facts' && (
              <FactCheckPanel resolved={resolvedFacts} toggle={toggleFact} openSlide={openSlide} />
            )}
          </div>
        </>
      )}
      <div className="result-bottom-cta">
        <div>
          <span>한 번의 점검, 더 나은 한 번의 발표.</span>
          <h3>다음 자료도 함께 다듬어 볼까요?</h3>
        </div>
        <Button variant="yellow" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          {speech ? '다시 연습하기' : '다른 자료 점검하기'}
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
