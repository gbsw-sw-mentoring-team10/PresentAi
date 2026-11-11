// 'YYYY-MM-DD'를 시간대 영향 없이 '2026년 3월 2일'처럼 보여 줍니다.
export function formatKoreanDate(value) {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return `${Number(match[1])}년 ${Number(match[2])}월 ${Number(match[3])}일`
}

export function describeDate(value, loading, empty = '아직 바꾼 적이 없어요') {
  if (loading) return '불러오는 중…'
  return formatKoreanDate(value) || empty
}

export function clampScore(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, number))
}

export function summarizeFeedbackHistory(history = []) {
  const items = Array.isArray(history) ? history : []
  const scores = items
    .map((item) => item?.score)
    .filter((score) => typeof score === 'number' && Number.isFinite(score))
  return {
    material: items.filter((item) => item?.type === 'material').length,
    speech: items.filter((item) => item?.type === 'speech').length,
    total: items.length,
    average: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + clampScore(score), 0) / scores.length)
      : null,
  }
}
