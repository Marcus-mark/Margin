import { useSimulationStore, type SimulationPhase } from '../store/simulationStore'

const STATE_MESSAGES: Record<SimulationPhase, string> = {
  INIT:     'Start by filling in your simulation inputs on the left.',
  CONFIG:   'Inputs ready. Click Run Simulation when ready.',
  RUNNING:  'Calculating...',
  COMPUTED: 'Results ready.',
  SAVED:    'Simulation saved.',
  ERROR:    'Something went wrong.',
}

const TEST_STATES: SimulationPhase[] = ['INIT', 'CONFIG', 'RUNNING', 'COMPUTED', 'SAVED', 'ERROR']

export default function SimulationWorkspace() {
  const { state, setConfig, startRun, setResults, setError, saveSimulation, reset } = useSimulationStore()

  // Forces the store into any state with the minimum required payload
  const forceState = (target: SimulationPhase) => {
    reset()
    if (target === 'INIT')     return
    if (target === 'CONFIG')   return setConfig({ name: 'Test', capitalAllocation: 1000, strategy: 'hold_asset', marketScenario: 'baseline', riskParameters: { leverageCap: null, exposureCap: null, volatilitySensitivity: null } })
    if (target === 'RUNNING')  { setConfig({ name: 'Test', capitalAllocation: 1000, strategy: 'hold_asset', marketScenario: 'baseline', riskParameters: { leverageCap: null, exposureCap: null, volatilitySensitivity: null } }); return startRun() }
    if (target === 'COMPUTED') { setConfig({ name: 'Test', capitalAllocation: 1000, strategy: 'hold_asset', marketScenario: 'baseline', riskParameters: { leverageCap: null, exposureCap: null, volatilitySensitivity: null } }); startRun(); return setResults({ expectedYieldMin: 3.8, expectedYieldMax: 6.2, riskLevel: 'moderate', maxDrawdown: 12.4, sharpeRatio: 1.3, impermanentLoss: null, timeHorizonDays: 30, computedAt: new Date().toISOString() }) }
    if (target === 'SAVED')    { setConfig({ name: 'Test', capitalAllocation: 1000, strategy: 'hold_asset', marketScenario: 'baseline', riskParameters: { leverageCap: null, exposureCap: null, volatilitySensitivity: null } }); startRun(); setResults({ expectedYieldMin: 3.8, expectedYieldMax: 6.2, riskLevel: 'moderate', maxDrawdown: 12.4, sharpeRatio: 1.3, impermanentLoss: null, timeHorizonDays: 30, computedAt: new Date().toISOString() }); return saveSimulation('save_001') }
    if (target === 'ERROR')    return setError({ code: 'CALC_FAILED', message: 'Something went wrong.' })
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left panel — inputs */}
      <div className="w-[420px] shrink-0 bg-graphite border-r border-border-default overflow-y-auto" />

      {/* Right panel — outputs */}
      <div className="flex flex-1 flex-col bg-carbon overflow-hidden">

        {/* ── DEV: state tester — remove in Phase 8 ── */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-ash shrink-0">
          <span className="text-[10px] text-dust uppercase tracking-widest mr-1">Test state</span>
          {TEST_STATES.map(s => (
            <button
              key={s}
              onClick={() => forceState(s)}
              className={[
                'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                state === s
                  ? 'bg-oxide text-carbon'
                  : 'bg-graphite text-dust hover:text-bone border border-border-default',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>

        {/* State-driven content */}
        <div className="flex flex-1 items-center justify-center px-8 overflow-y-auto">
          <p className="text-sm text-dust text-center max-w-sm">
            {STATE_MESSAGES[state]}
          </p>
        </div>

      </div>

    </div>
  )
}
