import { create } from 'zustand'
import type { Strategy, MarketScenario } from '../types'
import type { ScenarioModifiers } from '../data/scenarioPresets'
import { SCENARIO_PRESETS } from '../data/scenarioPresets'

export type ScenarioComparePhase = 'INIT' | 'RUNNING' | 'COMPUTED' | 'SAVED' | 'ERROR'

export interface ScenarioBlock {
  id:                string
  label:             string
  presetId:          string
  isBaseline:        boolean
  upperBand:         number
  lowerBand:         number
  volatility:        string
  correlation:       string
  timePeriodDays:    number
  scenarioModifiers: ScenarioModifiers
}

export interface ScenarioCompareConfig {
  name:              string
  capitalAllocation: number
  strategy:          Strategy
  scenarios:         ScenarioBlock[]  // always 3
}

export interface ScenarioColumnResult {
  scenarioId:              string
  scenarioName:            string
  isBaseline:              boolean
  maxDrawdownPct:          number
  capitalAtRiskUSD:        number
  volatilityExposureLabel: string
  timeToRecoveryDays:      number
  ilPercent:               number | null
  grossYieldDisplay:       string
  ilImpactDisplay:         string | null
  yieldVsRiskOffset:       number | null
}

export interface ScenarioAIInsights {
  summary:          string
  whyRiskTitle:     string
  whyRiskBullets:   string[]
  sensitivityNotes: string[]
  finalRecap:       string[]
}

export interface ScenarioCompareResult {
  columns:  ScenarioColumnResult[]
  insights: ScenarioAIInsights
}

// ── Default scenario blocks ───────────────────────────────────────────────────

const PRESET_MAP = Object.fromEntries(SCENARIO_PRESETS.map(p => [p.id, p]))

const PRESET_TO_MARKET_SCENARIO: Record<string, MarketScenario> = {
  baseline:              'baseline',
  sharp_drawdown:        'black_swan',
  gradual_bear:          'bear',
  sideways_vol:          'high_volatility',
  bull_expansion:        'bull',
  liquidity_shock:       'black_swan',
  correlation_breakdown: 'high_volatility',
  low_vol:               'baseline',
  flash_crash:           'black_swan',
  custom_a:              'baseline',
  custom_b:              'baseline',
}

export { PRESET_TO_MARKET_SCENARIO }

function defaultScenarios(timePeriodDays: number): ScenarioBlock[] {
  const ids = ['baseline', 'sharp_drawdown', 'gradual_bear']
  return ids.map((id, i) => {
    const p = PRESET_MAP[id]
    return {
      id:                `block-${i + 1}`,
      label:             p.name,
      presetId:          id,
      isBaseline:        i === 0,
      upperBand:         p.upperBand,
      lowerBand:         p.lowerBand,
      volatility:        p.volatility,
      correlation:       p.correlation,
      timePeriodDays,
      scenarioModifiers: { ...p.modifiers },
    }
  })
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ScenarioCompareState {
  phase:             ScenarioComparePhase
  isStale:           boolean
  config:            ScenarioCompareConfig | null
  results:           ScenarioCompareResult | null
  error:             string | null
  comparisonGroupId: string | null
  saveId:            string | null
  version:           number

  initFromSimulation: (sim: {
    name:              string
    capitalAllocation: number
    strategy:          Strategy
    timePeriodDays:    number
  }) => void
  updateScenario:  (blockId: string, partial: Partial<Omit<ScenarioBlock, 'id' | 'isBaseline'>>) => void
  setConfig:       (partial: Partial<Pick<ScenarioCompareConfig, 'name' | 'capitalAllocation'>>) => void
  startRun:        () => void
  setResults:      (results: ScenarioCompareResult) => void
  setError:        (msg: string) => void
  editInputs:      () => void
  saveComparison:  (saveId: string) => string  // returns comparisonGroupId
  loadVersion:     (config: ScenarioCompareConfig, results: ScenarioCompareResult, saveId: string) => void
  reset:           () => void
}

export const useScenarioCompareStore = create<ScenarioCompareState>()((set, get) => ({
  phase:             'INIT',
  isStale:           false,
  config:            null,
  results:           null,
  error:             null,
  comparisonGroupId: null,
  saveId:            null,
  version:           1,

  initFromSimulation: (sim) =>
    set({
      phase:   'INIT',
      isStale: false,
      results: null,
      error:   null,
      config: {
        name:              sim.name ? `${sim.name} Comparison` : 'Strategy Comparison',
        capitalAllocation: sim.capitalAllocation,
        strategy:          sim.strategy,
        scenarios:         defaultScenarios(sim.timePeriodDays),
      },
    }),

  updateScenario: (blockId, partial) =>
    set(s => {
      if (!s.config) return s
      return {
        config: {
          ...s.config,
          scenarios: s.config.scenarios.map(b =>
            b.id === blockId ? { ...b, ...partial } : b
          ),
        },
      }
    }),

  setConfig: (partial) =>
    set(s => ({
      config: s.config ? { ...s.config, ...partial } : null,
    })),

  startRun:   () => set({ phase: 'RUNNING', error: null, isStale: false }),
  setResults: (results) => set({ results, phase: 'COMPUTED', isStale: false }),
  setError:   (msg) => set({ phase: 'ERROR', error: msg }),

  editInputs: () =>
    set(s => (s.phase === 'COMPUTED' || s.phase === 'SAVED')
      ? { phase: 'INIT', isStale: true }
      : s),

  saveComparison: (saveId) => {
    const { comparisonGroupId, version } = get()
    const groupId = comparisonGroupId ?? crypto.randomUUID()
    set({ saveId, comparisonGroupId: groupId, phase: 'SAVED', version: version + 1 })
    return groupId
  },

  loadVersion: (config, results, saveId) =>
    set({ config, results, saveId, phase: 'SAVED', isStale: false }),

  reset: () =>
    set({
      phase: 'INIT', isStale: false, config: null, results: null, error: null,
      comparisonGroupId: null, saveId: null, version: 1,
    }),
}))
