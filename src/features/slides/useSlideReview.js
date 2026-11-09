import { useState } from 'react'
import { filterSlides, initialSlide } from './slideFeedback.js'

// 예시/실제 결과가 같은 선택·필터·확인 규칙을 사용합니다.
// 탐색, 문제 확인, 진행률을 나눠 각 패널에 필요한 입력을 드러냅니다.
export default function useSlideReview(slides) {
  const [selectedSlideId, setSelectedSlideId] = useState(() => initialSlide(slides)?.id)
  const [activeIssueId, setActiveIssueId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [reviewedIssueIds, setReviewedIssueIds] = useState([])

  const visibleSlides = filterSlides(slides, filter, reviewedIssueIds)
  const slide = visibleSlides.find((item) => item.id === selectedSlideId) || visibleSlides[0]
  const slideIndex = visibleSlides.findIndex((item) => item.id === slide?.id)
  const currentIssue =
    activeIssueId === '__none__'
      ? null
      : slide?.issues.find((issue) => issue.id === activeIssueId) || slide?.issues[0]
  const totalIssues = slides.flatMap((item) => item.issues)
  const reviewedCount = totalIssues.filter((issue) => reviewedIssueIds.includes(issue.id)).length

  function selectSlide(slideId, issueId = null) {
    setSelectedSlideId(slideId)
    setActiveIssueId(issueId)
  }

  function showSlide(slideId, issueId = null) {
    // 요약의 링크로 진입할 때는 이전 필터에 가려진 슬라이드도 열어 줍니다.
    setFilter('all')
    selectSlide(slideId, issueId)
  }

  function changeFilter(nextFilter) {
    const nextSlides = filterSlides(slides, nextFilter, reviewedIssueIds)
    setFilter(nextFilter)
    if (!nextSlides.some((item) => item.id === slide?.id) && nextSlides[0]) {
      selectSlide(nextSlides[0].id)
    }
  }

  function moveSlide(offset) {
    const nextSlide = visibleSlides[slideIndex + offset]
    if (nextSlide) selectSlide(nextSlide.id)
  }

  function toggleIssue(issueId) {
    const nextReviewed = reviewedIssueIds.includes(issueId)
      ? reviewedIssueIds.filter((id) => id !== issueId)
      : [...reviewedIssueIds, issueId]
    setReviewedIssueIds(nextReviewed)

    // 미확인 목록에서 현재 장이 사라지면 실제 선택도 남아 있는 장으로 옮깁니다.
    const nextSlides = filterSlides(slides, filter, nextReviewed)
    if (!nextSlides.some((item) => item.id === slide?.id) && nextSlides[0]) {
      selectSlide(nextSlides[0].id)
    }
  }

  return {
    navigation: {
      totalSlideCount: slides.length,
      visibleSlides,
      selectedSlide: slide,
      selectedIndex: slideIndex,
      filter,
      selectSlide,
      changeFilter,
      moveSlide,
    },
    feedback: {
      currentIssueId: currentIssue?.id,
      reviewedIssueIds,
      selectIssue: setActiveIssueId,
      toggleIssue,
    },
    progress: {
      reviewedCount,
      totalCount: totalIssues.length,
    },
    // 요약에서 상세로 진입하는 동작은 페이지에서만 사용합니다.
    showSlide,
  }
}
