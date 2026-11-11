import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import Logo from '../ui/Logo.jsx'
import useMobileMenu from './useMobileMenu.js'
import '../../styles/header-nav.css'

export default function AppHeader({
  route,
  mode,
  navigate,
  openMember,
  scrollSection,
  onLogin,
  user,
  authBusy,
  onLogout,
}) {
  const { isOpen, close, toggle, headerRef, buttonRef } = useMobileMenu()
  const activeMaterial =
    route === '/materials' || route === '/results' || (route === '/analysis' && mode === 'material')
  const activeSpeech =
    route === '/speech' ||
    route === '/speech-results' ||
    (route === '/analysis' && mode === 'speech')
  const activeHistory = route === '/history' || route.startsWith('/history/')
  const activeMyPage = route === '/mypage'

  function handleNavigate(path) {
    close()
    navigate(path)
  }

  // 로그인이 필요한 화면은 App에서 이동 여부를 정합니다.
  function handleMember(path) {
    close()
    openMember(path)
  }

  function showHow() {
    close()
    scrollSection('how')
  }

  return (
    <header ref={headerRef} className="site-header">
      <div className="nav-wrap">
        <button
          className="logo-button"
          onClick={() => handleNavigate('/')}
          aria-label="PresentAi 홈"
        >
          <Logo responsive />
        </button>
        <nav id="main-navigation" className={isOpen ? 'is-open' : ''} aria-label="주 메뉴">
          <button
            className={activeMaterial ? 'active' : ''}
            onClick={() => handleNavigate('/materials')}
          >
            발표자료 피드백
          </button>
          <button
            className={activeSpeech ? 'active' : ''}
            onClick={() => handleNavigate('/speech')}
          >
            발표 피드백
          </button>
          <button onClick={() => showHow()}>이용 방법</button>
          <button
            className={activeHistory ? 'active' : ''}
            aria-current={activeHistory ? 'page' : undefined}
            onClick={() => handleMember('/history')}
          >
            내 피드백
          </button>
          <button
            className={`nav-mobile-only${activeMyPage ? ' active' : ''}`}
            aria-current={activeMyPage ? 'page' : undefined}
            onClick={() => handleMember('/mypage')}
          >
            마이페이지
          </button>
        </nav>
        <div className="nav-actions">
          <button
            className={`login-button mypage-button${activeMyPage ? ' active' : ''}`}
            aria-current={activeMyPage ? 'page' : undefined}
            onClick={() => handleMember('/mypage')}
          >
            마이페이지
          </button>
          <button
            className="login-button"
            disabled={authBusy}
            title={user?.email}
            onClick={() => {
              close()
              if (user) onLogout()
              else onLogin()
            }}
          >
            {authBusy ? '계정 확인 중' : user ? '로그아웃' : '로그인'}
          </button>
          <Button onClick={() => handleNavigate('/materials')}>시작하기</Button>
          <button
            ref={buttonRef}
            className="icon-button mobile-menu"
            aria-controls="main-navigation"
            aria-expanded={isOpen}
            aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={toggle}
          >
            <Icon name={isOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  )
}
