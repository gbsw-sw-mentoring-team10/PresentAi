import Icon from '../../components/ui/Icon.jsx'

const ACCOUNT_TABS = [
  { id: 'profile', name: '프로필', icon: 'user' },
  { id: 'record', name: '기록', icon: 'clock' },
]

export default function AccountTabs({ tab, onTabChange }) {
  function handleArrowKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = ACCOUNT_TABS.findIndex((item) => item.id === tab)
    let nextIndex = 0
    if (event.key === 'End') nextIndex = ACCOUNT_TABS.length - 1
    else if (event.key !== 'Home') {
      const direction = event.key === 'ArrowRight' ? 1 : -1
      nextIndex = (currentIndex + direction + ACCOUNT_TABS.length) % ACCOUNT_TABS.length
    }
    const nextTab = ACCOUNT_TABS[nextIndex]
    onTabChange(nextTab.id)
    document.getElementById(`mypage-tab-${nextTab.id}`)?.focus()
  }

  return (
    <div className="result-tabs mypage-tabs" role="tablist" aria-label="마이페이지 메뉴">
      {ACCOUNT_TABS.map((item) => (
        <button
          key={item.id}
          role="tab"
          id={`mypage-tab-${item.id}`}
          aria-controls={tab === item.id ? `mypage-panel-${item.id}` : undefined}
          aria-selected={tab === item.id}
          tabIndex={tab === item.id ? 0 : -1}
          className={tab === item.id ? 'active' : ''}
          onKeyDown={handleArrowKey}
          onClick={() => onTabChange(item.id)}
        >
          <Icon name={item.icon} size={17} />
          {item.name}
        </button>
      ))}
    </div>
  )
}
