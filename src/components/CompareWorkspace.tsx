import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useCompareStore } from '../store/compareStore'
import { useScenarioCompareStore } from '../store/scenarioCompareStore'
import { runComparison } from '../engine/compareEngine'
import { runScenarioComparison } from '../engine/scenarioCompareEngine'
import CompareInputPanel from './CompareInputPanel'
import CompareResultsPanel from './CompareResultsPanel'
import ScenarioCompareInputPanel from './ScenarioCompareInputPanel'
import ScenarioCompareResultsPanel from './ScenarioCompareResultsPanel'

type CompareMode = 'strategy' | 'scenario'

// ── Shared state panels ───────────────────────────────────────────────────────

function StaleBanner() {
  return (
    <div className="w-full px-4 py-2.5 bg-ochre/10 border-b border-ochre/25 flex items-center shrink-0">
      <span className="text-[12px] text-ochre">
        These results are from a previous run. Adjust inputs and run again to update.
      </span>
    </div>
  )
}

function EmptyPanel({ mode }: { mode: CompareMode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8">
      <div className="text-center max-w-[360px]">
        <p className="text-[20px] text-bone font-medium mb-3 leading-snug">
          No Comparison Data Generated
        </p>
        <p className="text-[13px] text-dust leading-relaxed">
          {mode === 'strategy'
            ? 'Select at least two strategies and configure your scenario, then run the comparison to see a side-by-side risk and yield breakdown.'
            : 'Configure your scenario blocks and run the comparison to see how the same strategy performs across different market conditions.'
          }
        </p>
      </div>
    </div>
  )
}

function RunningPanel({ mode }: { mode: CompareMode }) {
  const steps = mode === 'strategy'
    ? [
        'Initializing strategy comparison engine ....',
        'Simulating Liquidity Provision exposure ....',
        'Simulating Hold and Stake strategies ....',
        'Cross-referencing risk-adjusted returns ....',
        'Generating AI comparison insights ....',
      ]
    : [
        'Initializing scenario comparison engine ....',
        'Simulating baseline market conditions ....',
        'Simulating stress scenario exposures ....',
        'Calculating cross-scenario divergence ....',
        'Generating AI scenario insights ....',
      ]

  return (
    <div className="flex flex-col items-center px-8 pt-[80px]">
      <p className="text-[20px] text-bone font-medium mb-3 leading-snug">
        Running Comparison Engine
      </p>
      <div className="flex flex-col gap-[5px]">
        {steps.map((step, i) => (
          <p
            key={step}
            className="text-[13px] text-dust text-center"
            style={{
              opacity: 0,
              animation: 'fade-in-up 0.35s ease forwards',
              animationDelay: `${i * 160}ms`,
            }}
          >
            {step}
          </p>
        ))}
      </div>
    </div>
  )
}

function ErrorPanel({ mode }: { mode: CompareMode }) {
  const stratStore    = useCompareStore()
  const scenarioStore = useScenarioCompareStore()
  const { error, reset } = mode === 'strategy' ? stratStore : scenarioStore

  return (
    <div className="flex flex-1 items-center justify-center px-8">
      <div className="w-full max-w-[360px] border border-red-500/20 rounded-xl bg-red-500/5 px-6 py-7 flex flex-col items-center gap-4 text-center">
        <p className="text-[17px] font-medium text-red-400 leading-snug">Comparison Failed</p>
        <p className="text-[13px] text-dust leading-relaxed">
          {error ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="mt-1 px-4 py-2 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

// ── Footer CTA buttons ────────────────────────────────────────────────────────

function StrategyFooter() {
  const { phase, config, startRun, setResults, setError } = useCompareStore()

  const running = phase === 'RUNNING'
  const canRun  = !running
    && !!config
    && (config.capitalAllocation ?? 0) >= 10
    && !!config.marketScenario
    && config.selectedStrategies.length >= 2

  const secBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors'
  const priCls = (disabled: boolean) => [
    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors',
    disabled
      ? 'bg-ash border border-border-default text-dust cursor-not-allowed'
      : 'bg-oxide text-carbon hover:opacity-90 cursor-pointer',
  ].join(' ')

  const handleRun = async () => {
    if (!canRun || !config) return
    startRun()
    try {
      const [result] = await Promise.all([
        runComparison(config),
        new Promise(resolve => setTimeout(resolve, 1200)),
      ])
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (phase === 'COMPUTED') {
    return (
      <button onClick={() => useCompareStore.getState().reset()} className={secBtn}>
        Edit Inputs
      </button>
    )
  }

  return (
    <button onClick={handleRun} disabled={!canRun} className={priCls(!canRun)}>
      <ArrowUpRight size={14} />
      {running ? 'Running…' : 'Run Comparison'}
    </button>
  )
}

function ScenarioFooter() {
  const { phase, config, startRun, setResults, setError, editInputs } =
    useScenarioCompareStore()

  const running = phase === 'RUNNING'
  const canRun  = !running
    && !!config
    && (config.capitalAllocation ?? 0) >= 10
    && config.scenarios.length >= 2

  const secBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors'
  const priCls = (disabled: boolean) => [
    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors',
    disabled
      ? 'bg-ash border border-border-default text-dust cursor-not-allowed'
      : 'bg-oxide text-carbon hover:opacity-90 cursor-pointer',
  ].join(' ')

  const handleRun = async () => {
    if (!canRun || !config) return
    startRun()
    try {
      const [result] = await Promise.all([
        runScenarioComparison(config),
        new Promise(resolve => setTimeout(resolve, 1200)),
      ])
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (phase === 'COMPUTED') {
    return (
      <button onClick={editInputs} className={secBtn}>
        Edit Inputs
      </button>
    )
  }

  return (
    <button onClick={handleRun} disabled={!canRun} className={priCls(!canRun)}>
      <ArrowUpRight size={14} />
      {running ? 'Running…' : 'Run Comparison'}
    </button>
  )
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export default function CompareWorkspace() {
  const [mode, setMode] = useState<CompareMode>('strategy')

  const stratStore    = useCompareStore()
  const scenarioStore = useScenarioCompareStore()

  // Derive per-mode state
  const phase   = mode === 'strategy' ? stratStore.phase   : scenarioStore.phase
  const results = mode === 'strategy' ? stratStore.results : scenarioStore.results
  const isStale = mode === 'scenario' ? scenarioStore.isStale : false

  function rightContent() {
    if (phase === 'RUNNING') return <RunningPanel mode={mode} />
    if (phase === 'ERROR')   return <ErrorPanel   mode={mode} />
    if (results) {
      return mode === 'strategy'
        ? <CompareResultsPanel />
        : <ScenarioCompareResultsPanel />
    }
    return <EmptyPanel mode={mode} />
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left panel */}
      <div className="w-[420px] shrink-0 bg-graphite border-r border-border-default flex flex-col overflow-hidden">

        {/* Sub-navigation */}
        <div className="flex border-b border-border-default shrink-0">
          {(['strategy', 'scenario'] as CompareMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'px-4 py-2.5 text-[13px] transition-colors',
                mode === m
                  ? 'font-medium text-bone border-b-2 border-oxide -mb-px'
                  : 'text-dust hover:text-bone',
              ].join(' ')}
            >
              {m === 'strategy' ? 'Compare Strategy' : 'Compare Scenario'}
            </button>
          ))}
        </div>

        {/* Scrollable inputs */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'strategy' ? <CompareInputPanel /> : <ScenarioCompareInputPanel />}
        </div>

        {/* Footer CTA */}
        <div className="px-4 py-3 border-t border-border-default shrink-0 flex justify-center">
          {mode === 'strategy' ? <StrategyFooter /> : <ScenarioFooter />}
        </div>

      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col bg-carbon overflow-y-auto">
        {isStale && results && <StaleBanner />}
        {rightContent()}
      </div>

    </div>
  )
}
