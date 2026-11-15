// 예시 자료(그린 호라이즌)로 분석을 시작했을 때 보여 주는 결과입니다. 실제 서버 응답과 같은 형식이에요.

export const exampleFeedbackResponse = {
  score: 78,
  feedback:
    '그린 호라이즌의 ESG 투자 전략을 표지, 목차, 전략 개요, 투자 전략, 기대 성과, 실행 로드맵 순서로 차근차근 풀어내 기관 투자자가 따라가기 쉬운 구성이에요. 큰 숫자와 카드형 레이아웃 덕분에 핵심 지표가 먼저 눈에 들어오고, 대본도 슬라이드 순서를 잘 따라가요. 다만 투자 판단의 근거가 되는 연평균 성장률 11.3%에 출처가 없고, 목표 시점 2026.11이 발표일과 같은 달이며, 목차의 02장(시장 배경 및 성장 전망)에 해당하는 슬라이드가 빠져 있어요. 수치의 근거와 일정을 분명히 하면 훨씬 설득력 있는 제안이 될 거예요.',
  strengths: [
    '표지부터 실행 로드맵까지 같은 색과 레이아웃을 유지해 하나의 제안서로 자연스럽게 읽혀요.',
    '2026.11, +11.3%, +Alpha처럼 핵심 지표를 큰 카드 숫자로 보여 줘 투자자가 요점을 빠르게 파악할 수 있어요.',
    '환경(E)과 거버넌스(G), 재무적 기대 수익과 ESG 성과 관리를 나란히 배치해 두 가치를 함께 설명해요.',
  ],
  improvements: [
    {
      issue:
        '슬라이드 4·5의 연평균 성장률 11.3%에 출처와 기준 연도가 없어요. 투자 판단의 핵심 근거인 만큼 청중이 수치의 신뢰도를 확인할 수 없어요.',
      deduction: 7,
      solution:
        '원문 보고서에서 수치의 정의와 조사 시점을 확인하고, 두 슬라이드 하단에 ‘출처: 발행기관, 보고서명, 기준 연도’ 형식의 각주를 추가하세요.',
    },
    {
      issue:
        '목차에는 ‘02 지속 가능 부동산 시장 배경 및 성장 전망’이 있지만 해당 슬라이드가 없어 목차와 본문 구성이 맞지 않아요.',
      deduction: 5,
      solution:
        '시장 배경 슬라이드를 한 장 추가하거나, 목차에서 02장을 빼고 슬라이드 5의 ‘04 / STRATEGY & VALUE’ 번호까지 다시 맞추세요.',
    },
    {
      issue:
        '‘TARGET TIMELINE 2026.11’과 ‘2026년 11월까지’라는 목표 시점이 발표일(2026년 11월 15일)과 같은 달이라, 이미 끝난 계획인지 앞으로의 계획인지 헷갈려요.',
      deduction: 4,
      solution: '의도한 완료 시점을 확인해 슬라이드 4와 6의 날짜를 함께 고치세요.',
    },
    {
      issue: '‘+Alpha’가 숫자 없이 표기되어 기대 초과 수익의 크기를 판단할 수 없어요.',
      deduction: 3,
      solution:
        '목표 초과 수익률의 범위와 비교 기준(벤치마크)을 숫자로 적거나, 최소한 산정 방식을 밝히세요.',
    },
    {
      issue: '실행 로드맵의 네 단계에 시작·완료 시점이 없어 ‘구체적인 타임라인’이 보이지 않아요.',
      deduction: 3,
      solution: '각 PHASE 옆에 예상 기간과 핵심 산출물을 한 줄씩 덧붙이세요.',
    },
  ],
  revised_script:
    '안녕하세요. 그린 호라이즌 투자 파트너스입니다. 오늘은 ESG로 부동산의 장기 가치를 높이는 투자 제안을 말씀드리겠습니다. 발표는 투자 전략 개요, ESG 기반 투자 및 운영 전략, 예상 성과와 기대 수익, 그리고 단계별 실행 로드맵 순서로 진행하겠습니다.\n\n' +
    '먼저 투자 전략 개요입니다. 저희는 ESG 성과 중심의 전략으로 단순한 수익을 넘어 지속 가능한 부동산의 장기적 가치를 만들고자 합니다. 2026년 거버넌스 개혁 원년을 기점으로 투명한 윤리 경영 체계를 확립하고, 친환경 인증 자산 비중과 에너지 소비 효율 같은 ESG 성과 지표를 정량화해 자산 가치를 극대화하겠습니다.\n\n' +
    '다음은 ESG 기반 투자 및 운영 전략입니다. [완료 예정 시점]까지 에너지 효율 최적화와 탄소 배출 저감 기술을 적용해 자산 가치를 높이고, 투명한 거버넌스 체계로 리스크를 관리하겠습니다. [발행기관]의 [보고서명]에 따르면 글로벌 ESG 투자 시장은 2033년까지 연평균 11.3% 성장할 것으로 예상되며, 저희는 이를 상회하는 포트폴리오 운용을 목표로 합니다.\n\n' +
    '이어서 예상 성과와 기대 수익입니다. 시장 성장 전망치인 연평균 11.3%를 웃도는 성과와 함께, [비교 지수] 대비 [목표 범위]%p의 초과 수익을 추구합니다. 엄격한 KPI 설정과 모니터링으로 리스크를 관리해 최적의 위험 조정 수익을 제공하겠습니다.\n\n' +
    '마지막으로 실행 로드맵입니다. 자산 매입, 친환경 리모델링, 운영 최적화, 미래 가치 실현의 네 단계를 [예상 기간]에 걸쳐 이행하며, 체계적인 성과 보고와 ESG 관리 시스템으로 투명한 운영 체계를 확립하겠습니다. 궁금한 점은 이어지는 질의응답 시간에 편하게 말씀해 주세요. 감사합니다.',
}

// 예시 리허설 음성(투자제안_리허설_1차.m4a)의 인식 결과입니다.
// 대본과 비교하면 목차 소개가 짧아지고, KPI 문장을 건너뛰고, 숫자 앞에서 머뭇거린 부분이 보여요.
const REHEARSAL_CHUNKS = [
  { timestamp: [0.0, 4.5], text: ' 안녕하세요. 그린 호라이즌 투자 파트너스입니다.' },
  { timestamp: [4.5, 9.0], text: ' 오늘은 지속 가능한 부동산 투자 제안서를 말씀드리겠습니다.' },
  {
    timestamp: [9.0, 15.1],
    text: ' 발표는 투자 전략 개요, 운영 전략, 그리고 실행 로드맵 순서로 진행하겠습니다.',
  },
  {
    timestamp: [17.9, 23.8],
    text: ' 먼저 투자 전략 개요입니다. 저희는 어 ESG 성과 중심의 전략으로',
  },
  {
    timestamp: [23.8, 29.4],
    text: ' 단순한 수익을 넘어 지속 가능한 부동산의 장기적 가치를 만들고자 합니다.',
  },
  {
    timestamp: [29.4, 38.4],
    text: ' 2026년 거버넌스 개혁 원년을 기점으로 투명한 윤리 경영 체계를 확립하고, ESG 성과 지표를 정량화해서 자산 가치를 극대화하는 게 목표입니다.',
  },
  {
    timestamp: [40.7, 46.6],
    text: ' 다음은 ESG 기반 투자 및 운영 전략입니다. 2026년 11월까지 에너지 효율 최적화와',
  },
  {
    timestamp: [46.6, 53.5],
    text: ' 탄소 배출 저감 기술을 적용해서 자산 가치를 높이고, 음 투명한 거버넌스 체계로 리스크를 관리하겠습니다.',
  },
  { timestamp: [53.5, 56.5], text: ' 글로벌 ESG 투자 시장은 어' },
  {
    timestamp: [58.4, 65.1],
    text: ' 2033년까지 연평균 11.3% 성장할 것으로 예상되고요, 저희는 이를 상회하는 포트폴리오 운용을 목표로 합니다.',
  },
  {
    timestamp: [67.9, 73.8],
    text: ' 이어서 예상 성과와 기대 수익입니다. 시장 성장 전망치인 연평균 11.3%를 웃도는 성과와 함께',
  },
  { timestamp: [73.8, 78.2], text: ' 시장 수익률 대비 경쟁력 있는 초과 수익을 추구합니다.' },
  {
    timestamp: [80.6, 87.3],
    text: ' 마지막으로 실행 로드맵입니다. 자산 매입, 친환경 리모델링, 운영 최적화, 미래 가치 실현의 네 단계로 이행하며',
  },
  {
    timestamp: [87.3, 93.7],
    text: ' 성과 보고와 ESG 관리 시스템으로 투명한 운영 체계를 확립하겠습니다. 감사합니다.',
  },
]

// 구간별 [정확도, 유창성]입니다. 머뭇거린 구간(3, 8)은 유창성이 낮아요.
const SEGMENT_SCORES = [
  [95, 95],
  [94, 94],
  [90, 91],
  [86, 80],
  [92, 92],
  [84, 86],
  [91, 90],
  [85, 82],
  [78, 70],
  [83, 84],
  [89, 88],
  [92, 92],
  [86, 87],
  [93, 93],
]

// 따로 적은 단어만 점수가 다르고, 나머지는 구간 점수를 따릅니다. 키는 `구간 번호:단어`예요.
const WORD_NOTES = {
  '3:어': [70],
  '5:거버넌스': [58, 'Mispronunciation'],
  '7:저감': [66, 'Mispronunciation'],
  '7:음': [70],
  '8:어': [68],
  '9:2033년까지': [82, 'UnexpectedBreak'],
  '9:11.3%': [63, 'Mispronunciation'],
  '10:11.3%를': [71],
  '12:리모델링,': [61, 'Mispronunciation'],
}

const round = (value) => Math.round(value * 100) / 100

// 서버의 발음 평가(기준 문장 없이 평가한 free 모드)와 같은 형식으로 만듭니다.
function buildPronunciation(chunks) {
  const segments = []
  const words = []
  chunks.forEach(({ timestamp: [start, end], text }, index) => {
    const [accuracy, fluency] = SEGMENT_SCORES[index]
    const tokens = text.trim().split(/\s+/)
    const step = (end - start) / tokens.length
    segments.push({
      start,
      end,
      text: text.trim(),
      accuracy,
      fluency,
      completeness: null,
      pronunciation: accuracy - 1,
    })
    tokens.forEach((word, order) => {
      const [score = Math.min(100, accuracy + (order % 4)), errorType = 'None'] =
        WORD_NOTES[`${index}:${word}`] || []
      words.push({
        word,
        start: round(start + step * order),
        end: round(start + step * (order + 1)),
        accuracy: score,
        error_type: errorType,
      })
    })
  })
  return {
    mode: 'free',
    recognized_text: segments.map((segment) => segment.text).join(' '),
    reference_word_count: null,
    // 구간 길이로 가중 평균한 값이에요.
    scores: { accuracy: 88.3, fluency: 87.6, completeness: null, pronunciation: 87.3 },
    segments,
    words,
  }
}

export const exampleSpeechResponse = {
  text: REHEARSAL_CHUNKS.map((chunk) => chunk.text).join(''),
  chunks: REHEARSAL_CHUNKS,
  silence: {
    duration: 94.0,
    noise_floor_db: -38.0,
    threshold_db: -30.0,
    pauses: [
      { start: 15.1, end: 17.9, duration: 2.8 },
      { start: 38.4, end: 40.7, duration: 2.3 },
      { start: 56.5, end: 58.4, duration: 1.9 },
      { start: 65.1, end: 67.9, duration: 2.8 },
      { start: 78.2, end: 80.6, duration: 2.4 },
    ],
  },
  // 분당 글자 수(472자 ÷ 쉼을 뺀 81.8초)와 325자 기준 속도 점수예요.
  speech_rate: 346.2,
  speech_rate_score: 93.5,
  pronunciation: buildPronunciation(REHEARSAL_CHUNKS),
}

export const exampleSpeechReview = {
  summary:
    '발표 흐름을 끝까지 유지했고, 장이 바뀔 때마다 잠깐 쉬어 가며 구분해 준 점이 좋아요. 다만 목차를 소개할 때 ‘예상 성과와 기대 수익’을 빠뜨렸고, 11.3% 같은 핵심 수치 앞에서 머뭇거림이 들렸어요. 숫자가 나오는 문장만 따로 연습하면 훨씬 믿음직하게 들릴 거예요.',
  strengths: [
    '장이 바뀔 때마다 2초 남짓 쉬어 가며 청중이 흐름을 따라오도록 했어요.',
    '“먼저”, “다음은”, “마지막으로” 같은 연결어로 발표 순서를 분명하게 알려 줬어요.',
  ],
  improvements: [
    {
      issue: '목차 소개에서 ‘예상 성과와 기대 수익’이 빠졌어요.',
      solution:
        '대본의 목차 문장을 슬라이드 순서와 함께 소리 내어 두 번 읽고, 네 개 장을 모두 말했는지 확인해 보세요.',
    },
    {
      issue: '‘11.3%’를 말하기 전에 “어” 하고 멈칫했어요.',
      solution:
        '수치가 나오는 문장은 숫자 앞에서 한 박자 쉬고, 또박또박 끊어 말하는 연습을 해 보세요.',
    },
    {
      issue: '‘거버넌스’, ‘리모델링’ 같은 외래어의 발음 점수가 낮게 나왔어요.',
      solution: '해당 단어만 천천히 세 번 따라 읽은 뒤, 문장 속에서 다시 말해 보세요.',
    },
    {
      issue: '예상 성과 장에서 KPI 설정과 모니터링 문장을 건너뛰었어요.',
      solution:
        '리스크 관리는 투자자가 꼭 묻는 부분이에요. 대본에 표시해 두고 빠뜨리지 않도록 연습해 보세요.',
    },
  ],
}
