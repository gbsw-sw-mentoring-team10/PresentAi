import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Modal from '../../components/ui/Modal.jsx'
import './SampleFileWarning.css'

export default function SampleFileWarning({ speech, file, onReselect, onContinue, onClose }) {
  const kind = speech ? '음성' : '파일'
  return (
    <Modal onClose={onClose} title={`예시 ${kind} 안내`} className="sample-warning-modal">
      <span className="sample-warning-symbol">
        <Icon name="alert" size={26} />
      </span>
      <h2>예시 {kind}은 함께 보내지 않아요.</h2>
      <p>
        입력 내용을 수정해서 이제 직접 입력한 자료로 {speech ? '미리보기를 준비해요' : '분석해요'}.
        <br />
        첨부된 {kind}은 실제 {kind}이 아닌 예시라서 {speech ? '미리보기' : '분석'}에 포함되지
        않아요.
      </p>
      {file?.name && (
        <div className="sample-warning-file">
          <Icon name={speech ? 'mic' : 'file'} size={20} />
          <span>{file.name}</span>
          <small>예시 {kind}</small>
        </div>
      )}
      <strong className="sample-warning-question">그대로 진행할까요?</strong>
      <div className="sample-warning-actions">
        <Button variant="outline" icon="upload" onClick={onReselect}>
          {kind} 다시 선택
        </Button>
        <Button variant="yellow" onClick={onContinue}>
          그대로 진행
        </Button>
      </div>
    </Modal>
  )
}
