import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import AccountTabs from '../features/account/AccountTabs.jsx'
import ChangeEmailModal from '../features/account/ChangeEmailModal.jsx'
import ChangePasswordModal from '../features/account/ChangePasswordModal.jsx'
import DeleteAccountModal from '../features/account/DeleteAccountModal.jsx'
import ProfilePanel from '../features/account/ProfilePanel.jsx'
import RecordPanel from '../features/account/RecordPanel.jsx'
import { getAccountProfile } from '../features/account/accountApi.js'
import { formatKoreanDate, summarizeFeedbackHistory } from '../features/account/accountRecord.js'
import HistoryLoadState from '../features/history/HistoryLoadState.jsx'
import { loadFeedbackHistory } from '../features/history/historyApi.js'
import useHistoryRequest from '../features/history/useHistoryRequest.js'
import useToastMessage from '../hooks/useToastMessage.js'
import '../styles/mypage.css'

export default function MyPage({ user, navigate, onAccountDeleted, onLogin }) {
  if (!user)
    return (
      <div className="state-page">
        <span className="section-kicker">MY PAGE</span>
        <h1>로그인하면 마이페이지를 볼 수 있어요.</h1>
        <p>계정 정보와 지금까지 받은 피드백 기록을 한곳에서 확인해 보세요.</p>
        {onLogin ? (
          <Button onClick={onLogin}>로그인하기</Button>
        ) : (
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        )}
      </div>
    )
  return (
    <AccountView
      user={user}
      navigate={navigate}
      onLogin={onLogin}
      onAccountDeleted={onAccountDeleted}
    />
  )
}

function AccountView({ user, navigate, onLogin, onAccountDeleted }) {
  const [tab, setTab] = useState('profile')
  const [dialog, setDialog] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const { message: toast, show: showToast } = useToastMessage()
  const history = useHistoryRequest(loadFeedbackHistory, user)
  const summary = summarizeFeedbackHistory(history.data)
  const loading = !profile && !loadError
  // 서버가 돌려준 이메일을 먼저 쓰고, 없으면 로그인한 계정의 이메일을 이름으로 보여 줘요.
  const email = profile?.email || user.email

  useEffect(() => {
    const controller = new AbortController()
    getAccountProfile({ owner: user?.email, signal: controller.signal })
      .then((value) => {
        setProfile(value)
        setLoadError('')
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError('계정 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      })
    return () => controller.abort()
  }, [reload, user?.email])

  const closeDialog = useCallback(() => setDialog(null), [])

  function handleChanged(value, notice) {
    // 응답에 빠진 값은 기존 정보를 그대로 둬요.
    const changed = Object.entries(value || {}).filter(([, item]) => item != null)
    setProfile((current) => ({ ...current, ...Object.fromEntries(changed) }))
    showToast(notice)
  }

  return (
    <div className="mypage section-wrap">
      <div className="page-heading">
        <div>
          <span className="section-kicker">MY PAGE</span>
          <h1 className="mypage-name">{email}</h1>
          <p>
            {formatKoreanDate(profile?.createdAt)
              ? `${formatKoreanDate(profile.createdAt)}부터 PresentAi와 함께하고 있어요. `
              : ''}
            {history.status === 'success'
              ? `지금까지 피드백을 ${summary.total}번 받았어요.`
              : history.status === 'loading'
                ? '피드백 기록을 확인하고 있어요.'
                : '피드백 기록을 불러오지 못했어요.'}
          </p>
        </div>
      </div>
      {loadError && (
        <div className="auth-message mypage-load-error" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setLoadError('')
              setReload((value) => value + 1)
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
      <AccountTabs tab={tab} onTabChange={setTab} />
      <section
        className="result-panel mypage-panel"
        role="tabpanel"
        id={`mypage-panel-${tab}`}
        aria-labelledby={`mypage-tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'profile' ? (
          <ProfilePanel email={email} profile={profile} loading={loading} onOpen={setDialog} />
        ) : history.status !== 'success' ? (
          <HistoryLoadState request={history} onLogin={onLogin} />
        ) : (
          <RecordPanel
            summary={summary}
            profile={profile}
            loading={loading}
            onViewHistory={() => navigate('/history')}
          />
        )}
      </section>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
      {dialog === 'email' && (
        <ChangeEmailModal
          currentEmail={email}
          onClose={closeDialog}
          onChanged={(value) => handleChanged(value, '이메일을 바꿨어요.')}
        />
      )}
      {dialog === 'password' && (
        <ChangePasswordModal
          onClose={closeDialog}
          onChanged={(value) => handleChanged(value, '비밀번호를 바꿨어요.')}
        />
      )}
      {dialog === 'delete' && (
        <DeleteAccountModal
          email={email}
          onClose={closeDialog}
          onDeleted={() => {
            setDialog(null)
            onAccountDeleted?.()
          }}
        />
      )}
    </div>
  )
}
