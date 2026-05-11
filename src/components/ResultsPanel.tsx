import { useSimulationStore } from '../store/simulationStore'

// ── Badge config ──────────────────────────────────────────────────────────────

const BADGE: Record<string, { label: string; cls: string }> = {
  low:      { label: 'LOW',      cls: 'bg-ash text-dust border border-border-default' },
  moderate: { label: 'MODERATE', cls: 'bg-ochre/15 text-ochre border border-ochre/30' },
  high:     { label: 'HIGH',     cls: 'bg-oxide/15 text-oxide border border-oxide/30' },
  critical: { label: 'CRITICAL', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  extreme:  { label: 'EXTREME',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function volatilityLabel(score: number): string {
  if (score < 0.4)  return `Low (${score.toFixed(2)} beta equivalent)`
  if (score < 0.75) return `Moderate (${score.toFixed(2)} beta equivalent)`
  if (score < 1.5)  return `High (${score.toFixed(2)} beta equivalent)`
  return 'Extreme (Unstable Regime)'
}

function ilLabel(ilPct: number, riskLevel: string): string {
  const abs = Math.abs(ilPct)
  if (abs < 2)  return 'Low'
  if (abs < 5)  return 'Moderate'
  if (abs < 10) return 'High'
  if (riskLevel === 'critical' || riskLevel === 'extreme') return 'Critical (Primary Loss Driver)'
  return 'Severe'
}

function usd(n: number): string {
  return '$ ' + Math.round(Math.abs(n)).toLocaleString('en-US')
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({ label, children, last = false }: {
  label:    string
  children: React.ReactNode
  last?:    boolean
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-[13px]${last ? '' : ' border-b border-border-default'}`}>
      <span className="text-[13px] text-dust shrink-0 pr-4">{label}</span>
      <div className="text-[13px] text-right">{children}</div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function ResultsPanel({ onSave }: { onSave?: () => void }) {
  const { results, config, state } = useSimulationStore()
  if (!results) return null

  const r       = results
  const level   = r.riskLevel
  const badge   = BADGE[level] ?? BADGE.moderate
  const isCrit  = level === 'critical' || level === 'extreme'
  const hasIL   = r.ilPercent !== null

  // Capital remaining (shown for critical)
  const remaining = (config?.capitalAllocation ?? 0) - r.capitalAtRiskUSD

  // Yield-risk offset
  const offset = r.yieldRiskOffset !== null ? r.yieldRiskOffset * 100 : null

  // Risk clarification label
  const riskLabel = level.charAt(0).toUpperCase() + level.slice(1)

  return (
    <div className="w-full">

      {/* ── Badge area (83 px, centred) ─────────────────────────────────────── */}
      <div className="h-[83px] flex items-center justify-center">
        <span className={`px-3 py-[3px] rounded text-[11px] font-semibold tracking-[0.07em] ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* ── Top full-width separator ────────────────────────────────────────── */}
      <div className="border-t border-border-default" />

      {/* ── Card — left + right borders, graphite bg, 10 % side margins ──────── */}
      <div className="mx-[10%] border-x border-border-default bg-graphite">

        {/* 1 · Max draw-down */}
        <Row label="Max draw-down">
          <span className="text-ochre">
            - {(Math.abs(r.maxDrawdownPct) * 100).toFixed(1)}%
          </span>
          <span className="text-dust/60 text-[11px] ml-2">
            {usd(r.maxDrawdownUSD)}
          </span>
        </Row>

        {/* 2 · Capital at risk */}
        <Row label="Capital at risk">
          {isCrit && remaining > 0 ? (
            <>
              <span className="text-ochre">{usd(r.capitalAtRiskUSD)}</span>
              <span className="text-ochre/60 ml-2">(Remaining {usd(remaining)})</span>
            </>
          ) : (
            <>
              <span className="text-ochre">{usd(r.capitalAtRiskUSD)}</span>
              <span className="text-dust/60 text-[11px] ml-2">
                {(r.capitalAtRiskPct * 100).toFixed(1)}%
              </span>
            </>
          )}
        </Row>

        {/* 3 · Volatility exposure */}
        <Row label="Volatility exposure">
          <span className="text-bone">{volatilityLabel(r.volatilityExposure)}</span>
        </Row>

        {/* 4 · Impermanent Loss Exposure (LP strategies only) */}
        {hasIL && (
          <Row label="Impermanent Loss Exposure">
            <span className="text-bone">{ilLabel(r.ilPercent!, level)}</span>
          </Row>
        )}

        {/* 5 · Expected recovery time */}
        <Row label="Expected recovery time">
          <span className="text-bone">
            {Math.round(r.drawdownDurationDays)} – {Math.round(r.timeToRecoveryDays)}{isCrit ? '+' : ''} days
          </span>
        </Row>

        {/* 6 · Risk clarification */}
        <Row label="Risk clarification">
          <span className="text-bone">{riskLabel}</span>
        </Row>

        {/* 7 · Expected yield range (projected return min → max in USD) */}
        <Row label="Expected yield range">
          <span className="text-ochre">
            {usd(r.projectedReturnMinUSD)} – {usd(r.projectedReturnMaxUSD)}
          </span>
        </Row>

        {/* 8 · Yield vs risk offset */}
        <Row label="Yield vs risk offset" last>
          {offset !== null ? (
            <span className={offset >= 0 ? 'text-green-400' : 'text-red-400'}>
              {offset >= 0 ? '+' : ''}{offset.toFixed(1)}%
            </span>
          ) : (
            <span className="text-dust">—</span>
          )}
        </Row>

      </div>

      {/* ── Bottom full-width separator ─────────────────────────────────────── */}
      <div className="border-t border-border-default" />

      {/* ── Save CTA ────────────────────────────────────────────────────────── */}
      <div className="flex justify-center py-6 pb-8">
        {state === 'COMPUTED' ? (
          <button
            onClick={onSave}
            className="px-8 py-3 rounded-xl text-sm font-medium bg-oxide text-carbon hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save Simulation
          </button>
        ) : state === 'SAVED' ? (
          <button
            disabled
            className="px-8 py-3 rounded-xl text-sm font-medium bg-ash border border-border-default text-dust cursor-not-allowed"
          >
            Simulation Saved
          </button>
        ) : null}
      </div>

    </div>
  )
}
