import { ArrowUpRight } from 'lucide-react'
import { useSimulationStore, type SimulationPhase } from '../store/simulationStore'
import { runSimulation } from '../engine'
import type { SimulationConfig as EngineConfig } from '../types'
import InputPanel from './InputPanel'

const STATE_MESSAGES: Record<SimulationPhase, string> = {
  INIT:     'Start by filling in your simulation inputs on the left.',
  CONFIG:   'Inputs ready. Click Run Simulation when ready.',
  RUNNING:  'Calculating...',
  COMPUTED: 'Results ready.',
  SAVED:    'Simulation saved.',
  ERROR:    'Something went wrong.',
}

export default function SimulationWorkspace() {
  const { state, error } = useSimulationStore()

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left panel — inputs */}
      <div className="w-[420px] shrink-0 bg-graphite border-r border-border-default flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <InputPanel />
        </div>
        <div className="px-4 py-3 border-t border-border-default shrink-0 flex justify-end">
          <RunButton />
        </div>
      </div>

      {/* Right panel — outputs */}
      <div className="flex flex-1 items-center justify-center px-8 bg-carbon overflow-y-auto">
        <p className="text-sm text-dust text-center max-w-sm">
          {state === 'ERROR' && error?.message
            ? error.message
            : STATE_MESSAGES[state]}
        </p>
      </div>

    </div>
  )
}

// ── Run / Edit button ─────────────────────────────────────────────────────────

function RunButton() {
  const {
    state, config, scenarioModifiers,
    startRun, setResults, setError, editInputs,
  } = useSimulationStore()

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
      const result = await runSimulation(engineConfig)
      setResults(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError({ code: 'CALC_ERROR', message })
    }
  }

  // After a run completes or errors, offer to go back to editing
  if (state === 'COMPUTED' || state === 'SAVED' || state === 'ERROR') {
    return (
      <button
        onClick={editInputs}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ash border border-border-default text-bone hover:border-dust transition-colors"
      >
        Edit Inputs
      </button>
    )
  }

  return (
    <button
      onClick={handleRun}
      disabled={!canRun || state === 'RUNNING'}
      className={[
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
        canRun && state !== 'RUNNING'
          ? 'bg-oxide text-carbon hover:opacity-90 cursor-pointer'
          : 'bg-ash border border-border-default text-dust cursor-not-allowed',
      ].join(' ')}
    >
      <ArrowUpRight size={14} />
      {state === 'RUNNING' ? 'Running…' : 'Run Simulation'}
    </button>
  )
}
