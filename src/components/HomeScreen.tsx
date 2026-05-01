import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

type Tab = 'recent' | 'saved' | 'comparison'

const TABS: { id: Tab; label: string }[] = [
  { id: 'recent',     label: 'Recent'     },
  { id: 'saved',      label: 'Saved'      },
  { id: 'comparison', label: 'Comparison' },
]

// Populated-state card — rendered when data exists (wired up later)
export function SimulationCard() {
  return (
    <div className="bg-graphite border border-border-default rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-bone">ETH Yield Exposure Model</span>
        <span className="text-xs text-dust">Updated · 2 Hours ago</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-8">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-dust">Risk</span>
            <span className="text-sm text-bone">Moderate</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-dust">Expected Yield</span>
            <span className="text-sm text-bone">3.8% – 6.2% APY</span>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-oxide text-carbon text-sm font-semibold rounded-lg">
          <ArrowUpRight size={15} strokeWidth={2.5} />
          Open Simulation
        </button>
      </div>
    </div>
  )
}

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('recent')

  return (
    <div className="flex flex-1 flex-col bg-carbon overflow-hidden">

      {/* Internal tab bar */}
      <div className="border-b border-border-default">
        <div className="flex items-center justify-center gap-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'text-bone border-oxide'
                  : 'text-dust border-transparent hover:text-bone',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — all tabs show empty state until data is wired up */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6 overflow-y-auto">
        <h2 className="text-xl font-semibold text-bone">No Simulation recorded</h2>
        <p className="text-sm text-dust leading-relaxed">
          You have not run any capital simulations.<br />
          MARGIN requires a defined strategy and scenario to model outcomes.
        </p>
        <button className="mt-3 px-6 py-3 bg-oxide text-carbon text-sm font-semibold rounded-xl">
          Create New Simulation
        </button>
      </div>

    </div>
  )
}
