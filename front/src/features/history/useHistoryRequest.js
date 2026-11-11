import { useCallback, useEffect, useState } from 'react'

// 계정·기록이 바뀌면 이전 응답을 숨기고, 나간 화면의 요청은 취소합니다.
export default function useHistoryRequest(load, owner) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(null)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ load, owner, attempt, status: 'success', data })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ load, owner, attempt, status: 'error', error })
      })
    return () => controller.abort()
  }, [load, owner, attempt])

  if (state?.load !== load || state.owner !== owner || state.attempt !== attempt)
    return { status: 'loading', data: null, error: null, retry }
  return { ...state, retry }
}
