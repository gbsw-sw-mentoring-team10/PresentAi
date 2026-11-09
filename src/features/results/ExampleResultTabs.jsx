import Icon from '../../components/ui/Icon.jsx'

const RESULT_TABS = [
  { id: 'overview', name: '전체 요약', icon: 'grid' },
  { id: 'slides', name: '슬라이드별 피드백', icon: 'slides' },
  { id: 'flow', name: '논리와 흐름', icon: 'flow' },
  { id: 'facts', name: '정보 확인', icon: 'shield' },
]

export default function ExampleResultTabs({ tab, tabsRef, onTabChange }) {
  function handleArrowKey(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()

    const currentIndex = RESULT_TABS.findIndex((item) => item.id === tab)
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + direction + RESULT_TABS.length) % RESULT_TABS.length
    const nextTab = RESULT_TABS[nextIndex]
    onTabChange(nextTab.id)
    document.getElementById(`tab-${nextTab.id}`)?.focus()
  }

  return (
    <div ref={tabsRef} className="result-tabs" role="tablist" aria-label="피드백 종류">
      {RESULT_TABS.map((item) => (
        <button
          key={item.id}
          role="tab"
          id={`tab-${item.id}`}
          aria-controls="result-panel"
          aria-selected={tab === item.id}
          tabIndex={tab === item.id ? 0 : -1}
          className={tab === item.id ? 'active' : ''}
          onKeyDown={handleArrowKey}
          onClick={() => onTabChange(item.id)}
        >
          <Icon name={item.icon} size={17} />
          {item.name}
          {item.id === 'facts' && <span>1</span>}
        </button>
      ))}
    </div>
  )
}
