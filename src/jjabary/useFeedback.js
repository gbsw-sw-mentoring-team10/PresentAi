import { useCallback, useEffect, useRef, useState } from 'react'
import { createFeedback } from './api'

const initial = { status: 'idle', result: null, submission: null, mock: false, error: '' }

export default function useFeedback() {
  const [request, setRequest] = useState(initial)
  const active = useRef(null)
  useEffect(() => () => active.current?.abort(), [])
  const cancel = useCallback(() => {
    const controller = active.current
    active.current = null
    controller?.abort()
    if (controller) setRequest(initial)
  }, [])
  const run = useCallback(async form => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    const submission = { ...form, title: form.title.trim() || form.file?.name?.replace(/\.[^.]+$/, '') || '제목 없는 발표' }
    const mock = !!form.file?.sample
    setRequest({ ...initial, status: 'loading', submission, mock })
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 180000)
    try {
      const result = await createFeedback(form, { signal: controller.signal, mock })
      if (active.current !== controller) return
      setRequest({ status: 'success', result, submission, mock, error: '' })
    } catch (error) {
      if (active.current !== controller) return
      if (controller.signal.aborted && !timedOut) return
      setRequest({ status: 'error', result: null, submission, mock, error: timedOut ? '분석 응답이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.' : error.message })
    } finally {
      clearTimeout(timeout)
      if (active.current === controller) active.current = null
    }
  }, [])
  return { request, run, cancel }
}
