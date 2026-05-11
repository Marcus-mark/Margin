import { ArrowUpRight } from 'lucide-react'
import { useScenarioCompareStore } from '../store/scenarioCompareStore'
import type { ScenarioColumnResult, ScenarioAIInsights } from '../store/scenarioCompareStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number): string {
  return '$ ' + Math.round(Math.abs(n)).toLocaleString('en-US')
}

// ── Comparison table ──────────────────────────────────────────────────────────

function ScenarioTable({ columns }: { columns: ScenarioColumnResult[] }) {
  const metricCls = 'py-[13px] px-4 text-[13px] text-dust shrink-0 w-[168px]'
  const cellCls   = 'py-[13px] px-4 text-[13px] text-bone flex-1 min-w-0'

  const accent = (col: ScenarioColumnResult) => col.isBaseline ? 'text-bone' : 'text-ochre'

  return (
    <div className="w-full border border-border-default rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex border-b border-border-default bg-ash/60">
        <div className={metricCls + ' text-dust/60 text-[11px] font-medium tracking-wide uppercase'}>Metric</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls + ' font-medium'}>
            {col.scenarioName}
          </div>
        ))}
      </div>

      {/* 1 — Max Drawdown */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Max Drawdown</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>
            <span className={accent(col)}>
              {(col.maxDrawdownPct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* 2 — Capital at Risk */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Capital at Risk</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>{usd(col.capitalAtRiskUSD)}</div>
        ))}
      </div>

      {/* 3 — Volatility Exposure */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Volatility Exposure</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>{col.volatilityExposureLabel}</div>
        ))}
      </div>

      {/* 4 — Time to Recovery */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Time to Recovery</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>
            {Math.round(col.timeToRecoveryDays)} days
          </div>
        ))}
      </div>

      {/* 5 — Impermanent Loss */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Impermanent Loss</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>
            {col.ilPercent !== null
              ? <span className={accent(col)}>{col.ilPercent.toFixed(0)}%</span>
              : <span className="text-dust/40">—</span>
            }
          </div>
        ))}
      </div>

      {/* 6 — Expected Yield */}
      <div className="flex border-b border-border-default">
        <div className={metricCls}>Expected Yield</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>
            <span>{col.grossYieldDisplay}</span>
            {col.ilImpactDisplay && (
              <span className="text-ochre ml-1">({col.ilImpactDisplay})</span>
            )}
          </div>
        ))}
      </div>

      {/* 7 — Yield vs Risk Offset */}
      <div className="flex">
        <div className={metricCls}>Yield vs Risk Offset</div>
        {columns.map(col => (
          <div key={col.scenarioId} className={cellCls}>
            {col.yieldVsRiskOffset !== null
              ? col.yieldVsRiskOffset.toFixed(2)
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

function SummaryCard({ insights }: { insights: ScenarioAIInsights }) {
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

function WhyRiskCard({ insights }: { insights: ScenarioAIInsights }) {
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

function SensitivityCard({ insights }: { insights: ScenarioAIInsights }) {
  return (
    <Card header={
      <span className="text-[13px] text-bone font-medium">Assumption Sensitivity</span>
    }>
      <div className="flex flex-col divide-y divide-border-default">
        {insights.sensitivityNotes.map((note, i) => (
          <p key={i} className="text-[13px] text-dust leading-relaxed py-3 first:pt-0 last:pb-0">
            {note}
          </p>
        ))}
      </div>
    </Card>
  )
}

function RecapCard({ insights }: { insights: ScenarioAIInsights }) {
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

export default function ScenarioCompareResultsPanel({ onSave }: { onSave?: () => void }) {
  const { results, phase } = useScenarioCompareStore()
  if (!results) return null

  return (
    <div className="w-full flex flex-col gap-6 px-6 py-6">

      <ScenarioTable columns={results.columns} />
      <SummaryCard     insights={results.insights} />
      <WhyRiskCard     insights={results.insights} />
      <SensitivityCard insights={results.insights} />
      <RecapCard       insights={results.insights} />

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
