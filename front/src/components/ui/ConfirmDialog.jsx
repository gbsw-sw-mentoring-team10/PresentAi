import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'
import '../../styles/confirm-dialog.css'

// 브라우저 기본 confirm 대신 쓰는 확인 팝업입니다. 진행 버튼은 오른쪽(작은 화면에서는 위)에 두고,
// 되돌릴 수 없는 작업은 작은 화면에서도 취소를 위에 둡니다.
export default function ConfirmDialog({
  title,
  heading,
  children,
  detail,
  question,
  icon = 'alert',
  cancelLabel = '취소',
  cancelIcon = null,
  confirmLabel,
  confirmIcon = null,
  confirmVariant = 'yellow',
  onCancel,
  onConfirm,
  onClose,
}) {
  return (
    <Modal onClose={onClose} title={title} className="confirm-dialog">
      <span className={`confirm-dialog-symbol confirm-dialog-symbol-${confirmVariant}`}>
        <Icon name={icon} size={26} />
      </span>
      <h2>{heading}</h2>
      <p>{children}</p>
      {detail}
      {question && <strong className="confirm-dialog-question">{question}</strong>}
      <div className={`confirm-dialog-actions${confirmVariant === 'danger' ? ' is-danger' : ''}`}>
        <Button variant="outline" icon={cancelIcon} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} icon={confirmIcon} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
