import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeFeedback } from '../src/features/feedback/feedbackApi.js'
import {
  normalizeSlides,
  filterSlides,
  initialSlide,
  mergeDocumentSlides,
  slideStatus,
} from '../src/features/slides/slideFeedback.js'
import { exampleSlides } from '../src/data/exampleSlides.js'
import { priorities, example } from '../src/data/examplePresentation.js'
import { buildApiReport, buildExampleReport } from '../src/features/results/feedbackReport.js'

test('review navigation uses filtered page order, including nonconsecutive page numbers', () => {
  const pages = normalizeSlides([
    { page: 2, issues: [{ title: 'A', priority: 'low' }] },
    { page: 5, issues: [{ title: 'B', priority: 'high' }] },
    { page: 9, issues: [{ title: 'C', priority: 'medium' }] },
  ])
  assert.equal(initialSlide(pages).id, 5)
  assert.deepEqual(
    filterSlides(pages, 'review', []).map((page) => page.id),
    [5, 9],
  )
  const reviewed = pages[1].issues.map((issue) => issue.id)
  assert.deepEqual(
    filterSlides(pages, 'unread', reviewed).map((page) => page.id),
    [2, 9],
  )
  assert.equal(
    slideStatus(pages[1]).label,
    '우선 수정',
    'confirming feedback must not change its evaluation',
  )
  assert.deepEqual(
    filterSlides(
      pages,
      'unread',
      pages.flatMap((p) => p.issues.map((i) => i.id)),
    ),
    [],
  )
})

test('optional page feedback preserves the legacy response and maps explicit page identities only', () => {
  const overall = { score: 80, feedback: '전체 평가', strengths: [], improvements: [] }
  assert.deepEqual(normalizeFeedback(overall), overall)
  const result = normalizeFeedback({
    ...overall,
    slides: [
      { title: 'No page number', issues: [] },
      { page: 0, issues: [] },
      {
        page: 3,
        title: '시장',
        image_url: 'javascript:alert(1)',
        issues: [
          { title: '용어', priority: 'medium', original: 'TAM', replacement: '전체 시장' },
          { title: '출처', priority: 'high', target: '12조', solution: '각주 추가' },
        ],
      },
      { page: 3, issues: [] },
      { page: 1, image_url: 'https://example.com/slide.png', issues: [] },
    ],
  })
  assert.deepEqual(
    result.slides.map((slide) => slide.id),
    [1, 3],
  )
  assert.equal(result.slides[1].imageUrl, '')
  assert.equal(result.slides[0].imageUrl, 'https://example.com/slide.png')
  assert.equal(result.slides[1].issues[0].title, '출처')
  assert.equal(result.slides[1].issues[0].suggestion, '각주 추가')
  assert.equal(result.slides[1].issues[1].replacement, '전체 시장')
})

test('PDF pages without page-level analysis and malformed analyses do not appear as positive results', () => {
  const pages = normalizeSlides([{ page: 2, title: '두 번째 장', issues: [] }])
  const merged = mergeDocumentSlides(pages, 4)
  assert.equal(merged.length, 4)
  assert.equal(merged[1], pages[0])
  assert.equal(slideStatus(merged[0]).label, '평가 없음')
  assert.equal(slideStatus(merged[1]).label, '양호')
  assert.equal(normalizeSlides([{ page: 1, issues: [null] }])[0].analyzed, false)
  assert.equal(normalizeSlides([{ page: 1 }])[0].analyzed, false)
  assert.deepEqual(filterSlides(merged, 'review', []), [])
})

test('overview links and checks refer to the same issue IDs as the detailed example cards', () => {
  for (const priority of priorities) {
    const slide = exampleSlides.find((item) => item.id === priority.slide)
    assert.ok(slide.issues.some((issue) => issue.id === priority.id))
  }
  assert.equal(exampleSlides[2].issues.length, 2)
  assert.equal(new Set(exampleSlides.flatMap((s) => s.issues.map((i) => i.id))).size, 7)
})

test('exported reports include each individual issue and rewrite without inventing page analysis', () => {
  const exampleReport = buildExampleReport(example, exampleSlides, false)
  assert.match(exampleReport, /시장 수치의 출처가 빠져 있어요/)
  assert.match(exampleReport, /처음 나오는 용어를 짧게 풀어 주세요/)
  assert.match(exampleReport, /전체 시장\(TAM\)/)
  const result = normalizeFeedback({
    score: 80,
    feedback: '전체',
    strengths: [],
    improvements: [],
    slides: [{ page: 4, issues: [{ title: '개선', replacement: '새 문장' }] }],
  })
  const report = buildApiReport({ result, submission: example, mock: false })
  assert.match(report, /슬라이드 4/)
  assert.match(report, /추천 문장: 새 문장/)
  assert.doesNotMatch(report, /슬라이드 1:/)
})
