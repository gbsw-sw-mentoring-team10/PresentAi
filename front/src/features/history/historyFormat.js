export const FEEDBACK_TYPES = {
  material: { label: '발표자료 피드백', short: '발표자료' },
  speech: { label: '발표 피드백', short: '발표' },
}

export const feedbackTypeLabel = (type) => (FEEDBACK_TYPES[type] || FEEDBACK_TYPES.material).label

// 'YYYY-MM-DD' → 'YYYY.MM.DD'
export const formatHistoryDate = (value) => value.slice(0, 10).replaceAll('-', '.')
