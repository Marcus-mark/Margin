import { create } from 'zustand'
import type { SimulationResult } from '../types'
import type { ScenarioModifiers } from '../data/scenarioPresets'

export type { ScenarioModifiers }

// ─── Simulation lifecycle states ─────────────────────────────────────────────

export type SimulationPhase =
  | 'INIT'      // No inputs, blank workspace
  | 'CONFIG'    // Inputs being filled or edited
  | 'RUNNING'   // Calculation in progress
  | 'COMPUTED'  // Results ready, inputs unchanged
  | 'SAVED'     // Snapshot persisted
  | 'ERROR'     // Calculation or save failed

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Strategy = 'hold_asset' | 'stake_lend' | 'provide_liquidity'

export type MarketScenario =
  | 'baseline'
  | 'bull'
  | 'bear'
  | 'high_volatility'
  | 'black_swan'

export type Asset = { id: string; symbol: string; allocation: string }

export interface SimulationConfig {
  // Core
  name:               string
  capitalAllocation:  number
  assets:             Asset[]
  strategy:           Strategy | null
  marketScenario:     MarketScenario | null
  riskParameters: {
    leverageCap:           number | null
    exposureCap:           number | null
    volatilitySensitivity: number | null
  }
  // Scenario details (set by ScenarioSetup)
  upperBand:      number   // price ceiling %, e.g. 12
  lowerBand:      number   // price floor %,   e.g. -10
  volatility:     string
  correlation:    string
  timePeriodDays: number
  // Strategy-specific (set by StrategySelection)
  stakeApy:  number | null
  lpFeeApr:  number | null
  assetA:    string
  assetB:    string
}

// Re-export the engine result type as the canonical results shape
export type SimulationResults = SimulationResult

export interface SimulationError {
  code: string
  message: string
  detail?: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: SimulationConfig = {
  name:              '',
  capitalAllocation: 0,
  assets:            [],
  strategy:          null,
  marketScenario:    null,
  riskParameters:    { leverageCap: null, exposureCap: null, volatilitySensitivity: null },
  upperBand:         12,
  lowerBand:         -10,
  volatility:        'Medium',
  correlation:       'Moderate Correlation',
  timePeriodDays:    30,
  stakeApy:          null,
  lpFeeApr:          null,
  assetA:            '',
  assetB:            '',
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface SimulationState {
  state:   SimulationPhase
  config:  SimulationConfig | null
  results: SimulationResults | null
  error:   SimulationError | null
  saveId:            string | null
  simulationGroupId: string | null
  version:           number
  isStale:           boolean

  scenarioModifiers: ScenarioModifiers | null

  // Actions
  setConfig:           (partial: Partial<SimulationConfig>) => void
  setScenarioModifiers:(m: ScenarioModifiers | null) => void
  startRun:            () => void
  setResults:          (results: SimulationResults) => void
  setError:            (error: SimulationError) => void
  editInputs:          () => void
  retryFromError:      () => void
  saveSimulation:      (saveId: string) => string  // returns simulationGroupId
  updateSavedName:     (name: string) => void
  reset:               () => void
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  state:             'INIT' as SimulationPhase,
  config:            null,
  results:           null,
  error:             null,
  saveId:            null,
  simulationGroupId: null,
  version:           1,
  isStale:           false,
  scenarioModifiers: null,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  ...INITIAL_STATE,

  setConfig: (partial) =>
    set(s => ({
      config: { ...DEFAULT_CONFIG, ...(s.config ?? {}), ...partial },
      state:  'CONFIG' as SimulationPhase,
      error:  null,
    })),

  setScenarioModifiers: (m) =>
    set({ scenarioModifiers: m }),

  startRun: () =>
    set({ state: 'RUNNING', error: null }),

  setResults: (results) =>
    set({ results, state: 'COMPUTED', isStale: false }),

  setError: (error) =>
    set({ error, state: 'ERROR' }),

  editInputs: () => {
    const { state } = get()
    if (state !== 'COMPUTED' && state !== 'SAVED' && state !== 'ERROR') return
    set({ state: 'CONFIG', isStale: true })
  },

  retryFromError: () => {
    if (get().state !== 'ERROR') return
    set({ state: 'CONFIG', error: null })
  },

  saveSimulation: (saveId) => {
    const { simulationGroupId, version } = get()
    const groupId = simulationGroupId ?? crypto.randomUUID()
    set({ saveId, simulationGroupId: groupId, state: 'SAVED', version: version + 1 })
    return groupId
  },

  updateSavedName: (name) =>
    set(s => ({
      config: s.config ? { ...s.config, name } : s.config,
    })),

  reset: () =>
    set({ ...INITIAL_STATE }),
}))
