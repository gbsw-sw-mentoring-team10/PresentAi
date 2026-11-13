import { useCallback, useEffect, useRef, useState } from 'react'

export default function useMobileMenu() {
  const [isOpen, setOpen] = useState(false)
  const headerRef = useRef(null)
  const buttonRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    function closeOutside(event) {
      if (!headerRef.current?.contains(event.target)) close()
    }

    function closeEscape(event) {
      if (event.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }

    function closeDesktop(event) {
      if (event.matches) close()
    }

    const desktop = window.matchMedia('(min-width: 801px)')
    window.addEventListener('hashchange', close)
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    desktop.addEventListener('change', closeDesktop)

    return () => {
      window.removeEventListener('hashchange', close)
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
      desktop.removeEventListener('change', closeDesktop)
    }
  }, [isOpen, close])

  return { isOpen, close, toggle: () => setOpen((open) => !open), headerRef, buttonRef }
}
