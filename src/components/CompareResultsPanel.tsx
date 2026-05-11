import { ArrowUpRight } from 'lucide-react'
import { useCompareStore } from '../store/compareStore'
import type { StrategyCompareResult, AIInsights } from '../store/compareStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number): string {
  return '$ ' + Math.round(Math.abs(n)).toLocaleString('en-US')
}

// ── Comparison table ──────────────────────────────────────────────────────────

function CompareTable({ strategies, baseline }: {
  strategies: StrategyCompareResult[]
  baseline:   string  // strategy value of the baseline
}) {
  const colCount  = strategies.length
  const metricCls = 'py-[13px] px-4 text-[13px] text-dust shrink-0 w-[168px]'
  const cellCls   = 'py-[13px] px-4 text-[13px] text-bone flex-1 min-w-0'
  const isBase    = (s: StrategyCompareResult) => s.strategy === baseline

  return (
    <div className="w-full border border-border-default rounded-xl overflow-hidden" style={{ gridTemplateColumns: `168px repeat(${colCount}, 1fr)` }}>

      {/* Header row */}
      <div className="flex border-b border-border-default bg-ash/60">
        <div className={metricCls + ' text-dust/60 text-[11px] font-medium tracking-wide uppercase'}>Metric</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls + ' font-medium'}>
            {s.label}
          </div>
        ))}
      </div>

      {/* 1 — Max Drawdown */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Max Drawdown</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>
            <span className={isBase(s) ? 'text-bone' : 'text-ochre'}>
              {(s.maxDrawdownPct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* 2 — Capital at Risk */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Capital at Risk</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>{usd(s.capitalAtRiskUSD)}</div>
        ))}
      </div>

      {/* 3 — Volatility Exposure */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Volatility Exposure</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>{s.volatilityExposureLabel}</div>
        ))}
      </div>

      {/* 4 — Time to Recovery */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Time to Recovery</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>
            {Math.round(s.timeToRecoveryDays)} days
          </div>
        ))}
      </div>

      {/* 5 — Impermanent Loss */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Impermanent Loss</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>
            {s.ilPercent !== null
              ? <span className="text-ochre">{s.ilPercent.toFixed(1)}% additional loss</span>
              : <span className="text-dust/40">—</span>
            }
          </div>
        ))}
      </div>

      {/* 6 — Expected Yield */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Expected Yield</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>
            <span>{s.grossYieldDisplay}</span>
            {s.ilImpactDisplay && (
              <span className="text-ochre ml-1">({s.ilImpactDisplay})</span>
            )}
          </div>
        ))}
      </div>

      {/* 7 — Yield vs Risk Offset */}
      <div className="flex">
        <div className={metricCls}>Yield vs Risk Offset</div>
        {strategies.map(s => (
          <div key={s.strategy} className={cellCls}>
            {s.yieldVsRiskOffset !== null
              ? s.yieldVsRiskOffset.toFixed(2)
              : <span className="text-dust/40">—</span>
            }
          </div>
        ))}
      </div>

    </div>
  )
}

// ── AI cards ──────────────────────────────────────────────────────────────────

function Card({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <div className="border border-border-default rounded-xl bg-graphite overflow-hidden">
      {header && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          {header}
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function SummaryCard({ insights }: { insights: AIInsights }) {
  return (
    <Card header={
      <>
        <span className="text-[13px] text-bone font-medium">Summary</span>
        <ArrowUpRight size={14} className="text-dust" />
      </>
    }>
      <p className="text-[13px] text-ochre leading-relaxed">{insights.summary}</p>
    </Card>
  )
}

function WhyRiskCard({ insights }: { insights: AIInsights }) {
  return (
    <Card header={
      <span className="text-[13px] text-bone font-medium">{insights.whyRiskTitle}</span>
    }>
      <ul className="flex flex-col gap-2">
        {insights.whyRiskBullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-ochre text-[12px] mt-[1px] shrink-0">✓</span>
            <span className="text-[13px] text-bone leading-snug">{bullet}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SensitivityCard({ insights }: { insights: AIInsights }) {
  return (
    <Card header={
      <span className="text-[13px] text-bone font-medium">Assumption Sensitivity</span>
    }>
      <div className="flex flex-col gap-3">
        {insights.sensitivityRows.map((row, i) => (
          <div key={i} className="flex items-start justify-between gap-4">
            <span className="text-[13px] text-dust leading-snug shrink-0 max-w-[55%]">{row.label}</span>
            <span className="text-[13px] text-right leading-snug">
              <span className="text-bone font-medium">{row.effect} </span>
              <span className="text-green-400 font-semibold">{row.highlight}</span>
            </span>
          </div>
        ))}
        <p className="text-[13px] text-dust leading-snug pt-1 border-t border-border-default mt-1">
          {insights.sensitivityNote}
        </p>
      </div>
    </Card>
  )
}

function RecapCard({ insights }: { insights: AIInsights }) {
  return (
    <Card>
      <div className="flex flex-col gap-1.5">
        {insights.finalRecap.map((line, i) => (
          <p key={i} className="text-[13px] text-bone leading-relaxed">{line}</p>
        ))}
      </div>
    </Card>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function CompareResultsPanel({ onSave }: { onSave?: () => void }) {
  const { results, config, phase } = useCompareStore()
  if (!results || !config) return null

  return (
    <div className="w-full flex flex-col gap-6 px-6 py-6">

      <CompareTable
        strategies={results.strategies}
        baseline={config.baselineStrategy}
      />

      <SummaryCard     insights={results.insights} />
      <WhyRiskCard     insights={results.insights} />
      <SensitivityCard insights={results.insights} />
      <RecapCard       insights={results.insights} />

      {/* Save CTA */}
      <div className="flex justify-center pt-2 pb-4">
        {phase === 'SAVED' ? (
          <button
            disabled
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-ash border border-border-default text-dust cursor-not-allowed"
          >
            Comparison Saved
          </button>
        ) : (
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-oxide text-carbon hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save Comparison
          </button>
        )}
      </div>

    </div>
  )
}
