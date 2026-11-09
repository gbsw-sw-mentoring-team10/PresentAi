import { slides } from './examplePresentation.js'

const issuesByPage = {
  1: [
    {
      id: 'cover',
      priority: 'low',
      category: '핵심 메시지',
      title: '듣고 나면 무엇을 알게 될까요?',
      target: '표지의 부제',
      reason: '발표에서 얻을 내용을 미리 알려주면 청중이 흐름을 따라가기 쉬워요.',
      suggestion: '발표의 핵심 내용을 한 줄의 부제로 소개해 보세요.',
      original: '2026 하반기 서비스 로드맵',
      replacement: '하반기, 우리가 함께 만들어 갈 세 가지 변화',
      region: { x: 13, y: 67 },
    },
  ],
  2: [
    {
      id: 'density',
      priority: 'medium',
      category: '가독성',
      title: '가장 중요한 지표에 시선을 모아 주세요',
      target: '같은 크기로 나열된 세 가지 서비스 지표',
      reason: '모든 수치를 같은 비중으로 보여주면 무엇이 중요한지 바로 파악하기 어려워요.',
      suggestion:
        '발표 목적과 가장 가까운 지표 하나를 크게 배치하고, 나머지 두 개는 보조 정보로 줄여 보세요.',
      region: { x: 36, y: 51 },
    },
  ],
  3: [
    {
      id: 'source',
      priority: 'high',
      category: '정보 근거',
      title: '시장 수치의 출처가 빠져 있어요',
      target: '시장 규모 12조 원 · 연평균 성장률 18%',
      reason: '출처와 기준 연도가 없으면 청중이 수치의 범위와 신뢰도를 판단하기 어려워요.',
      suggestion:
        '원문에서 수치의 정의와 조사 시점을 확인한 뒤, 아래 형식으로 각주를 추가해 주세요.',
      replacement: '출처: [발행기관], [보고서명], [기준 연도]',
      region: { x: 61, y: 73 },
    },
    {
      id: 'terms',
      priority: 'medium',
      category: '청중 이해',
      title: '처음 나오는 용어를 짧게 풀어 주세요',
      target: 'TAM · SAM · SOM',
      reason:
        '신입 사원에게는 익숙하지 않을 수 있는 용어예요. 설명 없이 넘어가면 시장 기회의 크기를 이해하기 어려워요.',
      suggestion: '영문 약어 옆에 쉬운 설명을 함께 적어 주세요.',
      original: 'TAM · SAM · SOM',
      replacement: '전체 시장(TAM) → 진입 가능한 시장(SAM) → 초기 목표 시장(SOM)',
      region: { x: 47, y: 87 },
    },
  ],
  4: [
    {
      id: 'priority',
      priority: 'medium',
      category: '정보 구조',
      title: '분기별로 가장 중요한 목표를 골라 주세요',
      target: '3분기와 4분기의 실행 과제',
      reason: '여러 과제가 같은 비중으로 나열되어 첫 번째로 집중할 일이 잘 드러나지 않아요.',
      suggestion: '분기별 핵심 목표를 하나씩 강조하고 담당 팀과 기대 결과를 함께 적어 주세요.',
      replacement: '[분기] 핵심 목표 → 담당 팀 → 기대 결과',
      region: { x: 52, y: 52 },
    },
  ],
  5: [
    {
      id: 'onboarding',
      priority: 'low',
      category: '실행 가능성',
      title: '신입 사원의 첫 행동을 제안해 보세요',
      target: '팀별 역할과 협업 안내',
      reason: '역할을 이해한 뒤 바로 참여할 수 있는 작은 행동이 있으면 더 유용해요.',
      suggestion: '온보딩 첫 달에 참여할 활동을 한 가지 덧붙여 보세요.',
      replacement: '첫 달에는 고객 피드백 리뷰에 참여하고, 개선 아이디어를 한 가지 제안해 주세요.',
    },
  ],
  6: [
    {
      id: 'next-step',
      priority: 'low',
      category: '마무리',
      title: '발표 후에도 찾아볼 수 있게 해 주세요',
      target: '마지막 슬라이드의 다음 단계',
      reason: '자료와 질문 채널을 안내하면 발표 이후에도 내용을 확인하고 대화를 이어갈 수 있어요.',
      suggestion: '로드맵 문서 링크와 질문을 남길 채널을 안내해 주세요.',
      replacement: '자세한 일정: [로드맵 문서 링크]\n궁금한 점: [질문 채널]',
    },
  ],
}

export const exampleSlides = slides.map((slide) => ({
  ...slide,
  example: true,
  analyzed: true,
  strengths: [slide.good],
  issues: issuesByPage[slide.id],
}))
