import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { useSimulationStore } from '../store/useSimulationStore'

const STRESS_OPTIONS    = ['1.0x', '1.5x', '2.0x', '2.5x', '3.0x']
const TAIL_RISK_OPTIONS = ['0.5x', '1.0x', '1.5x', '2.0x']

const DISPLAY_TO_CAP: Record<string, number | null> = {
  '100%': null, '75%': 0.75, '50%': 0.50, '25%': 0.25,
}

function displayToCap(display: string): number | null {
  return DISPLAY_TO_CAP[display] ?? null
}

function capToDisplay(cap: number | null | undefined): string {
  if (cap == null || cap >= 1) return '100%'
  if (cap >= 0.75) return '75%'
  if (cap >= 0.50) return '50%'
  return '25%'
}

export default function AdvancedRiskControl() {
  const { config, setConfig, scenarioModifiers, state } = useSimulationStore()
  const unlocked = (config?.capitalAllocation ?? 0) >= 10
  const isLocked = state !== 'INIT' && state !== 'CONFIG'

  const [open, setOpen] = useState(true)
  const [volatility, setVolatility] = useState('Default')
  const [drawdownOn, setDrawdownOn] = useState(false)
  const [tailRisk, setTailRisk] = useState('1.0x')
  const [stress, setStress] = useState('1.0x')
  const [rebalance, setRebalance] = useState('Medium')
  const [exposureLimit, setExposureLimit] = useState(() =>
    capToDisplay(config?.riskParameters?.exposureCap)
  )

  useEffect(() => {
    if (!scenarioModifiers) return
    setStress(scenarioModifiers.stressValue)
    setTailRisk(scenarioModifiers.tailRisk)
    setRebalance(scenarioModifiers.rebalanceSensitivity)
  }, [scenarioModifiers])

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm text-bone">Advanced Risk Control</h3>

      {!unlocked && (
        <p className="text-sm text-dust">
          Optional constraint for leverage, exposure caps, and volatility sensitivity.
        </p>
      )}

      <div className="border border-border-default rounded-lg overflow-hidden">
        {/* Header row */}
        <button
          disabled={!unlocked || isLocked}
          onClick={() => unlocked && !isLocked && setOpen(o => !o)}
          className={[
            'w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors',
            unlocked && !isLocked
              ? open
                ? 'bg-ash text-oxide cursor-pointer hover:bg-graphite'
                : 'bg-ash text-bone cursor-pointer hover:bg-graphite'
              : 'bg-ash text-dust/50 cursor-default',
          ].join(' ')}
        >
          <span>Configure Risk Parameters</span>
          {unlocked
            ? open
              ? <ChevronUp size={14} />
              : <ChevronDown size={14} />
            : <ChevronDown size={14} className="text-dust/50" />
          }
        </button>

        {/* Lock bar — only in locked state */}
        {!unlocked && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border-default">
            <Lock size={12} className="text-ochre shrink-0" />
            <span className="text-xs text-ochre">
              Unavailable until capital and strategy are defined
            </span>
          </div>
        )}

        {/* Expanded controls — only in unlocked + open state */}
        {unlocked && open && (
          <div className={['flex flex-col divide-y divide-border-default border-t border-border-default', isLocked ? 'opacity-50 pointer-events-none' : ''].join(' ')}>

            {/* Volatility Sensitivity */}
            <ControlRow label="Volatility Sensitivity">
              <SelectPill value={volatility} onChange={setVolatility} options={['Default', 'Low', 'Medium', 'High']} />
            </ControlRow>

            {/* Draw-down cap */}
            <ControlRow label="Draw-down cap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-dust">{drawdownOn ? 'Restricted' : 'Unrestricted'}</span>
                <Toggle on={drawdownOn} onChange={setDrawdownOn} color="oxide" />
              </div>
            </ControlRow>

            {/* Exposure limit */}
            <ControlRow label="Exposure limit (Capital allocation)">
              <SelectPill
                value={exposureLimit}
                onChange={(v) => {
                  setExposureLimit(v)
                  setConfig({
                    riskParameters: {
                      ...(config?.riskParameters ?? { leverageCap: null, volatilitySensitivity: null }),
                      exposureCap: displayToCap(v),
                    },
                  })
                }}
                options={['100%', '75%', '50%', '25%']}
              />
            </ControlRow>

            {/* Risk Modifiers sub-header */}
            <div className="px-4 py-2 bg-carbon">
              <span className="text-xs text-dust">Risk Modifiers</span>
            </div>

            {/* Stress Amplifier */}
            <ControlRow label="Stress Amplifier">
              <div className="flex items-center gap-1">
                {STRESS_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setStress(opt)}
                    className={[
                      'px-2 py-1 text-xs rounded transition-colors',
                      opt === stress
                        ? 'border border-border-default text-bone'
                        : 'text-dust hover:text-bone',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </ControlRow>

            {/* Tail Risk Multiplier — segmented picker */}
            <ControlRow label="Tail Risk Multiplier">
              <div className="flex items-center gap-1">
                {TAIL_RISK_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setTailRisk(opt)}
                    className={[
                      'px-2 py-1 text-xs rounded transition-colors',
                      opt === tailRisk
                        ? 'border border-border-default text-bone'
                        : 'text-dust hover:text-bone',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </ControlRow>

            {/* Re-balance Sensitivity */}
            <ControlRow label="Re-balance Sensitivity">
              <SelectPill value={rebalance} onChange={setRebalance} options={['Low', 'Medium', 'High']} />
            </ControlRow>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-dust">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ on, onChange, color }: { on: boolean; onChange: (v: boolean) => void; color: 'oxide' | 'steel' }) {
  const track = on
    ? color === 'oxide' ? 'bg-oxide' : 'bg-steel'
    : 'bg-ash border border-border-default'
  return (
    <button
      onClick={() => onChange(!on)}
      className={['relative w-8 h-4 rounded-full transition-colors shrink-0', track].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-3 h-3 rounded-full bg-bone transition-all',
          on ? 'left-[18px]' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  )
}

function SelectPill({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-ash border border-border-default rounded-md pl-2.5 pr-6 py-1 text-xs text-bone outline-none focus:border-dust transition-colors cursor-pointer"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
    </div>
  )
}
