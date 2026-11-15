import { slides } from './examplePresentation.js'

// region은 16:9 원본 이미지 기준 백분율이에요. 표시 원이 글자를 가리지 않도록 가리키는 글자의 바로 오른쪽에 둡니다.
const issuesByPage = {
  1: [
    {
      id: 'cover',
      priority: 'low',
      category: '핵심 메시지',
      title: '이 제안의 가치를 한 줄로 알려 주세요',
      target: '지속 가능한 부동산 투자 제안서',
      reason:
        '표지에서 투자자가 얻을 가치를 먼저 알려 주면, 이어지는 내용을 그 기준으로 듣게 돼요.',
      suggestion: '자료의 성격을 알려 주는 부제 아래에 제안의 핵심 가치를 한 줄로 덧붙여 보세요.',
      original: '지속 가능한 부동산 투자 제안서',
      replacement: '지속 가능한 부동산 투자 제안서\nESG로 높이는 부동산의 장기 가치',
      region: { x: 45, y: 73 },
    },
  ],
  2: [
    {
      id: 'agenda',
      priority: 'medium',
      category: '흐름 구성',
      title: '목차의 02장이 본문에 없어요',
      target: '02 · 지속 가능 부동산 시장 배경 및 성장 전망',
      reason:
        '목차에는 다섯 장이 있지만 시장 배경을 다루는 슬라이드가 없어요. 청중이 순서를 따라가다 빠진 부분을 찾게 돼요.',
      suggestion:
        '시장 배경 슬라이드를 한 장 추가하거나, 목차에서 02장을 빼고 번호를 다시 맞춰 주세요. 이때 슬라이드 5의 ‘04 / STRATEGY & VALUE’ 번호도 함께 고쳐 주세요.',
      replacement:
        '01 투자 전략 개요 → 02 ESG 기반 투자 및 운영 전략 → 03 예상 성과 및 기대 수익 → 04 실행 로드맵',
      region: { x: 35, y: 54 },
    },
    {
      id: 'baseline',
      priority: 'low',
      category: '정보 근거',
      title: '30% 개선의 기준을 밝혀 주세요',
      target: '운영 단계 에너지 소비 효율 30% 개선',
      reason:
        '무엇과 비교한 30%인지, 언제까지의 목표인지가 없으면 목표의 크기를 판단하기 어려워요.',
      suggestion: '비교 기준과 목표 시점을 숫자 옆에 짧게 적어 주세요.',
      original: '운영 단계 에너지 소비 효율 30% 개선',
      replacement: '운영 단계 에너지 소비 효율 30% 개선 ([기준 연도] 대비, [목표 연도]까지)',
      region: { x: 81, y: 67 },
    },
  ],
  3: [
    {
      id: 'kpi',
      priority: 'low',
      category: '구체성',
      title: '정량화할 ESG 지표를 보여 주세요',
      target: 'ESG 성과 지표를 실질적으로 정량화하여',
      reason:
        '정량화를 약속했지만 어떤 지표를 쓰는지 나오지 않아요. 투자자가 성과를 어떻게 확인할지 알기 어려워요.',
      suggestion: '목차 슬라이드의 핵심 투자 목표와 연결해 대표 지표 두세 개를 함께 적어 주세요.',
      replacement: '핵심 지표: 친환경 인증 자산 비중 · 에너지 소비 효율 · [추가 지표]',
      region: { x: 95, y: 77 },
    },
  ],
  4: [
    {
      id: 'source',
      priority: 'high',
      category: '정보 근거',
      title: '성장률 11.3%의 출처가 빠져 있어요',
      target: '+11.3% · 2033년까지 예상되는 글로벌 ESG 투자 시장의 연평균 성장률',
      reason:
        '투자 판단의 근거가 되는 수치인데 출처와 기준 연도가 없어요. 투자자가 수치의 범위와 신뢰도를 판단하기 어려워요.',
      suggestion:
        '원문에서 수치의 정의와 조사 시점을 확인한 뒤, 아래 형식으로 각주를 추가해 주세요. 같은 수치가 나오는 슬라이드 5에도 똑같이 적어 주세요.',
      replacement: '출처: [발행기관], [보고서명], [기준 연도]',
      region: { x: 49, y: 75 },
    },
    {
      id: 'timeline',
      priority: 'medium',
      category: '정보 확인',
      title: '목표 시점이 발표일과 같은 달이에요',
      target: 'TARGET TIMELINE · 2026.11',
      reason:
        '발표일(2026년 11월 15일)과 목표 시점이 같은 달이라, 이미 달성한 목표인지 앞으로의 계획인지 헷갈릴 수 있어요.',
      suggestion:
        '의도한 목표 시점이 맞는지 확인하고, 앞으로의 계획이라면 실제 완료 예정 시점으로 고쳐 주세요. 슬라이드 6의 ‘2026년 11월까지’ 문장도 함께 확인해 주세요.',
      original: '2026.11',
      replacement: '[완료 예정 연도].[월]',
      region: { x: 20, y: 75 },
    },
  ],
  5: [
    {
      id: 'alpha',
      priority: 'medium',
      category: '구체성',
      title: '+Alpha를 숫자로 보여 주세요',
      target: '+Alpha · 시장 수익률 대비 경쟁력 있는 초과 자본 수익률',
      reason:
        '다른 지표는 숫자로 제시했는데 초과 수익만 ‘+Alpha’로 표기되어 있어요. 투자자가 기대 수익의 크기를 가늠하기 어려워요.',
      suggestion:
        '목표 초과 수익률의 범위와 비교 기준을 함께 적어 주세요. 확정하기 어렵다면 산정 방식이라도 밝혀 주세요.',
      original: '+Alpha',
      replacement: '+[목표 범위]%p ([비교 지수] 대비)',
      region: { x: 94, y: 37 },
    },
  ],
  6: [
    {
      id: 'phases',
      priority: 'medium',
      category: '실행 가능성',
      title: '단계마다 일정을 표시해 주세요',
      target: 'PHASE 01 자산 매입 단계 ~ PHASE 04 미래 가치 실현',
      reason:
        '‘구체적인 타임라인을 설정합니다’라고 했지만 단계별 시작·완료 시점이 없어요. 실행 속도를 판단하기 어려워요.',
      suggestion: '각 단계 옆에 예상 기간과 핵심 산출물을 한 줄씩 덧붙여 주세요.',
      replacement: 'PHASE 01 자산 매입 단계 · [예상 기간] · [핵심 산출물]',
      region: { x: 18, y: 35 },
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
