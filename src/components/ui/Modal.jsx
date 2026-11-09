import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

export default function Modal({ children, onClose, title, className = '' }) {
  const dialog = useRef(null)
  useEffect(() => {
    const current = dialog.current
    current.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function cancel(e) {
      e.preventDefault()
      onClose()
    }
    current.addEventListener('cancel', cancel)
    return () => {
      current.removeEventListener('cancel', cancel)
      current.close()
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-label={title}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
    >
      <button onClick={onClose} className="icon-button modal-close" aria-label="닫기">
        <Icon name="close" />
      </button>
      {children}
    </dialog>
  )
}
