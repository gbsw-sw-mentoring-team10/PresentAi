import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const PAGE_TITLES = {
  '/': '더 나은 발표의 시작',
  '/materials': '발표자료 입력',
  '/speech': '발표 피드백',
  '/analysis': '분석 진행',
  '/results': '발표자료 피드백',
  '/speech-results': '발표 피드백 결과',
}

const readRoute = () => window.location.hash.replace(/^#/, '') || '/'

export default function useHashRoute() {
  const [route, setRoute] = useState(readRoute)
  const pendingSection = useRef(null)

  useEffect(() => {
    const change = () => setRoute(readRoute())
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
    document.title = `${PAGE_TITLES[route] || '페이지를 찾을 수 없어요'} | PresentAi`
  }, [route])

  const navigate = useCallback((path) => {
    if (readRoute() === path) window.scrollTo({ top: 0, behavior: 'auto' })
    else window.location.hash = path
  }, [])

  const scrollSection = useCallback(
    (id) => {
      if (readRoute() === '/') {
        document.getElementById(id)?.scrollIntoView({ behavior: 'auto' })
        return
      }
      pendingSection.current = id
      navigate('/')
    },
    [navigate],
  )

  return { route, navigate, scrollSection }
}
