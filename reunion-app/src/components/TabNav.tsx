import { TABS, type TabId } from '../lib/tabs'

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
}

export function TabNav({ active, onChange }: Props) {
  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
