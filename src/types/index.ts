// ─── Primitives ───────────────────────────────────────────────────────────────

export type Strategy       = 'hold_asset' | 'stake_lend' | 'provide_liquidity'
export type MarketScenario = 'baseline' | 'bull' | 'bear' | 'high_volatility' | 'black_swan'
export type RiskLevel      = 'low' | 'moderate' | 'high' | 'critical' | 'extreme'
export type ILSeverity     = 'low' | 'moderate' | 'high' | 'extreme'
export type VolatilityLevel = 'Low' | 'Medium' | 'High' | 'Extreme'

// ─── Input types ──────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  symbol: string
  allocation: string   // stored as string percentage, e.g. "40"
}

export interface RiskParameters {
  leverageCap:           number | null
  exposureCap:           number | null
  volatilitySensitivity: number | null
}

export interface ScenarioModifiers {
  stressValue:           string   // '1.0x' | '1.5x' | '2.0x' | '2.5x' | '3.0x'
  tailRisk:              string   // '0.5x' | '1.0x' | '1.5x' | '2.0x'
  rebalanceSensitivity:  string   // 'Low' | 'Medium' | 'High'
}

export interface SimulationConfig {
  // Core
  name:               string
  capitalAllocation:  number
  assets:             Asset[]
  strategy:           Strategy
  marketScenario:     MarketScenario

  // Risk controls
  riskParameters:     RiskParameters

  // Scenario
  scenarioModifiers:  ScenarioModifiers
  upperBand:          number           // price ceiling %,  e.g. +30
  lowerBand:          number           // price floor %,    e.g. -25
  volatility:         VolatilityLevel
  correlation:        string
  timePeriodDays:     number

  // Strategy-specific (optional)
  stakeApy?:  number   // stake_lend
  lpFeeApr?:  number   // provide_liquidity
  assetA?:    string   // provide_liquidity
  assetB?:    string   // provide_liquidity
}

// ─── Sub-engine result types ───────────────────────────────────────────────────

export interface ScenarioResult {
  priceReturnMin:    number   // %
  priceReturnMax:    number   // %
  volatilityScore:   number   // 0 – 1 normalised
  correlationFactor: number   // 0 – 1 normalised
  stressMultiplier:  number   // parsed from stressValue string
}

export interface ILResult {
  impermanentLoss: number       // %
  ilSeverity:      ILSeverity
  breakEvenDays:   number | null
}

export interface DrawdownResult {
  maxDrawdown:      number   // %
  expectedDrawdown: number   // %
  drawdownDuration: number   // days
  recoveryDays:     number | null
}

export interface RiskResult {
  riskLevel:               RiskLevel
  sharpeRatio:             number
  volatilityAdjustedReturn: number
  tailRiskScore:           number
}

export interface YieldResult {
  expectedYieldMin: number   // %
  expectedYieldMax: number   // %
  annualizedYield:  number   // %
  yieldSource:      string
}

// ─── Combined output ──────────────────────────────────────────────────────────

export interface SimulationResult {
  // Scenario (from buildScenario)
  worstCasePriceChangePct:  number
  expectedPriceChangePct:   number
  bestCasePriceChangePct:   number
  rebalanceImpactPct:       number
  volatilityScalar:         number

  // Impermanent loss (from calculateIL — null for non-LP strategies)
  ilPercent:      number | null   // percentage, e.g. -5.72
  ilUSD:          number | null
  holdValueUSD:   number | null
  lpValueUSD:     number | null
  feeIncomeUSD:   number | null
  netPositionUSD: number | null

  // Drawdown (from calculateDrawdown)
  maxDrawdownPct:       number
  maxDrawdownUSD:       number
  drawdownDurationDays: number
  timeToRecoveryDays:   number

  // Risk (from calculateRisk)
  capitalAtRiskUSD:   number
  capitalAtRiskPct:   number
  volatilityExposure: number
  compositeScore:     number
  riskLevel:          RiskLevel
  yieldRiskOffset:    number | null

  // Yield (from calculateYield)
  grossYieldPct:         number
  grossYieldUSD:         number
  netYieldPct:           number
  netYieldUSD:           number
  projectedReturnMinUSD: number
  projectedReturnMaxUSD: number

  // Metadata
  computedAt:      string   // ISO timestamp
  timeHorizonDays: number
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface EngineError {
  code:    string
  message: string
}
