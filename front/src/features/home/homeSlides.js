// PPT에서 내보낸 슬라이드는 { id, title, image: '/home-slides/01.png' }로 교체합니다.
// 텍스트와 이미지를 섞어도 바깥 프레임과 3초 전환은 그대로 유지됩니다.
// description은 짧은 설명, cards는 한 장의 핵심 내용을 요약하는 테두리 카드입니다.
export const homeSlides = [
  {
    id: 'confidence',
    title: '발표가 막막할 때, PresentAI.',
    lines: ['발표가 막막할 때,', 'PresentAI.'],
    label: '더 나은 발표의 시작',
    description: '자료의 첫 장부터 마지막 한마디까지.\n혼자 준비해도, 피드백은 함께.',
    tone: 'yellow',
  },
  {
    id: 'materials',
    title: '한 장씩 다듬고, 핵심은 더 선명하게.',
    lines: ['한 장씩 다듬고,', '핵심은 더 선명하게.'],
    label: '발표자료 피드백',
    description: '청중과 발표 목적에 맞춰\n자료의 흐름과 내용을 살펴봐요.',
    tone: 'white',
    cards: [
      ['01', '전체 평가', '잘한 점과 고칠 점을 한눈에'],
      ['02', '슬라이드별 점검', '한 장마다 필요한 피드백'],
      ['03', '구체적인 수정', '바로 적용할 수 있는 제안'],
    ],
  },
  {
    id: 'delivery',
    title: '내 말이 전해지는 방식까지.',
    lines: ['내 말이 전해지는', '방식까지.'],
    label: '발표 음성 피드백',
    description: '발음과 말하기 속도, 쉬는 구간까지.\n한 번의 녹음에서 다음 연습의 방향을 찾아요.',
    tone: 'dark',
  },
  {
    id: 'next',
    title: '무엇을 고칠지 알면, 다음 발표는 달라져요.',
    lines: ['무엇을 고칠지 알면,', '다음 발표는 달라져요.'],
    label: '피드백에서 다음 발표로',
    description: '막연한 지적 대신 구체적인 방법으로.\n중요한 부분부터 하나씩 바꿔 보세요.',
    tone: 'yellow',
    cards: [
      ['KEEP', '잘한 점은 살리고', '나만의 강점은 그대로'],
      ['REFINE', '고칠 곳은 분명하게', '우선순위에 따라 하나씩'],
      ['REPEAT', '다시 한번 연습하기', '피드백을 내 발표에 적용'],
    ],
  },
]
