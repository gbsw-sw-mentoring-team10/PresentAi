import Button from '../../components/ui/Button.jsx'

export default function SlideNavigation({ slideIndex, slideCount, filter, moveSlide }) {
  return (
    <div className="deck-navigation">
      <Button
        variant="outline"
        icon="back"
        disabled={slideIndex <= 0}
        onClick={() => moveSlide(-1)}
      >
        이전
      </Button>
      <span>
        <b>{slideIndex + 1}</b> / {slideCount}
        <small>{filter === 'all' ? '전체 슬라이드' : '필터된 슬라이드'}</small>
      </span>
      <Button icon="arrow" disabled={slideIndex >= slideCount - 1} onClick={() => moveSlide(1)}>
        다음
      </Button>
    </div>
  )
}
