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
      <h2>{speech ? '분석할 음성을 선택해 주세요.' : '예시 파일은 함께 보내지 않아요.'}</h2>
      <p>
        {speech ? (
          <>
            예시 음성은 실제 파일이 아니에요. 수정한 대본으로 연습하려면 직접 녹음하거나 음성 파일을
            선택해 주세요.
          </>
        ) : (
          <>
            입력 내용을 수정해서 이제 직접 입력한 자료로 분석해요.
            <br />
            첨부된 파일은 실제 파일이 아닌 예시라서 분석에 포함되지 않아요.
          </>
        )}
      </p>
      {file?.name && (
        <div className="sample-warning-file">
          <Icon name={speech ? 'mic' : 'file'} size={20} />
          <span>{file.name}</span>
          <small>예시 {kind}</small>
        </div>
      )}
      {!speech && <strong className="sample-warning-question">그대로 진행할까요?</strong>}
      <div className={`sample-warning-actions${speech ? ' is-single' : ''}`}>
        <Button variant="outline" icon="upload" onClick={onReselect}>
          {kind} 다시 선택
        </Button>
        {!speech && (
          <Button variant="yellow" onClick={onContinue}>
            그대로 진행
          </Button>
        )}
      </div>
    </Modal>
  )
}
