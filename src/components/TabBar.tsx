import { useState } from 'react'
import { Home, X, Plus } from 'lucide-react'

type Tab = { id: string; name: string }

const PLACEHOLDER_TABS: Tab[] = [
  { id: '1', name: 'ETH LP Simulation' },
]

type TabBarProps = {
  onViewChange?: (view: 'home' | 'simulation') => void
}

export default function TabBar({ onViewChange }: TabBarProps) {
  const [tabs, setTabs] = useState<Tab[]>(PLACEHOLDER_TABS)
  const [activeView, setActiveView] = useState<string>('1')

  // Hidden entirely when no simulations are open
  if (tabs.length === 0) return null

  const isHome = activeView === 'home'

  const handleHomeClick = () => {
    setActiveView('home')
    onViewChange?.('home')
  }

  const handleTabClick = (id: string) => {
    setActiveView(id)
    onViewChange?.('simulation')
  }

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const remaining = tabs.filter(t => t.id !== id)
    setTabs(remaining)
    if (activeView === id) {
      const next = remaining.length > 0 ? remaining[remaining.length - 1].id : 'home'
      setActiveView(next)
      onViewChange?.(next === 'home' ? 'home' : 'simulation')
    }
  }

  return (
    <div className="w-full bg-carbon border-b border-border-default flex items-stretch h-10">

      {/* Home icon — hidden when already on Home */}
      {!isHome && (
        <button
          onClick={handleHomeClick}
          className="flex items-center justify-center w-10 border-r border-border-default text-dust hover:text-bone transition-colors shrink-0"
        >
          <Home size={14} />
        </button>
      )}

      {/* Simulation tabs */}
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const active = activeView === tab.id
          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={[
                'flex items-center gap-2 px-3 cursor-pointer text-xs select-none transition-colors',
                active
                  ? 'bg-graphite border border-border-default text-bone'
                  : 'border-r border-border-default text-dust hover:text-bone',
              ].join(' ')}
            >
              <span>{tab.name}</span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className="flex items-center text-dust hover:text-bone transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>

      {/* New simulation — hidden when on Home */}
      {!isHome && (
        <button className="flex items-center justify-center w-10 text-dust hover:text-bone transition-colors shrink-0">
          <Plus size={14} />
        </button>
      )}

    </div>
  )
}
