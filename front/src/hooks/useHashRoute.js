import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const PAGE_TITLES = {
  '/': '더 나은 발표의 시작',
  '/materials': '발표자료 입력',
  '/speech': '발표 피드백',
  '/analysis': '분석 진행',
  '/results': '발표자료 피드백',
  '/speech-results': '발표 피드백 결과',
  '/history': '내 피드백',
  '/mypage': '마이페이지',
}

// '/history/<id>' 경로에서 기록 id를 꺼냅니다.
export const historyRouteId = (route) => route.match(/^\/history\/([^/]+)$/)?.[1] ?? null

const pageTitle = (route) => PAGE_TITLES[route] || (historyRouteId(route) ? '피드백 상세' : null)

const readRoute = () => window.location.hash.replace(/^#/, '') || '/'

export default function useHashRoute() {
  const [route, setRoute] = useState(readRoute)
  const [activeSection, setActiveSection] = useState(null)
  const pendingSection = useRef(null)

  useEffect(() => {
    const change = () => {
      const nextRoute = readRoute()
      if (nextRoute !== '/') pendingSection.current = null
      setActiveSection(nextRoute === '/' ? pendingSection.current : null)
      setRoute(nextRoute)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (route === '/' && pendingSection.current) {
      document.getElementById(pendingSection.current)?.scrollIntoView({ behavior: 'auto' })
      pendingSection.current = null
    }
  }, [route])

  useEffect(() => {
    document.title = `${pageTitle(route) || '페이지를 찾을 수 없어요'} | PresentAi`
  }, [route])

  const navigate = useCallback((path) => {
    pendingSection.current = null
    setActiveSection(null)
    if (readRoute() === path) window.scrollTo({ top: 0, behavior: 'auto' })
    else window.location.hash = path
  }, [])

  const scrollSection = useCallback(
    (id) => {
      if (readRoute() === '/') {
        setActiveSection(id)
        document.getElementById(id)?.scrollIntoView({ behavior: 'auto' })
        return
      }
      navigate('/')
      pendingSection.current = id
    },
    [navigate],
  )

  return { route, activeSection: route === '/' ? activeSection : null, navigate, scrollSection }
}
