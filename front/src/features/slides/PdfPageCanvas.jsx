import { useEffect, useRef, useState } from 'react'

export default function PdfPageCanvas({ document, pageNumber, small, expanded }) {
  const host = useRef(null)
  const canvas = useRef(null)
  const [visible, setVisible] = useState(!small)
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    if (visible) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '150px' },
    )
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [visible])
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    let render
    const element = canvas.current
    async function draw() {
      try {
        const page = await document.getPage(pageNumber)
        if (cancelled) return
        const initial = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({
          scale: (small ? 360 : expanded ? 2200 : 1400) / initial.width,
        })
        element.width = viewport.width
        element.height = viewport.height
        // Raster previews must also finish in hidden tabs, where display rendering waits for rAF.
        render = page.render({ canvasContext: element.getContext('2d'), viewport, intent: 'print' })
        await render.promise
        if (!cancelled) setStatus('ready')
      } catch (error) {
        if (!cancelled && error.name !== 'RenderingCancelledException') setStatus('error')
      }
    }
    draw()
    return () => {
      cancelled = true
      render?.cancel()
    }
  }, [document, pageNumber, small, expanded, visible])
  return (
    <div ref={host} className={`deck-pdf ${status}`}>
      <canvas ref={canvas} role="img" aria-label={`${pageNumber}번 원본 슬라이드`} />
      {status !== 'ready' && (
        <span className="deck-preview-message">
          {status === 'error' ? '페이지를 표시할 수 없어요' : '슬라이드를 불러오는 중…'}
        </span>
      )}
    </div>
  )
}
