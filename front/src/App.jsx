import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import AppHeader from './components/layout/AppHeader.jsx'
import AppFooter from './components/layout/AppFooter.jsx'
import PageErrorBoundary from './components/layout/PageErrorBoundary.jsx'
import Button from './components/ui/Button.jsx'
import { example } from './data/examplePresentation.js'
import useFeedbackRequest from './features/feedback/useFeedbackRequest.js'
import useAuth from './features/auth/useAuth.js'
import useHashRoute from './hooks/useHashRoute.js'
import './styles/app.css'
import './styles/responsive.css'
import './styles/brand.css'
import './styles/slide-workspace.css'

const FeedbackPage = lazy(() => import('./pages/FeedbackPage.jsx'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage.jsx'))
const ExampleResultsPage = lazy(() => import('./pages/ExampleResultsPage.jsx'))
const FeedbackResultsPage = lazy(() => import('./pages/FeedbackResultsPage.jsx'))
const AuthModal = lazy(() => import('./features/auth/AuthModal.jsx'))

const EMPTY_FORM = { title: '', purpose: '', description: '', script: '', file: null, audio: null }

export default function App() {
  const { route, navigate: changeRoute, scrollSection } = useHashRoute()
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('material')
  const [resultKind, setResultKind] = useState(null)
  const [auth, setAuth] = useState(false)
  const account = useAuth()
  const { request, run: runFeedback, cancel: cancelFeedback } = useFeedbackRequest()

  useEffect(() => {
    if (route !== '/analysis') cancelFeedback()
  }, [route, cancelFeedback])

  useEffect(() => {
    if (route === '/analysis' && mode !== 'speech' && request.status === 'success')
      changeRoute('/results')
  }, [route, mode, request.status, changeRoute])

  const closeAuth = useCallback(() => setAuth(false), [])
  const navigate = useCallback(
    (path) => {
      if (path !== '/analysis') cancelFeedback()
      changeRoute(path)
    },
    [changeRoute, cancelFeedback],
  )

  function startExample() {
    setResultKind('example')
    setForm({ ...example, audio: null })
    setMode('material')
    navigate('/results')
  }

  function start(nextMode) {
    setMode(nextMode)
    setResultKind(nextMode === 'speech' ? 'example' : 'api')
    if (nextMode !== 'speech') runFeedback(form)
    navigate('/analysis')
  }

  async function logout() {
    if (await account.logout()) {
      cancelFeedback()
      setResultKind(null)
      setForm(EMPTY_FORM)
      navigate('/')
    }
  }

  function renderPage() {
    switch (route) {
      case '/':
        return <HomePage navigate={navigate} startExample={startExample} />
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
            onRetry={() => runFeedback(form)}
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
        if (resultKind === 'example') return <ExampleResultsPage navigate={navigate} />
        return (
          <div className="state-page">
            <h1>아직 분석 결과가 없어요.</h1>
            <p>자료를 입력하고 분석을 시작해 주세요.</p>
            <Button onClick={() => navigate('/materials')}>자료 입력하기</Button>
          </div>
        )
      case '/speech-results':
        return <ExampleResultsPage navigate={navigate} speech />
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
        mode={mode}
        navigate={navigate}
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
            <AuthModal onClose={closeAuth} onAuthenticate={account.authenticate} />
          </Suspense>
        </PageErrorBoundary>
      )}
    </>
  )
}
