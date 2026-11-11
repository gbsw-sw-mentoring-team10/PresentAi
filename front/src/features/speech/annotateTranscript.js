// 발음 점수에 따른 단계: 높을수록 좋아요.
export const LEVELS = [
  { id: 'good', min: 80, label: '좋아요' },
  { id: 'fair', min: 60, label: '조금 아쉬워요' },
  { id: 'weak', min: 40, label: '연습이 필요해요' },
  { id: 'poor', min: 0, label: '많이 아쉬워요' },
]

export function levelOf(accuracy, errorType = 'None') {
  // 단어가 빠졌다고 평가되면 점수가 없어도 가장 낮은 단계로 봅니다.
  if (errorType === 'Omission') return 'poor'
  if (accuracy == null) return null
  return (LEVELS.find((item) => accuracy >= item.min) || LEVELS.at(-1)).id
}

const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const LOOKAHEAD = 6

const TIME_MARGIN = 0.4

function scored(token, word, chunkStart) {
  return {
    type: 'word',
    text: token,
    time: word?.start ?? chunkStart,
    accuracy: word?.accuracy ?? null,
    errorType: word?.errorType ?? 'None',
    level: word ? levelOf(word.accuracy, word.errorType) : null,
  }
}

// 한 줄(인식 구간)의 단어에 Azure 단어 점수를 붙입니다.
// 구간 시간대에 있는 Azure 단어만 후보로 쓰기 때문에, 앞쪽이 어긋나도 다음 줄에서 다시 맞춰져요.
function annotateLine(chunk, words) {
  const tokens = chunk.text.split(/\s+/).filter(Boolean)
  const candidates =
    chunk.start == null
      ? words
      : words.filter(
          (word) =>
            word.start != null &&
            word.start >= chunk.start - TIME_MARGIN &&
            word.start < chunk.end + TIME_MARGIN,
        )
  // 단어 수가 같으면 글자가 달라도(영어를 한글로 인식한 경우 등) 순서대로 짝지어요.
  if (candidates.length === tokens.length)
    return tokens.map((token, index) => scored(token, candidates[index], chunk.start))
  let cursor = 0
  return tokens.map((token) => {
    const key = normalize(token)
    let match = null
    if (key) {
      for (let k = cursor; k < Math.min(candidates.length, cursor + LOOKAHEAD); k++) {
        if (normalize(candidates[k].word) === key) {
          match = candidates[k]
          cursor = k + 1
          break
        }
      }
    }
    return scored(token, match, chunk.start)
  })
}

// 인식된 문장을 줄 단위로 나누고 단어 점수와 쉬는 구간을 붙입니다.
export function annotateTranscript(stt, pronunciation) {
  const chunks = stt.chunks.length ? stt.chunks : [{ start: null, end: null, text: stt.text }]
  const words = pronunciation?.words || []
  const lines = chunks.map((chunk) => ({ start: chunk.start, items: annotateLine(chunk, words) }))

  // 쉬는 구간은 줄과 줄 사이에 넣습니다. 줄 중간에 있던 쉼은 바로 다음 줄 앞에 표시해요.
  const rows = lines.map((line) => ({ type: 'line', ...line }))
  const pauses = [...stt.pauses].sort((a, b) => b.start - a.start)
  for (const pause of pauses) {
    const index = rows.findIndex(
      (row) => row.type === 'line' && row.start != null && row.start >= pause.start - 0.05,
    )
    const row = { type: 'pause', start: pause.start, duration: pause.duration }
    rows.splice(index === -1 ? rows.length : index, 0, row)
  }
  return rows
}
