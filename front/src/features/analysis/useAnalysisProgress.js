import { useEffect, useState } from 'react'

const PREVIEW_STEP_DELAYS = [850, 1800, 2900]

export default function useAnalysisProgress({ speech, audio, waiting, submission, enabled }) {
  const [previewStep, setStep] = useState(0)
  const [readFailed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [clock, setClock] = useState({ submission: null, elapsed: 0 })

  useEffect(() => {
    if (!waiting || !enabled) return
    const startedAt = Date.now()
    const timer = setInterval(() => {
      setClock({ submission, elapsed: (Date.now() - startedAt) / 1000 })
    }, 300)
    return () => clearInterval(timer)
  }, [waiting, submission, enabled])

  useEffect(() => {
    if (!speech || !enabled) return
    let cancelled = false
    let timers = []

    async function runPreview() {
      try {
        if (audio instanceof Blob) await audio.slice(0, 1024).arrayBuffer()
        if (cancelled) return
        timers = PREVIEW_STEP_DELAYS.map((delay, index) =>
          setTimeout(() => setStep(index + 1), delay),
        )
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    runPreview()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [speech, audio, attempt, enabled])

  function retryPreview() {
    setFailed(false)
    setStep(0)
    setAttempt((value) => value + 1)
  }

  const elapsed = waiting && clock.submission === submission ? clock.elapsed : 0
  return { previewStep, readFailed, elapsed, retryPreview }
}
