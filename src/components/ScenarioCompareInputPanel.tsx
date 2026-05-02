import { useState } from 'react'
import { Pencil, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useScenarioCompareStore, type ScenarioBlock } from '../store/scenarioCompareStore'
import { SCENARIO_PRESETS as SP, fmtBand as fb, windowFor as wf, BAND_PRESETS as BP } from '../data/scenarioPresets'
import type { Strategy } from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const WINDOW = 4

const VOLATILITY_OPTIONS = ['Low', 'Medium', 'High', 'Extreme']

const CORRELATION_OPTIONS = [
  'High Correlation',
  'Moderate Correlation',
  'Low Correlation',
  'Negative Correlation',
  'Breaking (Decoupling)',
]

const TAIL_RISK_OPTIONS = ['0.5x', '1.0x', '1.5x', '2.0x']

const REBALANCE_OPTIONS = ['Low', 'Medium', 'High']

const STRATEGY_LABELS: Record<Strategy, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'Provide Liquidity',
}

const STRATEGY_DESCRIPTIONS: Record<Strategy, string> = {
  hold_asset:        'Direct exposure to asset price movement',
  stake_lend:        'Yield generation with protocol exposure',
  provide_liquidity: 'Fee generation with impermanent loss exposure',
}

const STRATEGY_NOTES: Partial<Record<Strategy, string>> = {
  provide_liquidity: 'High sensitivity to price divergence',
  stake_lend:        'Yield compresses under high-volatility regimes',
}

const PRESET_MAP = Object.fromEntries(SP.map(p => [p.id, p]))
const ALL_STRATEGIES: Strategy[] = ['hold_asset', 'stake_lend', 'provide_liquidity']

// ── Strategy selector (locked) ────────────────────────────────────────────────

function StrategySelector({ strategy }: { strategy: Strategy }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm text-dust">Select Strategy</h3>
      <div className="flex flex-col gap-2">
        {ALL_STRATEGIES.map(s => {
          const isSelected = s === strategy
          return (
            <div
              key={s}
              className={[
                'flex flex-col px-4 py-3.5 rounded-lg border transition-colors',
                isSelected
                  ? 'bg-ash border-ochre/30'
                  : 'bg-ash border-border-default opacity-40',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-bone font-medium leading-snug">{STRATEGY_LABELS[s]}</p>
                  <p className="text-[11px] text-dust mt-0.5">{STRATEGY_DESCRIPTIONS[s]}</p>
                </div>
                <div className={[
                  'w-3.5 h-3.5 rounded-full border-2 shrink-0',
                  isSelected ? 'bg-oxide border-oxide' : 'border-border-default',
                ].join(' ')} />
              </div>
              {isSelected && STRATEGY_NOTES[s] && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border-default">
                  <div className="w-3.5 h-3.5 rounded-full border border-ochre/50 flex items-center justify-center shrink-0">
                    <span className="text-[8px] text-ochre font-bold">i</span>
                  </div>
                  <span className="text-[11px] text-dust">{STRATEGY_NOTES[s]}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Scenario block ─────────────────────────────────────────────────────────────

function ScenarioBlockEditor({
  block,
  capitalAllocation,
  onChange,
}: {
  block:             ScenarioBlock
  capitalAllocation: number
  onChange:          (partial: Partial<Omit<ScenarioBlock, 'id' | 'isBaseline'>>) => void
}) {
  const [open, setOpen] = useState(block.isBaseline)

  // Local UI state for band controls
  const [upperValue, setUpperValue]             = useState(fb(block.upperBand))
  const [lowerValue, setLowerValue]             = useState(fb(block.lowerBand))
  const [upperWindowStart, setUpperWindowStart] = useState(() => wf(block.upperBand, BP.length, WINDOW))
  const [lowerWindowStart, setLowerWindowStart] = useState(() => wf(block.lowerBand, BP.length, WINDOW))

  const stressOn = block.scenarioModifiers.stressValue !== '1.0x'

  const handlePresetChange = (id: string) => {
    const p = PRESET_MAP[id]
    if (!p || p.isCustom) {
      onChange({ presetId: id, label: p?.name ?? id })
      return
    }
    const upper = fb(p.upperBand)
    const lower = fb(p.lowerBand)
    setUpperValue(upper)
    setLowerValue(lower)
    setUpperWindowStart(wf(p.upperBand, BP.length, WINDOW))
    setLowerWindowStart(wf(p.lowerBand, BP.length, WINDOW))
    onChange({
      presetId:          id,
      label:             p.name,
      upperBand:         p.upperBand,
      lowerBand:         p.lowerBand,
      volatility:        p.volatility,
      correlation:       p.correlation,
      scenarioModifiers: { ...p.modifiers },
    })
  }

  const handleUpper = (v: string) => {
    setUpperValue(v)
    const n = parseFloat(v)
    if (!isNaN(n)) onChange({ upperBand: n })
  }

  const handleLower = (v: string) => {
    setLowerValue(v)
    const n = parseFloat(v)
    if (!isNaN(n)) onChange({ lowerBand: n })
  }

  const toggleStress = () => {
    const next = stressOn ? '1.0x' : '2.0x'
    onChange({ scenarioModifiers: { ...block.scenarioModifiers, stressValue: next } })
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-ash hover:bg-graphite transition-colors"
      >
        <span className="text-[13px] text-dust truncate">{block.label}</span>
        <span className={`flex items-center gap-1.5 text-[13px] font-medium shrink-0 ${open ? 'text-oxide' : 'text-bone'}`}>
          Adjust Scenario
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {open && (
        <div className="flex flex-col divide-y divide-border-default border-t border-border-default">

          {/* Preset + capital */}
          <div className="flex items-center gap-3 px-4 py-3 bg-ash">
            <div className="relative flex-1 min-w-0">
              <select
                value={block.presetId}
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full appearance-none bg-carbon text-[13px] text-bone pr-5 outline-none cursor-pointer [&>option]:bg-carbon [&>option]:text-bone"
              >
                {SP.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px] text-bone">$ {capitalAllocation.toLocaleString()}</span>
              <Pencil size={11} className="text-dust" />
            </div>
          </div>

          {/* Price bands header */}
          <div className="px-4 py-2 bg-carbon">
            <span className="text-xs text-dust">Price Movement Range</span>
          </div>

          <div className="px-4 py-3 bg-ash">
            <BandRow label="Upper Band" value={upperValue} onChange={handleUpper}
              windowStart={upperWindowStart} onWindowChange={setUpperWindowStart} />
          </div>
          <div className="px-4 py-3 bg-ash">
            <BandRow label="Lower Band" value={lowerValue} onChange={handleLower}
              windowStart={lowerWindowStart} onWindowChange={setLowerWindowStart} />
          </div>

          {/* Volatility */}
          <DropdownRow
            label="Volatility Level"
            value={block.volatility}
            onChange={v => onChange({ volatility: v })}
            options={VOLATILITY_OPTIONS}
          />

          {/* Correlation */}
          <DropdownRow
            label="Asset Correlation Behaviour"
            value={block.correlation}
            onChange={v => onChange({ correlation: v })}
            options={CORRELATION_OPTIONS}
          />

          {/* Risk Modifiers header */}
          <div className="px-4 py-2 bg-carbon">
            <span className="text-xs text-dust">Risk Modifiers</span>
          </div>

          {/* Stress Amplifier toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-ash">
            <span className="text-xs text-dust">Stress Amplifier</span>
            <button onClick={toggleStress} className="flex items-center gap-2">
              <span className={`text-xs font-medium ${stressOn ? 'text-bone' : 'text-dust'}`}>
                {stressOn ? 'ON' : 'OFF'}
              </span>
              <div className={[
                'relative w-9 h-5 rounded-full transition-colors',
                stressOn ? 'bg-oxide' : 'bg-ash border border-border-default',
              ].join(' ')}>
                <div className={[
                  'absolute top-[3px] w-[14px] h-[14px] rounded-full bg-bone transition-transform',
                  stressOn ? 'translate-x-[18px]' : 'translate-x-[3px]',
                ].join(' ')} />
              </div>
            </button>
          </div>

          {/* Tail Risk Multiplier */}
          <div className="flex items-center justify-between px-4 py-3 bg-ash">
            <span className="text-xs text-dust shrink-0">Tail Risk Multiplier</span>
            <div className="flex items-center gap-0.5">
              {TAIL_RISK_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => onChange({ scenarioModifiers: { ...block.scenarioModifiers, tailRisk: opt } })}
                  className={[
                    'px-2 py-1 text-xs rounded transition-colors',
                    block.scenarioModifiers.tailRisk === opt
                      ? 'border border-border-default text-bone'
                      : 'text-dust hover:text-bone',
                  ].join(' ')}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Rebalance Sensitivity */}
          <DropdownRow
            label="Re-balance Sensitivity"
            value={block.scenarioModifiers.rebalanceSensitivity}
            onChange={v => onChange({ scenarioModifiers: { ...block.scenarioModifiers, rebalanceSensitivity: v } })}
            options={REBALANCE_OPTIONS}
          />

        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ScenarioCompareInputPanel() {
  const { config, setConfig, updateScenario } = useScenarioCompareStore()

  const [name, setName]             = useState(config?.name ?? '')
  const [capitalValue, setCapital]  = useState(
    config?.capitalAllocation ? String(config.capitalAllocation) : ''
  )

  if (!config) return null

  const handleName = (v: string) => { setName(v); setConfig({ name: v }) }
  const handleCapital = (v: string) => {
    setCapital(v)
    setConfig({ capitalAllocation: parseFloat(v) || 0 })
  }

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Name */}
      <div className="relative">
        <input
          type="text" placeholder="Strategy Comparison" value={name}
          onChange={e => handleName(e.target.value)}
          className="w-full bg-ash border border-border-default rounded-lg px-4 py-3 pr-10 text-sm text-bone placeholder:text-dust outline-none hover:border-dust focus:border-dust transition-colors"
        />
        <Pencil size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
      </div>

      {/* Capital */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm text-dust">Enter Capital Allocation</h3>
        <div className="border border-border-default rounded-lg overflow-hidden hover:border-dust transition-colors">
          <div className="flex items-center gap-4 px-4 py-4 bg-ash">
            <span className="text-xl text-bone select-none">$</span>
            <input
              type="number" placeholder="0000.00" min={10} max={100_000_000}
              value={capitalValue} onChange={e => handleCapital(e.target.value)}
              className="flex-1 bg-transparent text-xl text-bone placeholder:text-dust text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2 bg-carbon border-t border-border-default">
            <span className="text-xs text-dust">Minimum: 10</span>
            <span className="text-xs text-dust">Maximum: 100,000,000</span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border-default -mx-4" />

      {/* Strategy (locked) */}
      <StrategySelector strategy={config.strategy} />

      {/* Divider */}
      <div className="h-px bg-border-default -mx-4" />

      {/* Scenario blocks */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm text-dust">Select Market Scenario to Compare</h3>
        <div className="flex flex-col gap-2">
          {config.scenarios.map(block => (
            <ScenarioBlockEditor
              key={block.id}
              block={block}
              capitalAllocation={config.capitalAllocation}
              onChange={partial => updateScenario(block.id, partial)}
            />
          ))}
        </div>
        <p className="text-[12px] text-ochre leading-snug">
          Select at least two and maximum of three items to compare
        </p>
      </section>

    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function BandRow({ label, value, onChange, windowStart, onWindowChange }: {
  label: string; value: string; onChange: (v: string) => void
  windowStart: number; onWindowChange: (n: number) => void
}) {
  const visible  = BP.slice(windowStart, windowStart + WINDOW)
  const canLeft  = windowStart > 0
  const canRight = windowStart + WINDOW < BP.length
  const numVal   = parseFloat(value)

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-dust w-[68px] shrink-0">{label}</span>
      <button onClick={() => canLeft && onWindowChange(windowStart - 1)} disabled={!canLeft}
        className={canLeft ? 'text-dust hover:text-bone' : 'text-dust/20 cursor-default'}>
        <ChevronLeft size={12} />
      </button>
      <div className="flex items-center gap-0.5">
        {visible.map(v => (
          <button key={v} onClick={() => onChange(fb(v))}
            className={['px-1.5 py-1 text-xs rounded transition-colors',
              numVal === v ? 'border border-border-default text-bone' : 'text-dust hover:text-bone',
            ].join(' ')}>
            {fb(v)}
          </button>
        ))}
      </div>
      <button onClick={() => canRight && onWindowChange(windowStart + 1)} disabled={!canRight}
        className={canRight ? 'text-dust hover:text-bone' : 'text-dust/20 cursor-default'}>
        <ChevronRight size={12} />
      </button>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="+00"
        className="ml-auto w-12 bg-carbon border border-border-default rounded px-1.5 py-0.5 text-xs text-bone text-right placeholder:text-dust outline-none focus:border-dust transition-colors" />
    </div>
  )
}

function DropdownRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-ash">
      <span className="text-xs text-dust">{label}</span>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none bg-ash border border-border-default rounded-md pl-2.5 pr-6 py-1 text-xs text-bone outline-none focus:border-dust transition-colors cursor-pointer">
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
      </div>
    </div>
  )
}
