import SlidePreviewDialog from './SlidePreviewDialog.jsx'
import SlideFeedbackPanel from './SlideFeedbackPanel.jsx'
import SlideViewer from './SlideViewer.jsx'
import SlideSidebar from './SlideSidebar.jsx'
import SlideNavigation from './SlideNavigation.jsx'
import SlideReviewProgress from './SlideReviewProgress.jsx'
import { useCallback, useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function SlideWorkspace({
  navigation,
  feedback,
  progress,
  preview,
  onShowOverview,
  onNotify,
}) {
  const slide = navigation.selectedSlide
  const pdf = preview?.document
  const [expanded, setExpanded] = useState(false)
  const closePreview = useCallback(() => setExpanded(false), [])

  async function copySuggestion(text) {
    try {
      await navigator.clipboard.writeText(text)
      onNotify('추천 문장을 복사했어요.')
    } catch {
      onNotify('복사하지 못했어요. 추천 문장을 직접 선택해 복사해 주세요.')
    }
  }

  const navigationControls = (
    <SlideNavigation
      slideIndex={navigation.selectedIndex}
      slideCount={navigation.visibleSlides.length}
      filter={navigation.filter}
      moveSlide={navigation.moveSlide}
    />
  )

  return (
    <div className="deck-workspace">
      <SlideReviewProgress
        reviewedCount={progress.reviewedCount}
        totalCount={progress.totalCount}
      />
      {preview?.status === 'loading' && (
        <p className="deck-notice" role="status">
          <Icon name="file" size={16} />
          원본 PDF의 슬라이드를 불러오고 있어요.
        </p>
      )}
      {preview?.error && (
        <p className="deck-notice" role="alert">
          <Icon name="info" size={16} />
          {preview.error}
        </p>
      )}
      {navigation.totalSlideCount === 0 ? (
        <div className="deck-empty">
          <Icon name="slides" size={32} />
          <h3>슬라이드별 결과가 아직 없어요.</h3>
          <p>
            이번 분석에서는 전체 피드백만 제공됐어요.
            <br />
            PDF를 올리면 원본 슬라이드도 함께 볼 수 있어요.
          </p>
          <Button variant="outline" onClick={onShowOverview} icon="back">
            전체 피드백 보기
          </Button>
        </div>
      ) : (
        <div className="deck-columns">
          <SlideSidebar
            totalSlideCount={navigation.totalSlideCount}
            visibleSlides={navigation.visibleSlides}
            selectedSlideId={slide?.id}
            filter={navigation.filter}
            changeFilter={navigation.changeFilter}
            onSelect={navigation.selectSlide}
            reviewed={feedback.reviewedIssueIds}
            pdf={pdf}
          />
          {!slide ? (
            <div className="deck-empty deck-filter-empty">
              <Icon name="check" size={30} />
              <h3>
                {navigation.filter === 'unread'
                  ? '모든 피드백을 확인했어요.'
                  : '수정이 필요한 슬라이드가 없어요.'}
              </h3>
              <p>전체 슬라이드에서 잘한 점과 추가 제안도 살펴보세요.</p>
              <Button variant="outline" onClick={() => navigation.changeFilter('all')}>
                전체 슬라이드 보기
              </Button>
            </div>
          ) : (
            <>
              <SlideViewer
                slide={slide}
                pdf={pdf}
                currentIssueId={feedback.currentIssueId}
                onIssueSelect={feedback.selectIssue}
                onOpenPreview={() => setExpanded(true)}
              >
                {navigationControls}
              </SlideViewer>
              <SlideFeedbackPanel
                slide={slide}
                currentIssueId={feedback.currentIssueId}
                reviewed={feedback.reviewedIssueIds}
                onToggle={feedback.toggleIssue}
                onIssueSelect={feedback.selectIssue}
                onShowOverview={onShowOverview}
                copySuggestion={copySuggestion}
              />
            </>
          )}
        </div>
      )}
      {slide && <div className="deck-mobile-controls">{navigationControls}</div>}
      {expanded && slide && (
        <SlidePreviewDialog slide={slide} pdf={pdf} closePreview={closePreview} />
      )}
    </div>
  )
}
