import { useEffect, useRef, useState } from 'react'

const MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export default function useHeroCarousel(count) {
  const [frame, setFrame] = useState({ position: 0, animated: false })
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia(MOTION_QUERY).matches)
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  const [inView, setInView] = useState(true)
  const viewportRef = useRef(null)
  const playing = count > 1 && !paused && !reducedMotion && visible && inView

  useEffect(() => {
    const media = window.matchMedia(MOTION_QUERY)
    const updateMotion = (event) => setReducedMotion(event.matches)
    const updateVisibility = () => setVisible(document.visibilityState !== 'hidden')
    media.addEventListener?.('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      media.removeEventListener?.('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    if (!window.IntersectionObserver || !viewportRef.current) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setFrame((current) => ({ position: (current.position % count) + 1, animated: true }))
    }, 3000)
    return () => window.clearInterval(timer)
  }, [playing, count])

  function select(index) {
    setPaused(true)
    setFrame({ position: index, animated: true })
  }

  function finish(event) {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    setFrame((current) => (current.position === count ? { position: 0, animated: false } : current))
  }

  return {
    frame,
    activeIndex: count ? frame.position % count : 0,
    playing,
    reducedMotion,
    viewportRef,
    select,
    toggle: () => setPaused((value) => !value),
    finish,
  }
}
