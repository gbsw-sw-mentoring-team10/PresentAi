import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import AppHeader from './components/layout/AppHeader.jsx'
import AppFooter from './components/layout/AppFooter.jsx'
import PageErrorBoundary from './components/layout/PageErrorBoundary.jsx'
import Button from './components/ui/Button.jsx'
import useFeedbackRequest from './features/feedback/useFeedbackRequest.js'
import useSpeechRequest from './features/speech/useSpeechRequest.js'
import {
  hasLeftFormFlow,
  prepareSubmission,
  shouldResetForm,
} from './features/feedback/exampleForm.js'
import useAuth from './features/auth/useAuth.js'
import { LoginRequiredModal, LoginRequiredPage } from './features/auth/LoginRequired.jsx'
import useHashRoute, { historyRouteId } from './hooks/useHashRoute.js'
import './styles/app.css'
import './styles/responsive.css'
import './styles/brand.css'
import './styles/slide-workspace.css'

const FeedbackPage = lazy(() => import('./pages/FeedbackPage.jsx'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage.jsx'))
const SpeechResultsPage = lazy(() => import('./pages/SpeechResultsPage.jsx'))
const FeedbackResultsPage = lazy(() => import('./pages/FeedbackResultsPage.jsx'))
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'))
const HistoryDetailPage = lazy(() => import('./pages/HistoryDetailPage.jsx'))
const MyPage = lazy(() => import('./pages/MyPage.jsx'))
const AuthModal = lazy(() => import('./features/auth/AuthModal.jsx'))

const EMPTY_FORM = { title: '', purpose: '', description: '', script: '', file: null, audio: null }

export default function App() {
  const { route, activeSection, navigate: changeRoute, scrollSection } = useHashRoute()
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('material')
  const [resultKind, setResultKind] = useState(null)
  const [auth, setAuth] = useState(false)
  const [loginNotice, setLoginNotice] = useState(false)
  const [afterLogin, setAfterLogin] = useState(null)
  const account = useAuth()
  const { request, run: runFeedback, cancel: cancelFeedback } = useFeedbackRequest()
  const {
    speech: speechRequest,
    run: runSpeech,
    cancel: cancelSpeech,
    retryPronunciation,
  } = useSpeechRequest()
  const [formRoute, setFormRoute] = useState(route)
  const [leftFlow, setLeftFlow] = useState(false)

  // 다른 화면을 거쳐 입력 화면에 들어오면 이전 입력을 비웁니다.
  if (formRoute !== route) {
    setFormRoute(route)
    if (shouldResetForm(formRoute, route, mode, leftFlow)) setForm(EMPTY_FORM)
    setLeftFlow(hasLeftFormFlow(route, leftFlow))
  }

  useEffect(() => {
    if (route !== '/analysis') cancelFeedback()
    if (route !== '/analysis' && route !== '/speech-results') cancelSpeech()
  }, [route, cancelFeedback, cancelSpeech])

  const closeAuth = useCallback(() => {
    setAuth(false)
    setAfterLogin(null)
  }, [])
  const closeLoginNotice = useCallback(() => {
    setLoginNotice(false)
    setAfterLogin(null)
  }, [])
  const navigate = useCallback(
    (path) => {
      if (path !== '/analysis') cancelFeedback()
      if (path !== '/analysis' && path !== '/speech-results') cancelSpeech()
      changeRoute(path)
    },
    [changeRoute, cancelFeedback, cancelSpeech],
  )

  function start(nextMode) {
    // 수정한 자료에 남은 예시 파일은 분석 화면과 요청에서 뺍니다.
    const submitted = prepareSubmission(form, nextMode)
    if (submitted !== form) setForm(submitted)
    setMode(nextMode)
    setResultKind(nextMode === 'speech' ? null : 'api')
    if (nextMode === 'speech') runSpeech(submitted)
    else runFeedback(submitted)
    navigate('/analysis')
  }

  // 로그인이 필요한 화면은 로그인 전이면 이동하지 않고 안내 팝업을 띄웁니다.
  function openMember(path) {
    if (account.user || account.busy) {
      navigate(path)
      return
    }
    setAfterLogin(path)
    setLoginNotice(true)
  }

  function loginFromNotice() {
    setLoginNotice(false)
    setAuth(true)
  }

  async function authenticate(...credentials) {
    await account.authenticate(...credentials)
    if (afterLogin) navigate(afterLogin)
  }

  function resetSession() {
    cancelFeedback()
    cancelSpeech()
    setResultKind(null)
    setForm(EMPTY_FORM)
    navigate('/')
  }

  async function logout() {
    if (await account.logout()) resetSession()
  }

  function deleteAccount() {
    account.clearUser()
    resetSession()
  }

  function renderMember(page) {
    if (account.user) return page
    if (account.busy)
      return (
        <div className="state-page" role="status">
          <p>계정 정보를 확인하고 있어요.</p>
        </div>
      )
    return <LoginRequiredPage onLogin={() => setAuth(true)} />
  }

  function renderPage() {
    const historyId = historyRouteId(route)
    if (historyId)
      return renderMember(
        <HistoryDetailPage
          key={`${account.user?.user_id}:${historyId}`}
          id={historyId}
          user={account.user}
          navigate={navigate}
          onLogin={() => setAuth(true)}
        />,
      )
    switch (route) {
      case '/':
        return <HomePage navigate={navigate} scrollSection={scrollSection} />
      case '/materials':
      case '/speech':
        return (
          <FeedbackPage
            key={route}
            mode={route === '/speech' ? 'speech' : 'material'}
            form={form}
            setForm={setForm}
            navigate={navigate}
            start={start}
          />
        )
      case '/analysis':
        return (
          <AnalysisPage
            form={form}
            mode={mode}
            navigate={navigate}
            request={request}
            speechRequest={speechRequest}
            onRetry={() => (mode === 'speech' ? runSpeech(form) : runFeedback(form))}
          />
        )
      case '/results':
        if (resultKind === 'api' && request.status === 'success') {
          return (
            <FeedbackResultsPage
              key={request.submission.title + request.result.feedback}
              request={request}
              navigate={navigate}
            />
          )
        }
        return (
          <div className="state-page">
            <h1>아직 분석 결과가 없어요.</h1>
            <p>자료를 입력하고 분석을 시작해 주세요.</p>
            <Button onClick={() => navigate('/materials')}>자료 입력하기</Button>
          </div>
        )
      case '/speech-results':
        return (
          <SpeechResultsPage
            speech={speechRequest}
            navigate={navigate}
            onRetryPronunciation={retryPronunciation}
          />
        )
      case '/history':
        return renderMember(
          <HistoryPage user={account.user} navigate={navigate} onLogin={() => setAuth(true)} />,
        )
      case '/mypage':
        return renderMember(
          <MyPage
            key={account.user?.user_id}
            user={account.user}
            navigate={navigate}
            onLogin={() => setAuth(true)}
            onAccountDeleted={deleteAccount}
          />,
        )
      default:
        return (
          <div className="state-page">
            <span className="section-kicker">404</span>
            <h1>이 페이지는 아직 비어 있어요.</h1>
            <p>홈에서 다시 시작해 주세요.</p>
            <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
          </div>
        )
    }
  }

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        본문으로 건너뛰기
      </a>
      <AppHeader
        route={route}
        activeSection={activeSection}
        mode={mode}
        navigate={navigate}
        openMember={openMember}
        scrollSection={scrollSection}
        onLogin={() => setAuth(true)}
        user={account.user}
        authBusy={account.busy}
        onLogout={logout}
      />
      {account.error && (
        <p className="auth-message" role="alert">
          {account.error}
        </p>
      )}
      <main id="main-content" tabIndex={-1}>
        <PageErrorBoundary key={route}>
          <Suspense
            fallback={
              <div className="state-page" role="status">
                <p>화면을 불러오고 있어요.</p>
              </div>
            }
          >
            {renderPage()}
          </Suspense>
        </PageErrorBoundary>
      </main>
      <AppFooter navigate={navigate} scrollSection={scrollSection} />
      {auth && (
        <PageErrorBoundary key="auth">
          <Suspense fallback={null}>
            <AuthModal onClose={closeAuth} onAuthenticate={authenticate} />
          </Suspense>
        </PageErrorBoundary>
      )}
      {loginNotice && <LoginRequiredModal onClose={closeLoginNotice} onLogin={loginFromNotice} />}
    </>
  )
}
