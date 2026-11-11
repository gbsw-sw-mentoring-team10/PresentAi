import { createFeedback, getPresentationTitle } from './feedbackApi.js'
import { isExampleForm, withoutSampleFiles } from './exampleForm.js'

export const EMPTY_REQUEST = {
  status: 'idle',
  result: null,
  submission: null,
  mock: false,
  error: '',
}

const TIMEOUT_MESSAGE = '분석 응답이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.'

// Keep request ownership outside rendering so double-clicks cannot submit twice.
export function createFeedbackRequest(
  onChange,
  {
    send = createFeedback,
    timeoutMs = 180000,
    schedule = setTimeout,
    unschedule = clearTimeout,
  } = {},
) {
  let active = null

  function stop() {
    const task = active
    if (!task) return false
    active = null
    unschedule(task.timer)
    task.controller.abort()
    return true
  }

  function cancel() {
    if (stop()) onChange(EMPTY_REQUEST)
  }

  async function execute(form, task) {
    try {
      const result = await send(form, { signal: task.controller.signal, mock: task.mock })
      if (active === task) onChange({ ...task.context, status: 'success', result, error: '' })
    } catch (error) {
      if (active !== task) return
      onChange({
        ...task.context,
        status: 'error',
        result: null,
        error: error?.message || '분석 요청을 처리하지 못했어요. 다시 시도해 주세요.',
      })
    } finally {
      unschedule(task.timer)
      if (active === task) active = null
    }
  }

  function run(form) {
    if (active) return active.promise
    // 예시 그대로일 때만 샘플 API를 쓰고, 수정한 자료에서는 가상 파일을 뺍니다.
    const mock = isExampleForm(form, 'material')
    const sent = mock ? form : withoutSampleFiles(form)
    const submission = { ...sent, title: getPresentationTitle(sent) }
    const task = { controller: new AbortController(), mock, context: { submission, mock } }
    active = task
    onChange({ ...EMPTY_REQUEST, ...task.context, status: 'loading' })
    task.timer = schedule(() => {
      if (active !== task) return
      stop()
      onChange({ ...task.context, status: 'error', result: null, error: TIMEOUT_MESSAGE })
    }, timeoutMs)
    task.promise = execute(sent, task)
    return task.promise
  }

  return { run, cancel, dispose: stop }
}
