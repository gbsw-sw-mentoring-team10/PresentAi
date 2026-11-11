import { isSampleFile } from '../feedback/exampleForm.js'
import { assessPronunciation, transcribeSpeech } from './speechApi.js'

export const EMPTY_SPEECH = {
  status: 'idle', // idle | transcribing | transcribed | error
  mock: false,
  audioName: '',
  script: '',
  stt: null,
  pronunciation: { status: 'idle', data: null, error: '' }, // idle | loading | success | error
  error: '',
}

const messageOf = (error, fallback) => error?.message || fallback

// 음성 → 텍스트(먼저 표시) → 발음 평가(뒤따라 표시) 순서로 요청을 관리합니다.
export function createSpeechRequest(
  onChange,
  { transcribe = transcribeSpeech, assess = assessPronunciation } = {},
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

  async function assessStep(task) {
    update(task, { pronunciation: { status: 'loading', data: null, error: '' } })
    try {
      const data = await assess(task.file, task.stt.text, {
        signal: task.controller.signal,
        mock: task.mock,
      })
      update(task, { pronunciation: { status: 'success', data, error: '' } })
    } catch (error) {
      update(task, {
        pronunciation: {
          status: 'error',
          data: null,
          error: messageOf(error, '발음을 평가하지 못했어요. 다시 시도해 주세요.'),
        },
      })
    }
  }

  async function execute(task) {
    try {
      await transcribeAndAssess(task)
    } finally {
      task.finished = true
    }
  }

  async function transcribeAndAssess(task) {
    try {
      task.stt = await transcribe(task.file, {
        signal: task.controller.signal,
        mock: task.mock,
      })
    } catch (error) {
      update(task, {
        status: 'error',
        error: messageOf(error, '음성을 분석하지 못했어요. 다시 시도해 주세요.'),
      })
      return
    }
    update(task, { status: 'transcribed', stt: task.stt })
    await assessStep(task)
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

  function retryPronunciation() {
    const task = active
    if (!task?.stt || state.pronunciation.status !== 'error') return
    return assessStep(task)
  }

  return { run, cancel, retryPronunciation, dispose: stop }
}
