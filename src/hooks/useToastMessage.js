import { useCallback, useEffect, useRef, useState } from 'react'

export default function useToastMessage(duration = 3500) {
  const [message, setMessage] = useState('')
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const show = useCallback(
    (value) => {
      clearTimeout(timer.current)
      setMessage(value)
      timer.current = setTimeout(() => setMessage(''), duration)
    },
    [duration],
  )

  return { message, show }
}
