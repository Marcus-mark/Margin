import { ArrowUpRight } from 'lucide-react'
import { useSimulationStore } from '../store/simulationStore'
import { runSimulation } from '../engine'
import type { SimulationConfig as EngineConfig } from '../types'
import InputPanel from './InputPanel'
import ResultsPanel from './ResultsPanel'

// ── Stale results banner ──────────────────────────────────────────────────────

function StaleBanner() {
  return (
    <div className="w-full px-4 py-2.5 bg-ochre/10 border-b border-ochre/25 flex items-center gap-2 shrink-0">
      <span className="text-[12px] text-ochre leading-snug">
        These results are from a previous run. Run again to update.
      </span>
    </div>
  )
}

// ── Right-panel states ────────────────────────────────────────────────────────

const RUNNING_STEPS = [
  'Initializing deterministic risk engine ....',
  'Processing market scenario assumptions ....',
  'Calculating strategy exposure curves ....',
  'Simulating downside distribution ....',
  'Generating capital risk profile ....',
]

function EmptyPanel() {
  return (
    <div className="flex flex-1 items-center justify-center px-8">
      <div className="text-center max-w-[360px]">
        <p className="text-[20px] text-bone font-medium mb-3 leading-snug">
          No Simulation Data Generated
        </p>
        <p className="text-[13px] text-dust leading-relaxed">
          MARGIN does not display hypothetical outcomes without defined inputs.
          All results are computed from explicit capital allocation, strategy selection, and
          market scenario assumptions.
        </p>
      </div>
    </div>
  )
}

function RunningPanel() {
  return (
    <div className="flex flex-col items-center px-8 pt-[80px]">
      <p className="text-[20px] text-bone font-medium mb-3 leading-snug">
        Running Simulation engine
      </p>
      <div className="flex flex-col gap-[5px]">
        {RUNNING_STEPS.map((step, i) => (
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

// ── Workspace ─────────────────────────────────────────────────────────────────

function ErrorPanel() {
  const { error, retryFromError } = useSimulationStore()
  return (
    <div className="flex flex-1 items-center justify-center px-8">
      <div className="w-full max-w-[360px] border border-red-500/20 rounded-xl bg-red-500/5 px-6 py-7 flex flex-col items-center gap-4 text-center">
        <p className="text-[17px] font-medium text-red-400 leading-snug">Simulation Failed</p>
        <p className="text-[13px] text-dust leading-relaxed">
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={retryFromError}
          className="mt-1 px-4 py-2 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export default function SimulationWorkspace({ onCompare }: { onCompare?: () => void }) {
  const { state, results, isStale } = useSimulationStore()

  const showStaleBanner = state === 'CONFIG' && isStale && !!results

  function rightContent() {
    if (state === 'RUNNING') return <RunningPanel />
    if (state === 'ERROR') return <ErrorPanel />
    if (results) return <ResultsPanel />
    return <EmptyPanel />
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left panel — inputs */}
      <div className="w-[420px] shrink-0 bg-graphite border-r border-border-default flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <InputPanel />
        </div>
        <div className="px-4 py-3 border-t border-border-default shrink-0 flex justify-end">
          <RunButton onCompare={onCompare} />
        </div>
      </div>

      {/* Right panel — outputs */}
      <div className="flex flex-1 flex-col bg-carbon overflow-y-auto">
        {showStaleBanner && <StaleBanner />}
        {rightContent()}
      </div>

    </div>
  )
}

// ── Run / Edit button ─────────────────────────────────────────────────────────

function RunButton({ onCompare }: { onCompare?: () => void }) {
  const {
    state, config, scenarioModifiers, results,
    startRun, setResults, setError, editInputs,
  } = useSimulationStore()

  const running  = state === 'RUNNING'
  const editable = state === 'INIT' || state === 'CONFIG'

  const canRun = editable
    && !!config?.name?.trim()
    && (config?.capitalAllocation ?? 0) >= 10
    && !!config?.strategy
    && !!config?.marketScenario

  const handleRun = async () => {
    if (!canRun || !config) return
    startRun()

    const engineConfig: EngineConfig = {
      name:              config.name,
      capitalAllocation: config.capitalAllocation,
      assets:            config.assets,
      strategy:          config.strategy!,
      marketScenario:    config.marketScenario!,
      riskParameters:    config.riskParameters,
      scenarioModifiers: scenarioModifiers ?? {
        stressValue:          '1.0x',
        tailRisk:             '1.0x',
        rebalanceSensitivity: 'Medium',
      },
      upperBand:      config.upperBand,
      lowerBand:      config.lowerBand,
      volatility:     config.volatility as EngineConfig['volatility'],
      correlation:    config.correlation,
      timePeriodDays: config.timePeriodDays,
      stakeApy:       config.stakeApy  ?? undefined,
      lpFeeApr:       config.lpFeeApr  ?? undefined,
      assetA:         config.assetA,
      assetB:         config.assetB,
    }

    try {
      const [result] = await Promise.all([
        runSimulation(engineConfig),
        new Promise(resolve => setTimeout(resolve, 1200)),
      ])
      setResults(result as Awaited<ReturnType<typeof runSimulation>>)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError({ code: 'CALC_ERROR', message })
    }
  }

  const secBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors'
  const priBtn = (disabled: boolean) => [
    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
    disabled
      ? 'bg-ash border border-border-default text-dust cursor-not-allowed'
      : 'bg-oxide text-carbon hover:opacity-90 cursor-pointer',
  ].join(' ')

  // ERROR — editing possible but no valid results to compare
  if (state === 'ERROR') {
    return (
      <button onClick={editInputs} className={secBtn}>
        Edit Inputs
      </button>
    )
  }

  // Post-run, not yet editing
  if (state === 'COMPUTED' || state === 'SAVED') {
    return (
      <div className="flex items-center gap-2">
        <button className={secBtn} onClick={onCompare}>Compare Strategy</button>
        <button onClick={editInputs} className={secBtn}>Edit Inputs</button>
      </div>
    )
  }

  // Edit mode — results exist, user is adjusting inputs
  if (editable && results) {
    return (
      <div className="flex items-center gap-2">
        <button className={secBtn} onClick={onCompare}>Compare Strategy</button>
        <button
          onClick={handleRun}
          disabled={!canRun}
          className={priBtn(!canRun)}
        >
          <ArrowUpRight size={14} />
          Run Simulation
        </button>
      </div>
    )
  }

  // Default — no prior run
  return (
    <button
      onClick={handleRun}
      disabled={!canRun || running}
      className={priBtn(!canRun || running)}
    >
      <ArrowUpRight size={14} />
      {running ? 'Running…' : 'Run Simulation'}
    </button>
  )
}
