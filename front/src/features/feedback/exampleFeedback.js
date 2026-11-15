import { exampleFeedbackResponse } from '../../data/exampleFeedback.js'
import { exampleSlides } from '../../data/exampleSlides.js'
import { normalizeFeedback, waitForNextPoll } from './feedbackApi.js'

const EXAMPLE_DELAY_MS = 3000

// 예시 자료는 서버를 거치지 않고, 잠시 기다린 뒤 준비된 그린 호라이즌 결과를 돌려줍니다.
// 슬라이드는 예시 카드(원본 이미지와 위치 표시 포함)를 그대로 써요.
export async function loadExampleFeedback({ signal, delayMs = EXAMPLE_DELAY_MS } = {}) {
  await waitForNextPoll(delayMs, signal)
  return {
    ...normalizeFeedback(exampleFeedbackResponse),
    slides: exampleSlides,
    raw_response: exampleFeedbackResponse,
  }
}
