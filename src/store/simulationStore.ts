import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand'
import type { SimulationResult } from '../types'
import type { ScenarioModifiers } from '../data/scenarioPresets'

export type { ScenarioModifiers }

// ─── AI explanation types (serialisable — stored in save/recent snapshots) ────

export interface ExplainData {
  worstCase: {
    condition:   string
    metricLabel: string
    metricValue: string
    detail:      string
  }
  whyRiskExists: {
    title:   string
    bullets: string[]
  }
  variableImpact: {
    rows: Array<{ label: string; value: string }>
  }
  stressScenario: {
    marketValue: string
    lines:       string[]
  }
  summary: string
}

export interface AIFollowUp {
  question: string
  answer:   string
}

export interface AIExplanationState {
  mode:      'novice' | 'advanced'
  data:      ExplainData
  followUps: AIFollowUp[]
}

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

// ─── Store shape ──────────────────────────────────────────────────────────────

export interface SimulationState {
  state:   SimulationPhase
  config:  SimulationConfig | null
  results: SimulationResults | null
  error:   SimulationError | null
  saveId:            string | null
  simulationGroupId: string | null
  version:           number
  isStale:           boolean

  scenarioModifiers: ScenarioModifiers | null

  aiExplanation: AIExplanationState | null
  runId:         string | null  // tracks latest recent-run for lazy AI snapshot updates

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
  loadVersion:         (config: SimulationConfig, results: SimulationResults, scenarioModifiers: ScenarioModifiers | null, saveId: string, aiExplanation?: AIExplanationState | null) => void
  reset:               () => void
  setAIExplanation:    (explanation: AIExplanationState) => void
  setRunId:            (runId: string) => void
}

export type SimulationStoreApi = StoreApi<SimulationState>

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
  aiExplanation:     null,
  runId:             null,
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSimulationStore(): SimulationStoreApi {
  return createStore<SimulationState>()((set, get) => ({
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
      set({ state: 'RUNNING', error: null, aiExplanation: null }),

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

    loadVersion: (config, results, scenarioModifiers, saveId, aiExplanation) =>
      set({ config, results, scenarioModifiers, saveId, state: 'SAVED', isStale: false, aiExplanation: aiExplanation ?? null }),

    reset: () =>
      set({ ...INITIAL_STATE }),

    setAIExplanation: (explanation) => {
      set({ aiExplanation: explanation })
      // Also patch the recent snapshot so reopening from Recents restores AI state
      const { runId } = get()
      if (runId) {
        try {
          const raw = localStorage.getItem(`margin_recent_${runId}`)
          if (raw) {
            localStorage.setItem(
              `margin_recent_${runId}`,
              JSON.stringify({ ...(JSON.parse(raw) as object), aiExplanation: explanation }),
            )
          }
        } catch { /* non-critical */ }
      }
    },

    setRunId: (runId) => set({ runId }),
  }))
}
