import { exampleSpeechResponse, exampleSpeechReview } from '../../data/exampleFeedback.js'
import { waitForNextPoll } from '../feedback/feedbackApi.js'
import { parseSpeechResponse, parseSpeechReview } from './speechApi.js'

const EXAMPLE_DELAY_MS = 2500

// 예시 리허설 음성은 서버 대신 준비된 결과를 돌려줍니다. 화면 흐름을 보여 주려고 잠시 기다려요.
export async function loadExampleSpeech({ signal, delayMs = EXAMPLE_DELAY_MS } = {}) {
  await waitForNextPoll(delayMs, signal)
  return parseSpeechResponse(exampleSpeechResponse)
}

export async function loadExampleSpeechReview({ signal, delayMs = EXAMPLE_DELAY_MS } = {}) {
  await waitForNextPoll(delayMs, signal)
  return parseSpeechReview(exampleSpeechReview)
}
