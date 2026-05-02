import { Home, Plus, X } from 'lucide-react'

export type Tab =
  | { type: 'simulation'; id: string; name: string }
  | { type: 'comparison'; id: string; name: string; parentSimId: string }

type SubHeaderProps = {
  tabs:       Tab[]
  activeId:   string | null
  showNav:    boolean
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
  onHome:     () => void
  onNew:      () => void
}

export default function SubHeader({
  tabs,
  activeId,
  showNav,
  onTabClick,
  onTabClose,
  onHome,
  onNew,
}: SubHeaderProps) {
  return (
    <div className="w-full bg-carbon border-b border-border-default flex items-stretch h-10 shrink-0">

      {/* Home */}
      {showNav && (
        <button
          onClick={onHome}
          className="flex items-center justify-center w-10 border-r border-border-default text-dust hover:text-bone transition-colors shrink-0"
        >
          <Home size={14} />
        </button>
      )}

      {/* Tabs */}
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const active = tab.id === activeId
          return (
            <div
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={[
                'flex items-center gap-2 px-4 cursor-pointer select-none border-r border-border-default text-xs transition-colors',
                active
                  ? 'border-t-2 border-t-bone bg-graphite text-bone'
                  : 'border-t-2 border-t-transparent text-dust hover:text-bone hover:bg-graphite/50',
              ].join(' ')}
            >
              <span>{tab.name}</span>
              <button
                onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
                className="flex items-center text-dust hover:text-bone transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>

      {/* New simulation */}
      {showNav && (
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 border-r border-border-default text-dust hover:text-bone transition-colors shrink-0"
        >
          <Plus size={13} />
          <span className="text-xs">New Simulation</span>
        </button>
      )}

    </div>
  )
}
