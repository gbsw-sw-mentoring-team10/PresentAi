import { isSampleFile } from '../feedback/exampleForm.js'
import { analyzeSpeech, reviewSpeech } from './speechApi.js'

const IDLE_STEP = { status: 'idle', data: null, error: '' }

export const EMPTY_SPEECH = {
  // idle | transcribing | ready | error
  // transcribing은 분석 화면에서, ready부터 결과 화면에서 보여 줍니다.
  status: 'idle',
  mock: false,
  audioName: '',
  script: '',
  stt: null,
  pronunciation: IDLE_STEP, // 서버가 인식과 함께 돌려줍니다 (idle | success)
  review: IDLE_STEP, // AI 리뷰는 결과 화면이 뜬 뒤 늦게 채워집니다.
  error: '',
}

const messageOf = (error, fallback) => error?.message || fallback

// 음성 인식과 발음 평가를 한 번에 받아 결과를 보여 주고, AI 리뷰는 그 뒤에 따로 불러옵니다.
export function createSpeechRequest(
  onChange,
  { analyze = analyzeSpeech, review = reviewSpeech } = {},
) {
  let active = null
  let state = EMPTY_SPEECH

  function update(task, patch) {
    if (active !== task) return
    state = { ...state, ...patch }
    onChange(state)
  }

  function stop() {
    const task = active
    if (!task) return false
    active = null
    task.controller.abort()
    return true
  }

  function cancel() {
    if (stop()) {
      state = EMPTY_SPEECH
      onChange(state)
    }
  }

  const options = (task) => ({ signal: task.controller.signal, mock: task.mock })

  async function reviewStep(task) {
    update(task, { review: { status: 'loading', data: null, error: '' } })
    try {
      const data = await review(task.stt, task.pronunciationResult, options(task))
      update(task, { review: { status: 'success', data, error: '' } })
    } catch (error) {
      update(task, {
        review: {
          status: 'error',
          data: null,
          error: messageOf(error, 'AI 리뷰를 만들지 못했어요. 다시 시도해 주세요.'),
        },
      })
    }
  }

  async function analyzeAndReview(task) {
    try {
      const result = await analyze(task.file, options(task))
      task.stt = result.stt
      task.pronunciationResult = result.pronunciation
    } catch (error) {
      update(task, {
        status: 'error',
        error: messageOf(error, '음성을 분석하지 못했어요. 다시 시도해 주세요.'),
      })
      return
    }
    update(task, {
      status: 'ready',
      stt: task.stt,
      pronunciation: { status: 'success', data: task.pronunciationResult, error: '' },
    })
    await reviewStep(task)
  }

  async function execute(task) {
    try {
      await analyzeAndReview(task)
    } finally {
      task.finished = true
    }
  }

  function run(form) {
    if (!form.audio) return Promise.resolve()
    if (active && !active.finished) return active.promise
    stop()
    const mock = isSampleFile(form.audio)
    // 예시 음성은 실제 바이트가 없어 샘플 API에 내용 없는 파일을 보냅니다.
    const file = mock ? new File(['sample'], form.audio.name || 'sample.wav') : form.audio
    const task = { controller: new AbortController(), mock, file, stt: null }
    active = task
    state = {
      ...EMPTY_SPEECH,
      status: 'transcribing',
      mock,
      audioName: form.audio?.name || '',
      script: form.script || '',
    }
    onChange(state)
    task.promise = execute(task)
    return task.promise
  }

  function retryReview() {
    const task = active
    if (!task?.pronunciationResult || state.review.status !== 'error') return
    return reviewStep(task)
  }

  return { run, cancel, retryReview, dispose: stop }
}
