import { useLayoutEffect, useRef } from 'react'
import Icon from './Icon.jsx'

export default function Modal({ children, onClose, title, className = '' }) {
  const dialog = useRef(null)
  useLayoutEffect(() => {
    const current = dialog.current
    current.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      // Close before React removes the dialog so native focus restoration can run.
      current.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
    >
      <button type="button" onClick={onClose} className="icon-button modal-close" aria-label="닫기">
        <Icon name="close" />
      </button>
      {children}
    </dialog>
  )
}
