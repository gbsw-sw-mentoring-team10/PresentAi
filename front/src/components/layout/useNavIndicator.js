import { useLayoutEffect, useRef, useState } from 'react'

export default function useNavIndicator(activeId, layoutKey, { hoverOnly = false } = {}) {
  const navRef = useRef(null)
  const indicatorRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const targetId = (preview?.key === layoutKey ? preview.id : null) || (hoverOnly ? null : activeId)

  useLayoutEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    let disposed = false

    function measure() {
      if (disposed) return
      const target = [...nav.querySelectorAll('[data-nav-id]')].find(
        (button) => button.dataset.navId === targetId,
      )
      const rect = target?.getBoundingClientRect()
      if (!rect?.width || !rect.height) {
        indicator.style.opacity = '0'
        return
      }
      const parent = nav.getBoundingClientRect()
      indicator.style.width = `${rect.width}px`
      indicator.style.transform = `translate3d(${rect.left - parent.left + nav.scrollLeft}px, ${rect.bottom - parent.top + nav.scrollTop - 3}px, 0)`
      indicator.style.opacity = '1'
    }

    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(nav)
    for (const button of nav.querySelectorAll('[data-nav-id]')) observer?.observe(button)
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => {
      disposed = true
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [targetId, layoutKey])

  function bind(id) {
    return {
      'data-nav-id': id,
      onPointerEnter: (event) => {
        if (event.pointerType !== 'touch') setPreview({ id, key: layoutKey })
      },
      onPointerLeave: () => setPreview(null),
      onFocus: () => setPreview({ id, key: layoutKey }),
      onBlur: () => setPreview(null),
    }
  }

  return { navRef, indicatorRef, bind }
}
