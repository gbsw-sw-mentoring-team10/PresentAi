import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import Logo from '../ui/Logo.jsx'
import useMobileMenu from './useMobileMenu.js'
import useNavIndicator from './useNavIndicator.js'
import '../../styles/header-nav.css'

export default function AppHeader({
  route,
  activeSection,
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
  const isHome = route === '/'
  const activeMaterial =
    route === '/materials' || route === '/results' || (route === '/analysis' && mode === 'material')
  const activeSpeech =
    route === '/speech' ||
    route === '/speech-results' ||
    (route === '/analysis' && mode === 'speech')
  const activeHistory = route === '/history' || route.startsWith('/history/')
  const activeMyPage = route === '/mypage'
  const activeHow = isHome && activeSection === 'how'
  const activeId = activeMaterial
    ? 'materials'
    : activeSpeech
      ? 'speech'
      : activeHow
        ? 'how'
        : activeHistory
          ? 'history'
          : activeMyPage
            ? 'mypage'
            : null
  const { navRef, indicatorRef, bind } = useNavIndicator(
    activeId,
    `${route}:${isOpen}:${user?.user_id || ''}`,
    { hoverOnly: isHome },
  )

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
    <header
      ref={headerRef}
      className={`site-header${isHome ? ' site-header-home' : ''}`}
      aria-busy={authBusy}
    >
      <div className="nav-wrap">
        <button
          className="logo-button"
          onClick={() => handleNavigate('/')}
          aria-label="PresentAi 홈"
        >
          <Logo responsive />
        </button>
        <nav
          ref={navRef}
          id="main-navigation"
          className={isOpen ? 'is-open' : ''}
          aria-label="주 메뉴"
        >
          <button
            {...bind('materials')}
            className={activeMaterial ? 'active' : ''}
            aria-current={activeMaterial ? 'page' : undefined}
            onClick={() => handleNavigate('/materials')}
          >
            발표자료 피드백
          </button>
          <button
            {...bind('speech')}
            className={activeSpeech ? 'active' : ''}
            aria-current={activeSpeech ? 'page' : undefined}
            onClick={() => handleNavigate('/speech')}
          >
            발표 피드백
          </button>
          <button
            {...bind('how')}
            className={activeHow ? 'active' : ''}
            aria-current={activeHow ? 'location' : undefined}
            onClick={showHow}
          >
            이용 방법
          </button>
          {!isHome && (
            <button
              {...bind('history')}
              className={activeHistory ? 'active' : ''}
              aria-current={activeHistory ? 'page' : undefined}
              onClick={() => handleMember('/history')}
            >
              내 피드백
            </button>
          )}
          {!isHome && user && (
            <button
              {...bind('mypage')}
              className={`nav-mobile-only${activeMyPage ? ' active' : ''}`}
              aria-current={activeMyPage ? 'page' : undefined}
              onClick={() => handleMember('/mypage')}
            >
              마이페이지
            </button>
          )}
          <span ref={indicatorRef} className="nav-indicator" aria-hidden="true" />
        </nav>
        <div className="nav-actions">
          {!isHome && (
            <>
              {user && (
                <button
                  className={`login-button mypage-button${activeMyPage ? ' active' : ''}`}
                  aria-current={activeMyPage ? 'page' : undefined}
                  onClick={() => handleMember('/mypage')}
                >
                  마이페이지
                </button>
              )}
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
            </>
          )}
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
