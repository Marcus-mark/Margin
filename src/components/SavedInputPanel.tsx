import { useSimulationStore } from '../store/useSimulationStore'

const STRATEGY_LABELS: Record<string, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'Liquidity Provision',
}

const SCENARIO_LABELS: Record<string, string> = {
  baseline:        'Baseline Market Conditions',
  bull:            'Bull Expansion',
  bear:            'Bear Market',
  high_volatility: 'High Volatility',
  black_swan:      'Black Swan',
}

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 bg-ash/30 border-b border-border-default">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-dust/70">
        {title}
      </span>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between px-4 py-3 border-b border-border-default last:border-0">
      <span className="text-[12px] text-dust shrink-0 mr-4">{label}</span>
      <span className={`text-[13px] text-right ${accent ? 'text-ochre' : 'text-bone'}`}>
        {value}
      </span>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function SavedInputPanel() {
  const { config, scenarioModifiers } = useSimulationStore()
  if (!config) return null

  const mods = scenarioModifiers

  return (
    <div className="flex flex-col border-b border-border-default">

      {/* Simulation name */}
      <div className="px-4 py-5 border-b border-border-default">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-dust/70 mb-1.5">
          Simulation
        </p>
        <p className="text-[15px] font-medium text-bone leading-snug">
          {config.name || 'Untitled Simulation'}
        </p>
      </div>

      {/* Capital */}
      <SectionHeader title="Portfolio" />
      <div className="border-b border-border-default">
        <Row
          label="Capital Allocation"
          value={`$ ${config.capitalAllocation.toLocaleString('en-US')}`}
        />
        {config.assets.map(a => (
          <Row key={a.id} label={a.symbol || 'Asset'} value={`${a.allocation}%`} />
        ))}
      </div>

      {/* Strategy */}
      <SectionHeader title="Strategy" />
      <div className="border-b border-border-default">
        <Row label="Type" value={STRATEGY_LABELS[config.strategy ?? ''] ?? '—'} />
        {config.strategy === 'stake_lend' && config.stakeApy != null && (
          <Row label="Stake APY" value={`${config.stakeApy}%`} />
        )}
        {config.strategy === 'provide_liquidity' && (
          <>
            {config.lpFeeApr != null && (
              <Row label="LP Fee APR" value={`${config.lpFeeApr}%`} />
            )}
            {config.assetA && config.assetB && (
              <Row label="Assets" value={`${config.assetA} / ${config.assetB}`} />
            )}
          </>
        )}
      </div>

      {/* Scenario */}
      <SectionHeader title="Market Scenario" />
      <div className="border-b border-border-default">
        <Row label="Preset" value={SCENARIO_LABELS[config.marketScenario ?? ''] ?? '—'} />
        <Row
          label="Price Band"
          value={`+${config.upperBand}% / ${config.lowerBand}%`}
        />
        <Row label="Volatility"   value={config.volatility} />
        <Row label="Correlation"  value={config.correlation} />
        <Row label="Time Period"  value={`${config.timePeriodDays} days`} />
      </div>

      {/* Risk modifiers */}
      {mods && (
        <>
          <SectionHeader title="Risk Modifiers" />
          <div>
            <Row label="Stress Amplifier"      value={mods.stressValue} />
            <Row label="Tail Risk"             value={mods.tailRisk} />
            <Row label="Rebalance Sensitivity" value={mods.rebalanceSensitivity} />
          </div>
        </>
      )}

    </div>
  )
}
