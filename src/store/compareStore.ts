import { create } from 'zustand'
import type { Strategy, MarketScenario } from '../types'
import type { ScenarioModifiers } from '../data/scenarioPresets'

export type ComparePhase = 'INIT' | 'RUNNING' | 'COMPUTED' | 'ERROR'

export interface CompareConfig {
  name:               string
  capitalAllocation:  number
  scenarioPresetId:   string
  marketScenario:     MarketScenario
  upperBand:          number
  lowerBand:          number
  volatility:         string
  correlation:        string
  timePeriodDays:     number
  scenarioModifiers:  ScenarioModifiers
  baselineStrategy:   Strategy
  selectedStrategies: Strategy[]   // 2–3, always includes baseline
}

export interface StrategyCompareResult {
  strategy:                Strategy
  label:                   string
  maxDrawdownPct:          number          // negative decimal, e.g. -0.52
  capitalAtRiskUSD:        number
  volatilityExposureLabel: string
  timeToRecoveryDays:      number
  ilPercent:               number | null   // percentage, e.g. -21
  grossYieldDisplay:       string          // "14.2%" / "8.5% APY" / "0%"
  ilImpactDisplay:         string | null   // "-3.8 IL impact" or null
  yieldVsRiskOffset:       number | null
  riskLevel:               string
}

export interface SensitivityRow {
  label:     string
  effect:    string
  highlight: string
}

export interface AIInsights {
  summary:          string
  whyRiskTitle:     string
  whyRiskBullets:   string[]
  sensitivityRows:  SensitivityRow[]
  sensitivityNote:  string
  finalRecap:       string[]
}

export interface CompareResult {
  strategies: StrategyCompareResult[]
  insights:   AIInsights
}

interface CompareState {
  phase:   ComparePhase
  config:  CompareConfig | null
  results: CompareResult | null
  error:   string | null

  initFromSimulation: (sim: {
    name:              string
    capitalAllocation: number
    strategy:          Strategy
    marketScenario:    MarketScenario
    upperBand:         number
    lowerBand:         number
    volatility:        string
    correlation:       string
    timePeriodDays:    number
    scenarioModifiers: ScenarioModifiers
  }) => void
  setConfig:       (partial: Partial<CompareConfig>) => void
  toggleStrategy:  (strategy: Strategy) => void
  startRun:        () => void
  setResults:      (results: CompareResult) => void
  setError:        (msg: string) => void
  reset:           () => void
}

export const useCompareStore = create<CompareState>()((set) => ({
  phase:   'INIT',
  config:  null,
  results: null,
  error:   null,

  initFromSimulation: (sim) =>
    set({
      phase:   'INIT',
      results: null,
      error:   null,
      config: {
        name:               sim.name ? `${sim.name} Comparison` : 'Strategy Comparison',
        capitalAllocation:  sim.capitalAllocation,
        scenarioPresetId:   'baseline',
        marketScenario:     sim.marketScenario,
        upperBand:          sim.upperBand,
        lowerBand:          sim.lowerBand,
        volatility:         sim.volatility,
        correlation:        sim.correlation,
        timePeriodDays:     sim.timePeriodDays,
        scenarioModifiers:  sim.scenarioModifiers,
        baselineStrategy:   sim.strategy,
        selectedStrategies: [sim.strategy],
      },
    }),

  setConfig: (partial) =>
    set(s => ({
      config: s.config ? { ...s.config, ...partial } : null,
    })),

  toggleStrategy: (strategy) =>
    set(s => {
      if (!s.config) return s
      const { selectedStrategies, baselineStrategy } = s.config
      if (strategy === baselineStrategy) return s
      const has = selectedStrategies.includes(strategy)
      let next: Strategy[]
      if (has) {
        next = selectedStrategies.filter(st => st !== strategy)
      } else {
        if (selectedStrategies.length >= 3) return s
        next = [...selectedStrategies, strategy]
      }
      return { config: { ...s.config, selectedStrategies: next } }
    }),

  startRun: () => set({ phase: 'RUNNING', error: null }),

  setResults: (results) => set({ results, phase: 'COMPUTED' }),

  setError: (msg) => set({ phase: 'ERROR', error: msg }),

  reset: () => set({ phase: 'INIT', config: null, results: null, error: null }),
}))
