import { useState, useEffect, useRef } from 'react'
import { Pencil, AlertTriangle, X } from 'lucide-react'
import { useSimulationStore } from '../store/simulationStore'
import { useSavesStore, writeSave } from '../store/savesStore'
import type { SavedSimulation } from '../store/savesStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function versionLabel(version: number, maxVersion: number): string {
  if (version === maxVersion) return 'Current (Auto-saved)'
  if (version === 1)          return 'Initial creation (baseline model)'
  return 'Previous snapshot (Modified scenario inputs)'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose:     () => void
  onEditInput: () => void
}

export default function SaveModal({ onClose, onEditInput }: Props) {
  const store      = useSimulationStore()
  const savesStore = useSavesStore()
  const savedRef   = useRef(false)

  const [name, setName] = useState(store.config?.name ?? '')

  // Perform the save exactly once on mount when state is COMPUTED
  useEffect(() => {
    if (savedRef.current) return
    const s = useSimulationStore.getState()
    if (s.state !== 'COMPUTED') return
    const { config, results, scenarioModifiers, version } = s
    if (!config || !results) return

    savedRef.current = true

    const saveId      = crypto.randomUUID()
    const saveVersion = version  // version before increment = this save's number
    const groupId     = s.saveSimulation(saveId)
    const savedAt     = new Date().toISOString()

    const fullSave: SavedSimulation = {
      id:                saveId,
      simulationGroupId: groupId,
      version:           saveVersion,
      name:              config.name,
      savedAt,
      config,
      scenarioModifiers: scenarioModifiers ?? {
        stressValue: '1.0x', tailRisk: '1.0x', rebalanceSensitivity: 'Medium',
      },
      results,
      riskLevel:         results.riskLevel,
      strategy:          config.strategy!,
      capitalAllocation: config.capitalAllocation,
    }

    writeSave(fullSave)

    useSavesStore.getState().upsert(
      groupId,
      {
        simulationGroupId: groupId,
        name:              config.name,
        savedAt,
        riskLevel:         results.riskLevel,
        strategy:          config.strategy!,
        capitalAllocation: config.capitalAllocation,
        grossYieldPct:     results.grossYieldPct,
        netYieldPct:       results.netYieldPct,
      },
      { saveId, version: saveVersion, savedAt, name: config.name },
    )
  }, [])

  const groupId  = store.simulationGroupId
  const entry    = groupId ? savesStore.entries.find(e => e.simulationGroupId === groupId) : null
  const versions = entry?.versions ?? []
  const maxVer   = versions.reduce((m, v) => Math.max(m, v.version), 0)

  const handleNameChange = (val: string) => {
    setName(val)
    useSimulationStore.getState().updateSavedName(val)
    if (groupId) useSavesStore.getState().updateName(groupId, val)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-[520px] mx-4 bg-graphite border border-border-default rounded-2xl shadow-2xl overflow-hidden">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-dust hover:text-bone transition-colors"
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-5 text-center">
          <p className="text-[17px] font-medium text-bone mb-2">
            Simulation Automatically Saved
          </p>
          <p className="text-[12px] text-dust leading-relaxed max-w-[380px] mx-auto">
            All changes are continuously recorded to ensure deterministic recovery and comparison.
            Your simulation has been persisted and versioned.
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">

          {/* Name field */}
          <div className="flex items-center gap-3 px-4 py-3 bg-ash/40 border border-border-default rounded-xl">
            <input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="flex-1 bg-transparent text-[13px] text-bone outline-none placeholder:text-dust/40 min-w-0"
              placeholder="Simulation name"
            />
            <Pencil size={12} className="text-dust shrink-0" />
          </div>

          {/* Version history */}
          <div className="border border-border-default rounded-xl overflow-hidden">

            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-ash/40">
              <span className="text-[12px] text-dust">Version History</span>
              <button className="flex items-center gap-1 text-[12px] text-bone hover:text-oxide transition-colors">
                <span>↗</span>
                Compare Versions
              </button>
            </div>

            {versions.length === 0 ? (
              <div className="px-4 py-3">
                <span className="text-[12px] text-dust/40">No versions recorded yet</span>
              </div>
            ) : (
              versions.map((v, i) => (
                <div
                  key={v.saveId}
                  className={[
                    'flex items-center justify-between px-4 py-3',
                    i < versions.length - 1 ? 'border-b border-border-default' : '',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-bone">
                      {versionLabel(v.version, maxVer)}
                    </span>
                    <span className="text-[11px] text-dust/50">{fmtDate(v.savedAt)}</span>
                  </div>
                  <span className="text-[12px] text-dust shrink-0 ml-4">v{v.version}</span>
                </div>
              ))
            )}

          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 px-4 py-3 bg-ochre/10 border border-ochre/20 rounded-xl">
            <AlertTriangle size={14} className="text-ochre shrink-0 mt-[1px]" />
            <p className="text-[12px] text-dust leading-relaxed">
              Saving does not recompute risk or simulation outcomes.
              Re-run is required for updated analytics.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onEditInput}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors"
            >
              <Pencil size={13} />
              Edit Input
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-oxide text-carbon hover:opacity-90 transition-opacity cursor-pointer"
            >
              View Result
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
