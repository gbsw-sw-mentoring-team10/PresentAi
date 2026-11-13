const text = (value) => (typeof value === 'string' ? value.trim() : '')
const priorities = new Set(['high', 'medium', 'low'])

export function slideStatus(slide) {
  if (!slide.analyzed) return { label: '평가 없음', tone: 'pending' }
  if (slide.issues.some((issue) => issue.priority === 'high'))
    return { label: '우선 수정', tone: 'urgent' }
  if (slide.issues.some((issue) => issue.priority === 'medium'))
    return { label: '개선 제안', tone: 'review' }
  return { label: '양호', tone: 'good' }
}

export function filterSlides(slides, filter, reviewed) {
  if (filter === 'review')
    return slides.filter((slide) => slide.issues.some((issue) => issue.priority !== 'low'))
  if (filter === 'unread') {
    const reviewedIds = new Set(reviewed)
    return slides.filter((slide) => slide.issues.some((issue) => !reviewedIds.has(issue.id)))
  }
  return slides
}

export function initialSlide(slides) {
  return (
    slides.find((slide) => slide.issues.some((issue) => issue.priority === 'high')) || slides[0]
  )
}

export function getPrioritySlideIssues(slides) {
  const selected = []
  for (const priority of priorities) {
    for (const slide of slides) {
      for (const issue of slide.issues) {
        if (issue.priority !== priority) continue
        selected.push({ ...issue, page: slide.id })
        if (selected.length === 3) return selected
      }
    }
  }
  return selected
}

// Optional API extension: page numbers are explicit, never inferred from prose or array order.
export function normalizeSlides(value) {
  if (!Array.isArray(value)) return []
  const pages = new Set()
  return value
    .flatMap((raw) => {
      const slide = raw && {
        ...raw,
        page: raw.page ?? raw.slide_number,
        strengths: raw.strengths ?? raw.good_points,
      }
      if (!slide || !Number.isInteger(slide.page) || slide.page < 1 || pages.has(slide.page))
        return []
      pages.add(slide.page)
      const issues = (Array.isArray(slide.issues) ? slide.issues : []).flatMap((issue, index) => {
        if (!issue || !text(issue.title || issue.issue || issue.problem)) return []
        return [
          {
            id: `slide-${slide.page}-issue-${index}`,
            title: text(issue.title || issue.issue || issue.problem),
            priority: priorities.has(issue.priority) ? issue.priority : 'medium',
            category: text(issue.category) || '수정 제안',
            target: text(issue.target),
            reason: text(issue.reason),
            suggestion: text(issue.suggestion || issue.solution),
            original: text(issue.original),
            replacement: text(issue.replacement),
          },
        ]
      })
      return [
        {
          id: slide.page,
          title: text(slide.title) || `${slide.page}번 슬라이드`,
          summary: text(slide.summary),
          time: text(slide.time),
          strengths: Array.isArray(slide.strengths)
            ? slide.strengths.filter((item) => text(item))
            : [],
          // An absent issues field is different from a completed analysis with no issues.
          analyzed: Array.isArray(slide.issues) && issues.length === slide.issues.length,
          issues: issues.sort(
            (a, b) =>
              ['high', 'medium', 'low'].indexOf(a.priority) -
              ['high', 'medium', 'low'].indexOf(b.priority),
          ),
          imageUrl: safePreviewUrl(slide.image_url),
        },
      ]
    })
    .sort((a, b) => a.id - b.id)
}

export function safePreviewUrl(value) {
  if (typeof value !== 'string') return ''
  if (/^\/[^/]/.test(value)) return value
  try {
    return new URL(value).protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

export function mergeDocumentSlides(slides, pageCount) {
  if (!pageCount) return slides
  const byPage = new Map(slides.map((slide) => [slide.id, slide]))
  return Array.from(
    { length: pageCount },
    (_, index) =>
      byPage.get(index + 1) || {
        id: index + 1,
        title: `${index + 1}번 슬라이드`,
        summary: '',
        strengths: [],
        issues: [],
        analyzed: false,
      },
  )
}
