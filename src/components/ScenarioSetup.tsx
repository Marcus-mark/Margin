import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useSimulationStore } from '../store/simulationStore'
import {
  SCENARIO_PRESETS, BAND_PRESETS, fmtBand, windowFor,
  type ScenarioPreset,
} from '../data/scenarioPresets'

const WINDOW = 4

const VOLATILITY_OPTIONS  = ['Low', 'Medium', 'High', 'Extreme']
const CORRELATION_OPTIONS = ['High Correlation', 'Moderate Correlation', 'Low Correlation', 'Negative Correlation']

const PRESET_MAP = Object.fromEntries(SCENARIO_PRESETS.map(p => [p.id, p]))

export default function ScenarioSetup() {
  const { config, setConfig, setScenarioModifiers, state } = useSimulationStore()
  const isLocked = state !== 'INIT' && state !== 'CONFIG'

  const [open, setOpen] = useState(false)

  // Seed the store with the baseline scenario on first render
  useEffect(() => {
    if (!config?.marketScenario) {
      const baseline = PRESET_MAP['baseline']
      setConfig({
        marketScenario: 'baseline',
        upperBand:   baseline.upperBand,
        lowerBand:   baseline.lowerBand,
        volatility:  baseline.volatility,
        correlation: baseline.correlation,
      })
      setScenarioModifiers({ ...baseline.modifiers })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scenario selection
  const [selectedId, setSelectedId] = useState('baseline')

  // Band values stored as formatted strings (e.g. "-25", "+12")
  const baseline = PRESET_MAP['baseline']
  const [upperValue, setUpperValue]             = useState(fmtBand(baseline.upperBand))
  const [lowerValue, setLowerValue]             = useState(fmtBand(baseline.lowerBand))
  const [upperWindowStart, setUpperWindowStart] = useState(() => windowFor(baseline.upperBand, BAND_PRESETS.length, WINDOW))
  const [lowerWindowStart, setLowerWindowStart] = useState(() => windowFor(baseline.lowerBand, BAND_PRESETS.length, WINDOW))

  const [volatility, setVolatility]   = useState(baseline.volatility)
  const [correlation, setCorrelation] = useState(baseline.correlation)
  const [timePeriod, setTimePeriod]   = useState('')

  // ── Handlers that sync local state + store ──────────────────────────────────

  const handleUpperChange = (v: string) => {
    setUpperValue(v)
    const n = parseFloat(v)
    if (!isNaN(n)) setConfig({ upperBand: n })
  }

  const handleLowerChange = (v: string) => {
    setLowerValue(v)
    const n = parseFloat(v)
    if (!isNaN(n)) setConfig({ lowerBand: n })
  }

  const handleVolatilityChange = (v: string) => {
    setVolatility(v)
    setConfig({ volatility: v })
  }

  const handleCorrelationChange = (v: string) => {
    setCorrelation(v)
    setConfig({ correlation: v })
  }

  const handleTimePeriodChange = (v: string) => {
    setTimePeriod(v)
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= 1) setConfig({ timePeriodDays: n })
  }

  // ── Preset application ──────────────────────────────────────────────────────

  const applyPreset = (preset: ScenarioPreset) => {
    if (!preset.isCustom) {
      setUpperValue(fmtBand(preset.upperBand))
      setLowerValue(fmtBand(preset.lowerBand))
      setUpperWindowStart(windowFor(preset.upperBand, BAND_PRESETS.length, WINDOW))
      setLowerWindowStart(windowFor(preset.lowerBand, BAND_PRESETS.length, WINDOW))
      setVolatility(preset.volatility)
      setCorrelation(preset.correlation)
      setConfig({
        upperBand:   preset.upperBand,
        lowerBand:   preset.lowerBand,
        volatility:  preset.volatility,
        correlation: preset.correlation,
      })
    }

    setScenarioModifiers({ ...preset.modifiers })

    const scenarioMap: Record<string, 'baseline' | 'bull' | 'bear' | 'high_volatility' | 'black_swan'> = {
      baseline:              'baseline',
      sharp_drawdown:        'black_swan',
      gradual_bear:          'bear',
      sideways_vol:          'high_volatility',
      bull_expansion:        'bull',
      liquidity_shock:       'black_swan',
      correlation_breakdown: 'high_volatility',
      low_vol:               'baseline',
      flash_crash:           'black_swan',
      custom_a:              'baseline',
      custom_b:              'baseline',
    }
    setConfig({ marketScenario: scenarioMap[preset.id] ?? 'baseline' })
  }

  const handleScenarioChange = (id: string) => {
    setSelectedId(id)
    applyPreset(PRESET_MAP[id])
  }

  const capitalDisplay = config?.capitalAllocation
    ? `$ ${config.capitalAllocation.toLocaleString()}`
    : '$ —'

  const activePreset = PRESET_MAP[selectedId]

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm text-bone">Setup Market Scenario</h3>

      <div className="border border-border-default rounded-lg overflow-hidden">

        {/* Header */}
        <button
          onClick={() => !isLocked && setOpen(o => !o)}
          disabled={isLocked}
          className="w-full flex items-center gap-4 px-4 py-3 bg-ash hover:bg-graphite transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-ash"
        >
          <span className={[
            'flex-1 min-w-0 truncate text-sm text-left transition-colors',
            open ? 'text-dust' : 'text-bone',
          ].join(' ')}>
            {activePreset.name}
          </span>
          <span className={[
            'flex items-center gap-1.5 text-sm font-medium shrink-0 transition-colors',
            open ? 'text-oxide' : 'text-bone',
          ].join(' ')}>
            Adjust Scenario
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>

        {/* Collapsed info bar */}
        {!open && (
          <div className="px-4 py-2.5 bg-carbon border-t border-border-default">
            <span className="text-xs text-dust">
              Defines external market behavior applied to strategy simulation
            </span>
          </div>
        )}

        {/* Expanded content */}
        {open && (
          <div className="flex flex-col divide-y divide-border-default border-t border-border-default">

            {/* Scenario selector + capital */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-ash">
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedId}
                  onChange={e => handleScenarioChange(e.target.value)}
                  className="w-full appearance-none bg-carbon text-sm text-bone pr-5 outline-none cursor-pointer [&>option]:bg-carbon [&>option]:text-bone"
                >
                  {SCENARIO_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-bone">{capitalDisplay}</span>
                <Pencil size={12} className="text-dust" />
              </div>
            </div>

            {/* Price Movement Range header */}
            <div className="px-4 py-2 bg-carbon">
              <span className="text-xs text-dust">Price Movement Range</span>
            </div>

            {/* Upper Band */}
            <div className="px-4 py-3 bg-ash">
              <BandRow
                label="Upper Band"
                value={upperValue}
                onChange={handleUpperChange}
                windowStart={upperWindowStart}
                onWindowChange={setUpperWindowStart}
              />
            </div>

            {/* Lower Band */}
            <div className="px-4 py-3 bg-ash">
              <BandRow
                label="Lower Band"
                value={lowerValue}
                onChange={handleLowerChange}
                windowStart={lowerWindowStart}
                onWindowChange={setLowerWindowStart}
              />
            </div>

            {/* Volatility Level */}
            <DropdownRow
              label="Volatility Level"
              value={volatility}
              onChange={handleVolatilityChange}
              options={VOLATILITY_OPTIONS}
            />

            {/* Asset Correlation */}
            <DropdownRow
              label="Asset Correlation Behaviour"
              value={correlation}
              onChange={handleCorrelationChange}
              options={CORRELATION_OPTIONS}
            />

            {/* Time Period */}
            <div className="flex items-center justify-between px-4 py-3 bg-ash">
              <span className="text-xs text-dust">Time Period</span>
              <div className="flex items-center gap-1 bg-carbon border border-border-default rounded-md px-2.5 py-1 focus-within:border-dust transition-colors">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  placeholder="30"
                  value={timePeriod}
                  onChange={e => handleTimePeriodChange(e.target.value)}
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

// ── BandRow ───────────────────────────────────────────────────────────────────

type BandRowProps = {
  label: string
  value: string
  onChange: (v: string) => void
  windowStart: number
  onWindowChange: (n: number) => void
}

function BandRow({ label, value, onChange, windowStart, onWindowChange }: BandRowProps) {
  const visible  = BAND_PRESETS.slice(windowStart, windowStart + WINDOW)
  const canLeft  = windowStart > 0
  const canRight = windowStart + WINDOW < BAND_PRESETS.length
  const numVal   = parseFloat(value)

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-dust w-[68px] shrink-0">{label}</span>

      <button
        onClick={() => canLeft && onWindowChange(windowStart - 1)}
        disabled={!canLeft}
        className={canLeft ? 'text-dust hover:text-bone transition-colors' : 'text-dust/20 cursor-default'}
      >
        <ChevronLeft size={12} />
      </button>

      <div className="flex items-center gap-0.5">
        {visible.map(v => (
          <button
            key={v}
            onClick={() => onChange(fmtBand(v))}
            className={[
              'px-1.5 py-1 text-xs rounded transition-colors',
              numVal === v
                ? 'border border-border-default text-bone'
                : 'text-dust hover:text-bone',
            ].join(' ')}
          >
            {fmtBand(v)}
          </button>
        ))}
      </div>

      <button
        onClick={() => canRight && onWindowChange(windowStart + 1)}
        disabled={!canRight}
        className={canRight ? 'text-dust hover:text-bone transition-colors' : 'text-dust/20 cursor-default'}
      >
        <ChevronRight size={12} />
      </button>

      {/* Always-visible manual edit field */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="+00"
        className="ml-auto w-12 bg-carbon border border-border-default rounded px-1.5 py-0.5 text-xs text-bone text-right placeholder:text-dust outline-none focus:border-dust transition-colors"
      />
    </div>
  )
}

// ── DropdownRow ───────────────────────────────────────────────────────────────

function DropdownRow({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-ash">
      <span className="text-xs text-dust">{label}</span>
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
    </div>
  )
}
