import { useSimulationStore } from '../store/simulationStore'

const STRATEGY_LABELS: Record<string, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'Provide Liquidity',
}

const SCENARIO_LABELS: Record<string, string> = {
  baseline:       'Baseline',
  bull:           'Bull Run',
  bear:           'Bear Market',
  high_volatility:'High Volatility',
  black_swan:     'Black Swan',
}

interface RowProps {
  label: string
  value: string
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-dust">{label}</span>
      <span className="text-xs text-bone font-medium truncate max-w-[180px] text-right">{value}</span>
    </div>
  )
}

export default function ModelSnapshot() {
  const { config } = useSimulationStore()

  const name     = config?.name?.trim()             || '—'
  const capital  = config?.capitalAllocation
    ? `$${config.capitalAllocation.toLocaleString()}`
    : '—'
  const strategy = config?.strategy
    ? (STRATEGY_LABELS[config.strategy] ?? config.strategy)
    : '—'
  const scenario = config?.marketScenario
    ? (SCENARIO_LABELS[config.marketScenario] ?? config.marketScenario)
    : '—'
  const period   = config?.timePeriodDays
    ? `${config.timePeriodDays}d`
    : '—'
  const bands    = config
    ? `${config.lowerBand > 0 ? '+' : ''}${config.lowerBand}% / +${config.upperBand}%`
    : '—'

  return (
    <div className="px-4 py-3 border-t border-border-default bg-carbon shrink-0 flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-widest text-dust/60 font-medium">Model Snapshot</span>
      <div className="flex flex-col gap-1.5">
        <Row label="Name"     value={name}     />
        <Row label="Capital"  value={capital}  />
        <Row label="Strategy" value={strategy} />
        <Row label="Scenario" value={scenario} />
        <Row label="Period"   value={period}   />
        <Row label="Bands"    value={bands}    />
      </div>
    </div>
  )
}
