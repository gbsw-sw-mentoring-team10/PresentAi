import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function SampleFileWarning({ speech, file, onReselect, onContinue, onClose }) {
  const kind = speech ? '음성' : '파일'
  return (
    <ConfirmDialog
      title={`예시 ${kind} 안내`}
      heading={speech ? '분석할 음성을 선택해 주세요.' : '예시 파일은 함께 보내지 않아요.'}
      detail={
        file?.name && (
          <div className="confirm-dialog-item">
            <Icon name={speech ? 'mic' : 'file'} size={20} />
            <span>{file.name}</span>
            <small>예시 {kind}</small>
          </div>
        )
      }
      question={speech ? null : '그대로 진행할까요?'}
      cancelLabel={`${kind} 다시 선택`}
      cancelIcon="upload"
      confirmLabel={speech ? null : '그대로 진행'}
      confirmIcon="arrow"
      onCancel={onReselect}
      onConfirm={onContinue}
      onClose={onClose}
    >
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
    </ConfirmDialog>
  )
}
