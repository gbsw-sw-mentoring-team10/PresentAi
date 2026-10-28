import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Home from './important/Home.jsx'
import AppHeader from './jjabary/AppHeader.jsx'
import AppFooter from './jjabary/AppFooter.jsx'
import PageBoundary from './jjabary/PageBoundary.jsx'
import { Button } from './jjabary/components.jsx'
import { example } from './jjabary/data.js'
import useFeedback from './jjabary/useFeedback.js'
import useHashRoute from './jjabary/useHashRoute.js'
import './App.css'
import './responsive.css'
import './brand.css'

const FeedbackForm = lazy(() => import('./important/FeedbackForm.jsx'))
const Analysis = lazy(() => import('./important/Analysis.jsx'))
const Results = lazy(() => import('./important/Results.jsx'))
const ApiResults = lazy(() => import('./important/ApiResults.jsx'))
const Auth = lazy(() => import('./jjabary/Auth.jsx'))

const EMPTY_FORM = { title: '', purpose: '', description: '', script: '', file: null, audio: null }

export default function App() {
  const { route, navigate: changeRoute, scrollSection } = useHashRoute()
  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState('material')
  const [resultKind, setResultKind] = useState(null)
  const [auth, setAuth] = useState(false)
  const { request, run: runFeedback, cancel: cancelFeedback } = useFeedback()

  useEffect(() => {
    if (route !== '/analysis') cancelFeedback()
  }, [route, cancelFeedback])

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

  function renderPage() {
    switch (route) {
      case '/':
        return <Home navigate={navigate} startExample={startExample} />
      case '/materials':
      case '/speech':
        return (
          <FeedbackForm
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
          <Analysis
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
            <ApiResults
              key={request.submission.title + request.result.feedback}
              request={request}
              navigate={navigate}
            />
          )
        }
        if (resultKind === 'example') return <Results navigate={navigate} />
        return (
          <div className="state-page">
            <h1>아직 분석 결과가 없어요.</h1>
            <p>자료를 입력하고 분석을 시작해 주세요.</p>
            <Button onClick={() => navigate('/materials')}>자료 입력하기</Button>
          </div>
        )
      case '/speech-results':
        return <Results navigate={navigate} speech />
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
      />
      <main id="main-content" tabIndex={-1}>
        <PageBoundary key={route}>
          <Suspense
            fallback={
              <div className="state-page" role="status">
                <p>화면을 불러오고 있어요.</p>
              </div>
            }
          >
            {renderPage()}
          </Suspense>
        </PageBoundary>
      </main>
      <AppFooter navigate={navigate} scrollSection={scrollSection} />
      {auth && (
        <PageBoundary key="auth">
          <Suspense fallback={null}>
            <Auth onClose={closeAuth} />
          </Suspense>
        </PageBoundary>
      )}
    </>
  )
}
