import { useLayoutEffect, useMemo, useRef } from 'react'
import Icon from '../../components/ui/Icon.jsx'

import { slideStatus } from './slideFeedback.js'
import SlidePreview from './SlidePreview.jsx'

export default function SlideSidebar({
  totalSlideCount,
  filter,
  changeFilter,
  visibleSlides,
  selectedSlideId,
  reviewed,
  onSelect,
  pdf,
}) {
  const pad = (value) => String(value).padStart(2, '0')
  const listRef = useRef(null)
  const reviewedIds = useMemo(() => new Set(reviewed), [reviewed])
  useLayoutEffect(() => {
    const list = listRef.current
    const item = list?.querySelector('[aria-current="true"]')
    if (!item) return
    const bounds = list.getBoundingClientRect()
    const target = item.getBoundingClientRect()
    if (list.scrollWidth > list.clientWidth) {
      if (target.left < bounds.left || target.right > bounds.right)
        list.scrollLeft += target.left - bounds.left - (list.clientWidth - target.width) / 2
    } else if (target.top < bounds.top || target.bottom > bounds.bottom) {
      list.scrollTop += target.top - bounds.top
    }
  }, [selectedSlideId, filter])

  function handleArrowKey(event, slideId) {
    const offsets = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
    const offset = offsets[event.key]
    if (!offset) return

    event.preventDefault()
    const currentIndex = visibleSlides.findIndex((item) => item.id === slideId)
    const nextSlide = visibleSlides[currentIndex + offset]
    if (!nextSlide) return

    onSelect(nextSlide.id)
    listRef.current
      .querySelector(`[data-slide-id="${nextSlide.id}"]`)
      ?.focus({ preventScroll: true })
  }

  return (
    <aside className="deck-sidebar" aria-label="슬라이드 탐색">
      <div className="deck-sidebar-heading">
        <strong>
          슬라이드 <span>{pad(totalSlideCount)}</span>
        </strong>
        <label className="sr-only" htmlFor="deck-filter">
          슬라이드 필터
        </label>
        <select
          id="deck-filter"
          value={filter}
          onChange={(event) => changeFilter(event.target.value)}
        >
          <option value="all">전체 보기</option>
          <option value="review">수정 필요</option>
          <option value="unread">미확인 피드백</option>
        </select>
      </div>
      <div ref={listRef} className="deck-slide-list">
        {visibleSlides.map((item) => {
          const status = slideStatus(item)
          const complete =
            item.issues.length > 0 && item.issues.every((issue) => reviewedIds.has(issue.id))
          return (
            <button
              key={item.id}
              data-slide-id={item.id}
              className={`deck-slide-item ${item.id === selectedSlideId ? 'selected' : ''}`}
              aria-current={item.id === selectedSlideId ? 'true' : undefined}
              aria-label={`${item.id}번 ${item.title} · ${status.label}${complete ? ' · 확인 완료' : ''}`}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => handleArrowKey(event, item.id)}
            >
              <div className="deck-thumbnail">
                <SlidePreview slide={item} pdf={pdf} small />
                <span className="deck-page-number">{pad(item.id)}</span>
                {complete && (
                  <span className="deck-complete" aria-label="확인 완료">
                    <Icon name="check" size={12} />
                  </span>
                )}
              </div>
              <strong>{item.title}</strong>
              <span className={`deck-status ${status.tone}`}>
                <i />
                {status.label}
                {item.issues.length > 0 && <small>{item.issues.length}개</small>}
              </span>
            </button>
          )
        })}
        {!visibleSlides.length && <p className="deck-list-empty">해당하는 슬라이드가 없어요.</p>}
      </div>
      <div className="deck-sidebar-foot">
        <Icon name="info" size={13} />
        <span>확인 표시는 평가를 바꾸지 않아요.</span>
      </div>
    </aside>
  )
}
