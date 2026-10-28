import { Button, Icon, SlideArtwork } from '../components.jsx'
import { slides } from '../data.js'

export default function SlidesPanel({
  slidesRef,
  filter,
  setFilter,
  selected,
  setSelected,
  slide,
}) {
  return (
    <div className="slides-detail-layout">
      <aside ref={slidesRef} className="slides-list" aria-label="슬라이드 선택">
        <div className="slides-filter">
          <label htmlFor="slide-filter">
            슬라이드 <b>06</b>
          </label>
          <select
            id="slide-filter"
            value={filter}
            onChange={(e) => {
              const next = e.target.value
              setFilter(next)
              if (next === 'review' && slide.status === '좋아요') setSelected(2)
            }}
          >
            <option value="all">전체 보기</option>
            <option value="review">수정 필요</option>
          </select>
        </div>
        {slides
          .filter((s) => filter === 'all' || s.status !== '좋아요')
          .map((s) => (
            <button
              aria-current={selected === s.id ? 'true' : undefined}
              aria-label={`${s.id}번 ${s.title} · ${s.status}`}
              className={selected === s.id ? 'selected' : ''}
              key={s.id}
              onClick={() => setSelected(s.id)}
            >
              <span className="slide-list-number">0{s.id}</span>
              <div>
                <SlideArtwork slide={s} small />
                <b>{s.title}</b>
                <small>{s.status}</small>
              </div>
            </button>
          ))}
      </aside>
      <section className="slide-detail">
        <div className="slide-detail-heading">
          <h2>
            0{slide.id} <span>{slide.title}</span>
          </h2>
          <span className="tag tag-yellow">
            <Icon name="clock" size={14} />
            {slide.time}
          </span>
        </div>
        <SlideArtwork slide={slide} />
        <p className="slide-summary">{slide.summary}</p>
        <div className="feedback-block positive">
          <span>
            <Icon name="check" size={18} />
          </span>
          <div>
            <h3>잘하고 있어요</h3>
            <p>{slide.good}</p>
          </div>
        </div>
        <div className="feedback-block">
          <span>
            <Icon name="edit" size={18} />
          </span>
          <div>
            <h3>이 부분을 다듬어 보세요</h3>
            <p>{slide.issue}</p>
          </div>
        </div>
        <div className="recommendation">
          <span className="card-label">
            <Icon name="sparkle" size={16} />
            이렇게 바꿔 보세요
          </span>
          <p>{slide.suggestion}</p>
        </div>
        <div className="slide-navigation">
          <Button
            variant="outline"
            icon="back"
            disabled={selected === 1}
            onClick={() => {
              setFilter('all')
              setSelected((s) => s - 1)
            }}
          >
            이전
          </Button>
          <span>
            {selected} / {slides.length}
          </span>
          <Button
            disabled={selected === 6}
            onClick={() => {
              setFilter('all')
              setSelected((s) => s + 1)
            }}
          >
            다음 슬라이드
          </Button>
        </div>
      </section>
    </div>
  )
}
