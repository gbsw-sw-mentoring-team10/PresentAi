import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Icon, Stepper } from '../jjabary/components.jsx'
import { buildExampleReport, downloadTextFile } from '../jjabary/reports.js'
import useTransientMessage from '../jjabary/useTransientMessage.js'
import OverviewPanel from '../jjabary/results/OverviewPanel.jsx'
import SlidesPanel from '../jjabary/results/SlidesPanel.jsx'
import FlowPanel from '../jjabary/results/FlowPanel.jsx'
import FactsPanel from '../jjabary/results/FactsPanel.jsx'
import SpeechResults from '../jjabary/results/SpeechResults.jsx'
import { example, slides } from '../jjabary/data.js'

const RESULT_TABS = [
  { id: 'overview', name: '전체 요약', icon: 'grid' },
  { id: 'slides', name: '슬라이드별 피드백', icon: 'slides' },
  { id: 'flow', name: '논리와 흐름', icon: 'flow' },
  { id: 'facts', name: '정보 확인', icon: 'shield' },
]

export default function Results({ navigate, speech = false }) {
  const [tab, setTab] = useState('overview')
  const [selected, setSelected] = useState(3)
  const [filter, setFilter] = useState('all')
  const [resolved, setResolved] = useState([])
  const { message: toast, show: showToast } = useTransientMessage()
  const tabsRef = useRef(null)
  const slidesRef = useRef(null)
  const pendingDetailScroll = useRef(false)
  useLayoutEffect(() => {
    // Reveal the selected item without moving the whole page vertically.
    for (const list of [tabsRef.current, slidesRef.current]) {
      const item = list?.querySelector('[aria-selected="true"], [aria-current="true"]')
      if (!item || list.scrollWidth <= list.clientWidth) continue
      const bounds = list.getBoundingClientRect()
      const itemBounds = item.getBoundingClientRect()
      if (itemBounds.left < bounds.left || itemBounds.right > bounds.right) {
        list.scrollLeft += itemBounds.left - bounds.left - (list.clientWidth - itemBounds.width) / 2
      }
    }
    if (pendingDetailScroll.current && tabsRef.current) {
      pendingDetailScroll.current = false
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({
        top: window.scrollY + tabsRef.current.getBoundingClientRect().top - 90,
        behavior: reduced ? 'instant' : 'smooth',
      })
    }
  }, [tab, selected, filter])
  const slide = slides.find((s) => s.id === selected)
  function toggle(id) {
    setResolved((x) => (x.includes(id) ? x.filter((v) => v !== id) : [...x, id]))
  }
  function openSlide(id) {
    pendingDetailScroll.current = true
    setSelected(id)
    setTab('slides')
  }
  function exportReport() {
    downloadTextFile(buildExampleReport(example, slides, speech), 'presentai-example-feedback.txt')
    showToast('예시 피드백 보고서를 내려받았어요.')
  }

  return (
    <div className="results-page section-wrap">
      <div className="result-topline">
        <button className="back-link" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          <Icon name="back" size={16} />
          입력 화면으로
        </button>
        <Stepper current={3} />
      </div>
      <div className="page-heading">
        <div>
          <span className="section-kicker">A CLEARER STORY. A STRONGER YOU.</span>
          <h1>{speech ? '말을 돌아보면, 전달이 달라져요.' : '좋은 발표에 한 걸음 더 가까이.'}</h1>
          <p>
            {speech
              ? '대본과 리허설을 비교하고, 다음 연습의 방향을 찾아보세요.'
              : '지금 잘하고 있는 것부터, 더 다듬으면 좋을 부분까지.'}
          </p>
        </div>
        <Button variant="outline" icon="download" onClick={exportReport}>
          보고서 받기
        </Button>
      </div>
      <div className="example-banner">
        <span className="tag tag-yellow">예시 결과</span>
        <p>
          아래 내용은 <b>‘2026 하반기 서비스 로드맵’</b> 예시 자료의 피드백입니다. 선택한 파일의
          실제 분석 결과가 아닙니다.
        </p>
      </div>
      <div className="result-meta">
        <div>
          <small>발표 제목</small>
          <strong>{example.title}</strong>
        </div>
        <div>
          <small>발표 목적</small>
          <span>{example.purpose}</span>
        </div>
        <div>
          <small>{speech ? '예시 음성' : '예시 자료'}</small>
          <span>
            <Icon name={speech ? 'mic' : 'file'} size={16} />
            {speech ? '리허설_1차.m4a' : example.file.name}
          </span>
        </div>
      </div>
      {speech ? (
        <SpeechResults />
      ) : (
        <>
          <div ref={tabsRef} className="result-tabs" role="tablist" aria-label="피드백 종류">
            {RESULT_TABS.map((t) => (
              <button
                role="tab"
                id={`tab-${t.id}`}
                aria-controls="result-panel"
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    const ids = RESULT_TABS.map((t) => t.id)
                    const next = ids[(ids.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : 3)) % 4]
                    setTab(next)
                    document.getElementById(`tab-${next}`)?.focus()
                  }
                }}
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={17} />
                {t.name}
                {t.id === 'facts' && <span>1</span>}
              </button>
            ))}
          </div>
          <div
            id="result-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className="result-panel"
          >
            {tab === 'overview' && (
              <OverviewPanel
                resolved={resolved}
                toggle={toggle}
                openSlide={openSlide}
                onShowSlides={() => setTab('slides')}
              />
            )}
            {tab === 'slides' && (
              <SlidesPanel
                slidesRef={slidesRef}
                filter={filter}
                setFilter={setFilter}
                selected={selected}
                setSelected={setSelected}
                slide={slide}
              />
            )}
            {tab === 'flow' && <FlowPanel />}
            {tab === 'facts' && (
              <FactsPanel resolved={resolved} toggle={toggle} openSlide={openSlide} />
            )}
          </div>
        </>
      )}
      <div className="result-bottom-cta">
        <div>
          <span>한 번의 점검, 더 나은 한 번의 발표.</span>
          <h3>다음 자료도 함께 다듬어 볼까요?</h3>
        </div>
        <Button variant="yellow" onClick={() => navigate(speech ? '/speech' : '/materials')}>
          {speech ? '다시 연습하기' : '다른 자료 점검하기'}
        </Button>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}
