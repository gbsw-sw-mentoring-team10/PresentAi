import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function SampleFileWarning({ speech, file, onReselect, onContinue, onClose }) {
  const kind = speech ? '음성' : '파일'
  return (
    <ConfirmDialog
      title={`예시 ${kind} 안내`}
      heading={`예시 ${kind}은 함께 보내지 않아요.`}
      detail={
        file?.name && (
          <div className="confirm-dialog-item">
            <Icon name={speech ? 'mic' : 'file'} size={20} />
            <span>{file.name}</span>
            <small>예시 {kind}</small>
          </div>
        )
      }
      question="그대로 진행할까요?"
      cancelLabel={`${kind} 다시 선택`}
      cancelIcon="upload"
      confirmLabel="그대로 진행"
      confirmIcon="arrow"
      onCancel={onReselect}
      onConfirm={onContinue}
      onClose={onClose}
    >
      입력 내용을 수정해서 이제 직접 입력한 자료로 {speech ? '미리보기를 준비해요' : '분석해요'}.
      <br />
      첨부된 {kind}은 실제 {kind}이 아닌 예시라서 {speech ? '미리보기' : '분석'}에 포함되지 않아요.
    </ConfirmDialog>
  )
}
