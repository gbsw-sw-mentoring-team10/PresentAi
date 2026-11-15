import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'

export default function UnsavedFeedbackWarning({ onLogin, onContinue, onClose }) {
  return (
    <ConfirmDialog
      title="피드백 저장 안내"
      heading="이 피드백은 저장되지 않아요."
      question="그대로 진행할까요?"
      cancelLabel="로그인하기"
      confirmLabel="그대로 진행"
      confirmIcon="arrow"
      onCancel={onLogin}
      onConfirm={onContinue}
      onClose={onClose}
    >
      로그인하지 않은 상태라 분석 결과가 내 피드백에 남지 않아요.
      <br />
      로그인하면 받은 피드백을 언제든 다시 확인할 수 있어요.
    </ConfirmDialog>
  )
}
