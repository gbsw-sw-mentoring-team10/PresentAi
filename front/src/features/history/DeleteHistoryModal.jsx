import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Modal from '../../components/ui/Modal.jsx'

export default function DeleteHistoryModal({ item, deleting, error, onClose, onConfirm }) {
  return (
    <Modal onClose={onClose} title="피드백 기록 삭제" className="history-delete-modal">
      <span className="history-delete-symbol">
        <Icon name="trash" size={24} />
      </span>
      <h2>이 기록을 삭제할까요?</h2>
      <p>
        <strong>{item.title}</strong> 기록과 저장된 원본 파일이 함께 삭제돼요.
        <br />
        삭제하면 되돌릴 수 없어요.
      </p>
      {error && (
        <div className="history-delete-message" role="alert">
          {error}
        </div>
      )}
      <div className="history-delete-actions">
        <Button variant="outline" icon={null} disabled={deleting} onClick={onClose}>
          취소
        </Button>
        <Button variant="danger" icon={null} disabled={deleting} onClick={onConfirm}>
          {deleting ? '삭제 중…' : '삭제하기'}
        </Button>
      </div>
    </Modal>
  )
}
