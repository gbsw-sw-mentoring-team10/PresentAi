import { Logo } from './components.jsx'

export default function AppFooter({ navigate, scrollSection }) {
  return (
    <footer className="site-footer">
      <div className="section-wrap">
        <div>
          <button className="logo-button" onClick={() => navigate('/')}>
            <Logo />
          </button>
          <p>더 잘 전하고 싶은, 모든 생각을 위해.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => navigate('/materials')}>자료 피드백</button>
          <button onClick={() => navigate('/speech')}>발표 피드백</button>
          <button onClick={() => scrollSection('how')}>이용 방법</button>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PresentAi</span>
          <span>Made for your next great presentation.</span>
          <span className="prototype-label">서비스 미리보기</span>
        </div>
      </div>
    </footer>
  )
}
