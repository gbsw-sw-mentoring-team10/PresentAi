import { useLayoutEffect, useRef } from 'react'
import Logo from '../ui/Logo.jsx'

export default function AppFooter({ navigate, scrollSection }) {
  const footerRef = useRef(null)

  useLayoutEffect(() => {
    const footer = footerRef.current
    const rootStyle = document.documentElement.style
    const previousHeight = rootStyle.getPropertyValue('--site-footer-height')
    // 줄바꿈·확대/축소로 높이가 달라져도 마지막 콘텐츠가 푸터에 가리지 않게 합니다.
    const measure = () => {
      rootStyle.setProperty('--site-footer-height', `${footer.getBoundingClientRect().height}px`)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(footer)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      if (previousHeight) rootStyle.setProperty('--site-footer-height', previousHeight)
      else rootStyle.removeProperty('--site-footer-height')
    }
  }, [])

  return (
    <footer ref={footerRef} className="site-footer">
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
      </div>
    </footer>
  )
}
