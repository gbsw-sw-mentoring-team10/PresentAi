// 음성 분석 방식: 서버 /speech/의 mode 값과 같다
export const SPEECH_MODES = [
  {
    id: 'accurate',
    title: '정확한 분석',
    badge: '추천',
    time: '원본 음성 길이의 약 40%',
    pros: '말한 내용을 가장 정확하게 받아 적어요. 영어가 섞인 발표, 노래, 발음이 흐리거나 주변 소음이 있는 음성에 강해요.',
    cons: '상대적으로 오래 걸려요.',
  },
  {
    id: 'fast',
    title: '빠른 분석',
    badge: '',
    time: '원본 음성 길이의 약 15%',
    pros: '인식과 발음 평가를 한 번에 해서 훨씬 빨라요. 또렷한 한국어 발표에 알맞아요.',
    cons: '영어가 섞이거나 노래, 소음이 있으면 받아 적기가 부정확할 수 있어요.',
  },
]

export const DEFAULT_SPEECH_MODE = 'accurate'
