export function buildApiReport({ result, submission, mock }) {
  const improvements = result.improvements
    .map((item) => {
      const deduction = item.deduction != null ? `[감점 ${item.deduction}점] ` : ''
      const solution = item.solution ? `\n  → 해결 방법: ${item.solution}` : ''
      return `• ${deduction}${item.issue}${solution}`
    })
    .join('\n')

  let report = [
    `PresentAi — ${mock ? '서버 샘플' : '발표'} 피드백 보고서`,
    `발표 제목: ${submission.title}\n발표 목적: ${submission.purpose}\n점수: ${result.score} / 100`,
    `종합 피드백\n${result.feedback}`,
    `장점\n${result.strengths.map((item) => `• ${item}`).join('\n')}`,
    `개선사항\n${improvements}`,
  ].join('\n\n')

  if (result.slides?.length) report += `\n\n슬라이드별 피드백\n${buildSlideReport(result.slides)}`
  if (result.revised_script) report += `\n\n수정된 대본\n${result.revised_script}`
  if (mock) report += '\n\n이 보고서는 예시 자료에 대한 서버 샘플 응답입니다.'
  return report
}

export function buildExampleReport(example, slides, speech) {
  const feedback = speech
    ? '대본과 음성 비교는 준비 중인 기능입니다. 예시 개선 제안: 빠진 연결 문장을 확인하고, 긴 문장을 짧게 나눠 연습하세요.'
    : buildSlideReport(slides)

  return [
    'PresentAi — 예시 피드백 보고서\n실제 제출 자료의 AI 분석 결과가 아닌 데모입니다.',
    `${example.title}\n발표 목적: ${example.purpose}`,
    feedback,
  ].join('\n\n')
}

export function downloadTextFile(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function buildSlideReport(slides) {
  return slides
    .map((slide) =>
      [
        `슬라이드 ${slide.id}: ${slide.title}`,
        slide.time ? `권장 시간: ${slide.time}` : '',
        slide.summary || '',
        ...(slide.strengths || []).map((item) => `장점: ${item}`),
        ...(slide.issues || [{ title: slide.issue, suggestion: slide.suggestion }]).flatMap(
          (issue) => [
            issue.title ? `• ${issue.title}` : '',
            issue.target ? `  대상: ${issue.target}` : '',
            issue.reason ? `  이유: ${issue.reason}` : '',
            issue.suggestion ? `  수정 제안: ${issue.suggestion}` : '',
            issue.original ? `  기존 문장: ${issue.original}` : '',
            issue.replacement ? `  추천 문장: ${issue.replacement}` : '',
          ],
        ),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}
