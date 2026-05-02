import { useState, useEffect } from 'react'
import { Pencil, Lock, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCompareStore } from '../store/compareStore'
import { STRATEGY_LABELS } from '../engine/compareEngine'
import {
  SCENARIO_PRESETS, BAND_PRESETS, fmtBand, windowFor,
  type ScenarioPreset,
} from '../data/scenarioPresets'
import type { Strategy } from '../types'

const WINDOW = 4

const VOLATILITY_OPTIONS  = ['Low', 'Medium', 'High', 'Extreme']
const CORRELATION_OPTIONS = ['High Correlation', 'Moderate Correlation', 'Low Correlation', 'Negative Correlation']
const PRESET_MAP          = Object.fromEntries(SCENARIO_PRESETS.map(p => [p.id, p]))

const ALL_STRATEGIES: Strategy[] = ['provide_liquidity', 'hold_asset', 'stake_lend']

const STRATEGY_DESCRIPTIONS: Record<Strategy, string> = {
  hold_asset:        'Direct exposure to asset price movement',
  stake_lend:        'Yield generation with protocol exposure',
  provide_liquidity: 'Fee generation with impermanent loss exposure',
}

// ── Scenario section ──────────────────────────────────────────────────────────

function ScenarioSection() {
  const { config, setConfig } = useCompareStore()
  const [open, setOpen] = useState(false)

  const selectedId = config?.scenarioPresetId ?? 'baseline'
  const activePreset = PRESET_MAP[selectedId] as ScenarioPreset

  // Local controlled state
  const [upperValue, setUpperValue]             = useState(fmtBand(config?.upperBand ?? 12))
  const [lowerValue, setLowerValue]             = useState(fmtBand(config?.lowerBand ?? -10))
  const [upperWindowStart, setUpperWindowStart] = useState(() => windowFor(config?.upperBand ?? 12,  BAND_PRESETS.length, WINDOW))
  const [lowerWindowStart, setLowerWindowStart] = useState(() => windowFor(config?.lowerBand ?? -10, BAND_PRESETS.length, WINDOW))
  const [volatility,  setVolatilityLocal]   = useState(config?.volatility  ?? 'Medium')
  const [correlation, setCorrelationLocal]  = useState(config?.correlation ?? 'Moderate Correlation')
  const [timePeriod,  setTimePeriodLocal]   = useState(config?.timePeriodDays ? String(config.timePeriodDays) : '')

  // Sync from config on first mount
  useEffect(() => {
    if (!config) return
    setUpperValue(fmtBand(config.upperBand))
    setLowerValue(fmtBand(config.lowerBand))
    setUpperWindowStart(windowFor(config.upperBand, BAND_PRESETS.length, WINDOW))
    setLowerWindowStart(windowFor(config.lowerBand, BAND_PRESETS.length, WINDOW))
    setVolatilityLocal(config.volatility)
    setCorrelationLocal(config.correlation)
    setTimePeriodLocal(config.timePeriodDays ? String(config.timePeriodDays) : '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPreset = (preset: ScenarioPreset) => {
    if (!preset.isCustom) {
      setUpperValue(fmtBand(preset.upperBand))
      setLowerValue(fmtBand(preset.lowerBand))
      setUpperWindowStart(windowFor(preset.upperBand, BAND_PRESETS.length, WINDOW))
      setLowerWindowStart(windowFor(preset.lowerBand, BAND_PRESETS.length, WINDOW))
      setVolatilityLocal(preset.volatility)
      setCorrelationLocal(preset.correlation)
      setConfig({
        upperBand:   preset.upperBand,
        lowerBand:   preset.lowerBand,
        volatility:  preset.volatility,
        correlation: preset.correlation,
      })
    }
    setConfig({ scenarioModifiers: { ...preset.modifiers } })
    const msMap: Record<string, 'baseline' | 'bull' | 'bear' | 'high_volatility' | 'black_swan'> = {
      baseline: 'baseline', sharp_drawdown: 'black_swan', gradual_bear: 'bear',
      sideways_vol: 'high_volatility', bull_expansion: 'bull', liquidity_shock: 'black_swan',
      correlation_breakdown: 'high_volatility', low_vol: 'baseline',
      flash_crash: 'black_swan', custom_a: 'baseline', custom_b: 'baseline',
    }
    setConfig({ marketScenario: msMap[preset.id] ?? 'baseline' })
  }

  const handlePresetChange = (id: string) => {
    setConfig({ scenarioPresetId: id })
    applyPreset(PRESET_MAP[id])
  }

  const handleUpper = (v: string) => {
    setUpperValue(v)
    const n = parseFloat(v)
    if (!isNaN(n)) setConfig({ upperBand: n })
  }
  const handleLower = (v: string) => {
    setLowerValue(v)
    const n = parseFloat(v)
    if (!isNaN(n)) setConfig({ lowerBand: n })
  }
  const handleVol = (v: string) => { setVolatilityLocal(v); setConfig({ volatility: v }) }
  const handleCorr = (v: string) => { setCorrelationLocal(v); setConfig({ correlation: v }) }
  const handleTime = (v: string) => {
    setTimePeriodLocal(v)
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 1) setConfig({ timePeriodDays: n })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm text-dust">Select Market Scenario</h3>

      <div className="border border-border-default rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-4 px-4 py-3 bg-ash hover:bg-graphite transition-colors"
        >
          <span className={`flex-1 min-w-0 truncate text-sm text-left ${open ? 'text-dust' : 'text-bone'}`}>
            {activePreset.name}
          </span>
          <span className={`flex items-center gap-1.5 text-sm font-medium shrink-0 ${open ? 'text-oxide' : 'text-bone'}`}>
            Adjust Scenario
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>

        {!open && (
          <div className="px-4 py-2.5 bg-carbon border-t border-border-default">
            <span className="text-xs text-dust">
              Defines external market behavior applied to all strategy simulations
            </span>
          </div>
        )}

        {open && (
          <div className="flex flex-col divide-y divide-border-default border-t border-border-default">

            {/* Preset selector */}
            <div className="flex items-center gap-3 px-4 py-3 bg-ash">
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedId}
                  onChange={e => handlePresetChange(e.target.value)}
                  className="w-full appearance-none bg-carbon text-sm text-bone pr-5 outline-none cursor-pointer [&>option]:bg-carbon [&>option]:text-bone"
                >
                  {SCENARIO_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
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

            <DropdownRow label="Volatility Level"            value={volatility}  onChange={handleVol}  options={VOLATILITY_OPTIONS} />
            <DropdownRow label="Asset Correlation Behaviour" value={correlation} onChange={handleCorr} options={CORRELATION_OPTIONS} />

            {/* Time period */}
            <div className="flex items-center justify-between px-4 py-3 bg-ash">
              <span className="text-xs text-dust">Time Period</span>
              <div className="flex items-center gap-1 bg-carbon border border-border-default rounded-md px-2.5 py-1 focus-within:border-dust transition-colors">
                <input
                  type="number" min={1} max={3650} placeholder="30"
                  value={timePeriod} onChange={e => handleTime(e.target.value)}
                  className="w-14 bg-transparent text-xs text-bone placeholder:text-dust text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-dust select-none">days</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Strategy card ─────────────────────────────────────────────────────────────

function StrategyCard({
  strategy, isSelected, isBaseline, onToggle,
}: {
  strategy:   Strategy
  isSelected: boolean
  isBaseline: boolean
  onToggle:   () => void
}) {
  return (
    <button
      onClick={isBaseline ? undefined : onToggle}
      className={[
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border text-left transition-colors',
        isBaseline
          ? 'bg-ash border-ochre/30 cursor-default'
          : isSelected
            ? 'bg-ash border-border-default hover:border-dust cursor-pointer'
            : 'bg-ash border-border-default hover:border-dust cursor-pointer opacity-60',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-bone font-medium leading-snug">{STRATEGY_LABELS[strategy]}</p>
        <p className="text-[11px] text-dust mt-0.5 leading-snug">{STRATEGY_DESCRIPTIONS[strategy]}</p>
      </div>
      <div className="shrink-0">
        {isBaseline ? (
          <Lock size={13} className="text-ochre" />
        ) : isSelected ? (
          <Check size={14} className="text-ochre" />
        ) : null}
      </div>
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function CompareInputPanel() {
  const { config, setConfig, toggleStrategy } = useCompareStore()

  const [name, setName]                     = useState(config?.name ?? '')
  const [capitalValue, setCapitalValue]     = useState(
    config?.capitalAllocation ? String(config.capitalAllocation) : ''
  )

  const selectedStrategies = config?.selectedStrategies ?? []
  const baselineStrategy   = config?.baselineStrategy

  const canRun = selectedStrategies.length >= 2

  const handleName = (v: string) => { setName(v); setConfig({ name: v }) }
  const handleCapital = (v: string) => {
    setCapitalValue(v)
    setConfig({ capitalAllocation: parseFloat(v) || 0 })
  }

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Name */}
      <div className="relative">
        <input
          type="text"
          placeholder="Strategy Comparison"
          value={name}
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

      {/* Scenario */}
      <ScenarioSection />

      {/* Divider */}
      <div className="h-px bg-border-default -mx-4" />

      {/* Strategy selection */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm text-dust">Select Strategy to compare</h3>

        <div className="flex flex-col gap-2">
          {ALL_STRATEGIES.map(strategy => (
            <StrategyCard
              key={strategy}
              strategy={strategy}
              isSelected={selectedStrategies.includes(strategy)}
              isBaseline={strategy === baselineStrategy}
              onToggle={() => toggleStrategy(strategy)}
            />
          ))}
        </div>

        {/* Locked strategy indicator */}
        {baselineStrategy && (
          <div className="px-3 py-2 bg-carbon/50 border border-border-default rounded-lg">
            <span className="text-[11px] text-dust">
              {STRATEGY_LABELS[baselineStrategy]} Strategy Locked&nbsp; &middot;&nbsp; Select Items to Compare
            </span>
          </div>
        )}

        {/* Validation message */}
        {!canRun && (
          <p className="text-[12px] text-ochre leading-snug">
            Select at least two and maximum of three items to compare
          </p>
        )}
      </section>

    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function BandRow({ label, value, onChange, windowStart, onWindowChange }: {
  label: string; value: string; onChange: (v: string) => void
  windowStart: number; onWindowChange: (n: number) => void
}) {
  const visible  = BAND_PRESETS.slice(windowStart, windowStart + WINDOW)
  const canLeft  = windowStart > 0
  const canRight = windowStart + WINDOW < BAND_PRESETS.length
  const numVal   = parseFloat(value)

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-dust w-[68px] shrink-0">{label}</span>
      <button onClick={() => canLeft && onWindowChange(windowStart - 1)} disabled={!canLeft}
        className={canLeft ? 'text-dust hover:text-bone transition-colors' : 'text-dust/20 cursor-default'}>
        <ChevronLeft size={12} />
      </button>
      <div className="flex items-center gap-0.5">
        {visible.map(v => (
          <button key={v} onClick={() => onChange(fmtBand(v))}
            className={['px-1.5 py-1 text-xs rounded transition-colors',
              numVal === v ? 'border border-border-default text-bone' : 'text-dust hover:text-bone',
            ].join(' ')}>
            {fmtBand(v)}
          </button>
        ))}
      </div>
      <button onClick={() => canRight && onWindowChange(windowStart + 1)} disabled={!canRight}
        className={canRight ? 'text-dust hover:text-bone transition-colors' : 'text-dust/20 cursor-default'}>
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
