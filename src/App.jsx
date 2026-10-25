import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, Icon, Logo } from './jjabary/components'
import { example } from './jjabary/data'
import Home from './important/Home'
import FeedbackForm from './important/FeedbackForm'
import Analysis from './important/Analysis'
import Results from './important/Results'
import Auth from './jjabary/Auth'
import ApiResults from './important/ApiResults'
import useFeedback from './jjabary/useFeedback'
import './App.css'
import './responsive.css'
import './brand.css'

const emptyForm = { title: '', purpose: '', description: '', script: '', file: null, audio: null }
const routeFromHash = () => window.location.hash.replace(/^#/, '') || '/'

export default function App() {
  const [route, setRoute] = useState(routeFromHash)
  const [form, setForm] = useState(emptyForm)
  const [mode, setMode] = useState('material')
  const [resultKind, setResultKind] = useState(null)
  const { request, run: runFeedback, cancel: cancelFeedback } = useFeedback()
  const [auth, setAuth] = useState(false)
  const [menu, setMenu] = useState(false)
  const headerRef = useRef(null)
  const menuButtonRef = useRef(null)
  useEffect(() => {
    if (!menu) return
    const closeOutside = e => { if (!headerRef.current?.contains(e.target)) setMenu(false) }
    const closeEscape = e => { if (e.key === 'Escape') { setMenu(false); menuButtonRef.current?.focus() } }
    const desktop = window.matchMedia('(min-width: 801px)')
    const closeDesktop = e => { if (e.matches) setMenu(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    desktop.addEventListener('change', closeDesktop)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
      desktop.removeEventListener('change', closeDesktop)
    }
  }, [menu])
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [route])
  const closeAuth = useCallback(() => setAuth(false), [])
  useEffect(() => { if (route !== '/analysis') cancelFeedback() }, [route, cancelFeedback])
  useEffect(() => { const change = () => { setRoute(routeFromHash()); setMenu(false) }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change) }, [])
  useEffect(() => { const titles = { '/': '더 나은 발표의 시작', '/materials': '발표자료 입력', '/speech': '발표 피드백', '/analysis': '분석 진행', '/results': '발표자료 피드백', '/speech-results': '발표 피드백 결과' }; document.title = `${titles[route] || '페이지를 찾을 수 없어요'} | PresentAi` }, [route])
  const navigate = useCallback(path => { if (path !== '/analysis') cancelFeedback(); if (routeFromHash() === path) window.scrollTo({ top: 0, behavior: 'smooth' }); else window.location.hash = path; setMenu(false) }, [cancelFeedback])
  function startExample() { setResultKind('example'); setForm({ ...example, audio: null }); setMode('material'); navigate('/results') }
  function start(nextMode) { setMode(nextMode); setResultKind(nextMode === 'speech' ? 'example' : 'api'); if (nextMode !== 'speech') runFeedback(form); navigate('/analysis') }
  function scrollSection(id) { if (route !== '/') { navigate('/'); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80) } else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenu(false) }
  const activeMaterial = route === '/materials' || route === '/results' || route === '/analysis' && mode === 'material'
  const activeSpeech = route === '/speech' || route === '/speech-results' || route === '/analysis' && mode === 'speech'
  return <><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content').focus() }}>본문으로 건너뛰기</a><header ref={headerRef} className="site-header"><div className="nav-wrap"><button className="logo-button" onClick={() => navigate('/')} aria-label="PresentAi 홈"><Logo responsive /></button><nav id="main-navigation" className={menu ? 'is-open' : ''} aria-label="주 메뉴"><button className={activeMaterial ? 'active' : ''} onClick={() => navigate('/materials')}>발표자료 피드백</button><button className={activeSpeech ? 'active' : ''} onClick={() => navigate('/speech')}>발표 피드백 <span className="nav-soon">SOON</span></button><button onClick={() => scrollSection('how')}>이용 방법</button></nav><div className="nav-actions"><button className="login-button" onClick={() => { setMenu(false); setAuth(true) }}>로그인</button><Button onClick={() => navigate('/materials')}>시작하기</Button><button ref={menuButtonRef} className="icon-button mobile-menu" aria-controls="main-navigation" aria-expanded={menu} aria-label={menu ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setMenu(x => !x)}><Icon name={menu ? 'close' : 'menu'} /></button></div></div></header><main id="main-content" tabIndex={-1}>
    {route === '/' ? <Home navigate={navigate} startExample={startExample} /> : route === '/materials' || route === '/speech' ? <FeedbackForm key={route} mode={route === '/speech' ? 'speech' : 'material'} form={form} setForm={setForm} navigate={navigate} start={start} /> : route === '/analysis' ? <Analysis form={form} mode={mode} navigate={navigate} request={request} onRetry={() => runFeedback(form)} /> : route === '/results' ? (resultKind === 'api' && request.status === 'success' ? <ApiResults key={request.submission.title + request.result.feedback} request={request} navigate={navigate} /> : resultKind === 'example' ? <Results navigate={navigate} /> : <div className="state-page"><h1>아직 분석 결과가 없어요.</h1><p>자료를 입력하고 분석을 시작해 주세요.</p><Button onClick={() => navigate('/materials')}>자료 입력하기</Button></div>) : route === '/speech-results' ? <Results navigate={navigate} speech /> : <div className="state-page"><span className="section-kicker">404</span><h1>이 페이지는 아직 비어 있어요.</h1><p>홈에서 다시 시작해 주세요.</p><Button onClick={() => navigate('/')}>홈으로 돌아가기</Button></div>}
    </main><footer className="site-footer"><div className="section-wrap"><div><button className="logo-button" onClick={() => navigate('/')}><Logo /></button><p>더 잘 전하고 싶은, 모든 생각을 위해.</p></div><div className="footer-links"><button onClick={() => navigate('/materials')}>자료 피드백</button><button onClick={() => navigate('/speech')}>발표 피드백</button><button onClick={() => scrollSection('how')}>이용 방법</button></div><div className="footer-bottom"><span>© {new Date().getFullYear()} PresentAi</span><span>Made for your next great presentation.</span><span className="prototype-label">서비스 미리보기</span></div></div></footer>{auth && <Auth onClose={closeAuth} />}</>
}
