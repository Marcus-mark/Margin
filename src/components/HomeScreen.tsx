import { useState } from 'react'
import { ArrowUpRight, Trash2, Copy } from 'lucide-react'
import { useSavesStore, readSave, writeSave } from '../store/savesStore'
import type { SaveEntry, SavedSimulation } from '../store/savesStore'

// ── Label maps ────────────────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<string, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'LP',
}

const SCENARIO_LABELS: Record<string, string> = {
  baseline:        'Baseline Market',
  bull:            'Bull Expansion',
  bear:            'Bear Market',
  high_volatility: 'High Volatility',
  black_swan:      'Black Swan',
}

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  low:      { label: 'LOW',      cls: 'bg-ash text-dust border border-border-default' },
  moderate: { label: 'MODERATE', cls: 'bg-ochre/15 text-ochre border border-ochre/30' },
  high:     { label: 'HIGH',     cls: 'bg-oxide/15 text-oxide border border-oxide/30' },
  critical: { label: 'CRITICAL', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  extreme:  { label: 'EXTREME',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Simulation card ───────────────────────────────────────────────────────────

function MetaCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] text-dust">{label}</span>
      <span className="text-[13px] text-bone truncate">{value}</span>
    </div>
  )
}

interface CardProps {
  entry:       SaveEntry
  onOpen:      () => void
  onDelete:    () => void
  onDuplicate: () => void
}

function SimCard({ entry, onOpen, onDelete, onDuplicate }: CardProps) {
  const latest  = entry.versions[0]
  const badge   = RISK_BADGE[entry.riskLevel] ?? RISK_BADGE.moderate

  return (
    <div className="bg-graphite border border-border-default rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 min-w-0 mr-4">
          <span className="text-[14px] font-medium text-bone truncate">{entry.name}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        <span className="text-[12px] text-dust shrink-0">
          Updated · {relativeTime(entry.savedAt)}
        </span>
      </div>

      {/* Metadata */}
      <div className="flex gap-10 px-5 pb-4">
        <MetaCol
          label="Capital"
          value={`$ ${entry.capitalAllocation.toLocaleString('en-US')}`}
        />
        <MetaCol
          label="Strategy"
          value={STRATEGY_LABELS[entry.strategy] ?? entry.strategy}
        />
        <MetaCol
          label="Scenario"
          value={
            entry.marketScenario
              ? (SCENARIO_LABELS[entry.marketScenario] ?? entry.marketScenario)
              : '—'
          }
        />
        <MetaCol
          label="Version"
          value={`v${latest?.version ?? 1}`}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-default">
        <div className="flex items-center gap-5">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-[13px] text-dust hover:text-bone transition-colors"
          >
            <Trash2 size={13} />
            Delete
          </button>
          <button
            onClick={onDuplicate}
            className="flex items-center gap-1.5 text-[13px] text-dust hover:text-bone transition-colors"
          >
            <Copy size={13} />
            Duplicate
          </button>
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-oxide text-carbon text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          <ArrowUpRight size={14} strokeWidth={2.5} />
          Open Simulation
        </button>
      </div>

    </div>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
      <h2 className="text-xl font-semibold text-bone">No Simulation recorded</h2>
      <p className="text-sm text-dust leading-relaxed">
        You have not run any capital simulations.<br />
        MARGIN requires a defined strategy and scenario to model outcomes.
      </p>
      <button
        onClick={onNew}
        className="mt-3 px-6 py-3 bg-oxide text-carbon text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
      >
        Create New Simulation
      </button>
    </div>
  )
}

function ComparisonEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
      <h2 className="text-xl font-semibold text-bone">No Comparisons Saved</h2>
      <p className="text-sm text-dust leading-relaxed">
        Run a strategy or scenario comparison and save it to see it here.
      </p>
    </div>
  )
}

// ── Home screen ───────────────────────────────────────────────────────────────

type HomeTab = 'recent' | 'saved' | 'comparison'

const TABS: { id: HomeTab; label: string }[] = [
  { id: 'recent',     label: 'Recent'     },
  { id: 'saved',      label: 'Saved'      },
  { id: 'comparison', label: 'Comparison' },
]

interface HomeScreenProps {
  onOpenSimulation: (simulationGroupId: string) => void
  onNew:            () => void
}

export default function HomeScreen({ onOpenSimulation, onNew }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<HomeTab>('recent')
  const entries = useSavesStore(s => s.entries)

  const handleDelete = (entry: SaveEntry) => {
    entry.versions.forEach(v => localStorage.removeItem(`margin_save_${v.saveId}`))
    useSavesStore.getState().removeEntry(entry.simulationGroupId)
  }

  const handleDuplicate = (entry: SaveEntry) => {
    if (entry.versions.length === 0) return
    const latest = entry.versions[0]
    const save   = readSave(latest.saveId)
    if (!save) return

    const newGroupId = crypto.randomUUID()
    const newSaveId  = crypto.randomUUID()
    const savedAt    = new Date().toISOString()
    const newName    = entry.name + ' (Copy)'

    const newSave: SavedSimulation = {
      ...save,
      id:                newSaveId,
      simulationGroupId: newGroupId,
      version:           1,
      name:              newName,
      savedAt,
    }
    writeSave(newSave)

    useSavesStore.getState().upsert(
      newGroupId,
      {
        simulationGroupId: newGroupId,
        name:              newName,
        savedAt,
        riskLevel:         entry.riskLevel,
        strategy:          entry.strategy,
        capitalAllocation: entry.capitalAllocation,
        grossYieldPct:     entry.grossYieldPct,
        netYieldPct:       entry.netYieldPct,
        marketScenario:    entry.marketScenario,
      },
      { saveId: newSaveId, version: 1, savedAt, name: newName },
    )
  }

  // Recent: 5 most recently saved; Saved: all, newest first
  const sorted = [...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const list   = activeTab === 'recent' ? sorted.slice(0, 5) : sorted

  return (
    <div className="flex flex-1 flex-col bg-carbon overflow-hidden">

      {/* Tab bar */}
      <div className="border-b border-border-default shrink-0">
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

      {/* Content */}
      {activeTab === 'comparison' ? (
        <ComparisonEmptyState />
      ) : list.length === 0 ? (
        <EmptyState onNew={onNew} />
      ) : (
        <div className="flex-1 overflow-y-auto py-6 px-6">
          <div className="max-w-[860px] mx-auto flex flex-col gap-3">
            {list.map(entry => (
              <SimCard
                key={entry.simulationGroupId}
                entry={entry}
                onOpen={() => onOpenSimulation(entry.simulationGroupId)}
                onDelete={() => handleDelete(entry)}
                onDuplicate={() => handleDuplicate(entry)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
