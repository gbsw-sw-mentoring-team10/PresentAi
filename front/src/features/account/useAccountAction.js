import { useCallback, useEffect, useRef, useState } from 'react'

function describeFailure(error) {
  if (error?.name === 'TimeoutError') return '응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.'
  if (error instanceof TypeError)
    return '계정 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'
  return error?.message || '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
}

// 팝업의 처리 중/오류 상태를 관리하고, 팝업이 닫히면 진행 중인 요청을 취소해요.
export default function useAccountAction() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const controller = useRef(null)

  useEffect(() => () => controller.current?.abort(), [])

  const run = useCallback(async (action) => {
    if (controller.current) return null
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    setMessage('')
    try {
      const value = await action(current.signal)
      return current.signal.aborted ? null : { value }
    } catch (error) {
      if (!current.signal.aborted) setMessage(describeFailure(error))
      return null
    } finally {
      controller.current = null
      if (!current.signal.aborted) setBusy(false)
    }
  }, [])

  return { busy, message, setMessage, run }
}
