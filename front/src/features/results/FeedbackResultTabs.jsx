import Icon from '../../components/ui/Icon.jsx'

export default function FeedbackResultTabs({ tab, setTab, tabsRef }) {
  return (
    <div ref={tabsRef} className="result-tabs" role="tablist" aria-label="피드백 종류">
      {[
        ['overview', '전체 요약', 'grid'],
        ['slides', '슬라이드별 피드백', 'slides'],
      ].map(([id, name, icon]) => (
        <button
          key={id}
          id={`api-tab-${id}`}
          role="tab"
          aria-controls={`api-panel-${id}`}
          aria-selected={tab === id}
          tabIndex={tab === id ? 0 : -1}
          className={tab === id ? 'active' : ''}
          onClick={() => setTab(id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault()
              const next = id === 'overview' ? 'slides' : 'overview'
              setTab(next)
              document.getElementById(`api-tab-${next}`)?.focus()
            }
          }}
        >
          <Icon name={icon} size={17} />
          {name}
        </button>
      ))}
    </div>
  )
}
