import type { SimulationConfig, ScenarioResult, RiskResult, ILResult, YieldResult } from '../types'

// ── Return type ───────────────────────────────────────────────────────────────

export interface YieldCalculation {
  grossYieldPct:         number   // yield before IL, as a decimal (e.g. 0.05 = 5 %)
  grossYieldUSD:         number   // grossYieldPct × portfolioValueUSD
  netYieldPct:           number   // yield after IL adjustment (LP only)
  netYieldUSD:           number   // netYieldPct × portfolioValueUSD
  yieldRiskOffset:       number   // netYieldPct − capitalAtRiskPct; positive = yield covers risk
  projectedReturnMinUSD: number   // worst-case total portfolio value (drawdown + yield)
  projectedReturnMaxUSD: number   // best-case total portfolio value (no drawdown + yield)
}

// ── Pure calculation ──────────────────────────────────────────────────────────

export function calculateYield(
  strategyType:      'STAKE' | 'LP' | 'HOLD',
  stakeAPY:          number | null,   // annual yield % for STAKE, e.g. 8 = 8 %
  lpFeeAPR:          number | null,   // annual fee % for LP,    e.g. 30 = 30 %
  timePeriodDays:    number,
  portfolioValueUSD: number,
  ilPercent:         number,          // IL as a decimal from ilModule (e.g. −0.0572); 0 for non-LP
  capitalAtRiskPct:  number,          // positive decimal from riskEngine (e.g. 0.45)
): YieldCalculation {
  const t = timePeriodDays / 365      // time fraction of a year

  // ── 1. Gross yield percentage ──────────────────────────────────────────────
  let grossYieldPct: number

  if (strategyType === 'STAKE') {
    // Compounded: accounts for reinvested yield over the period
    const apy = (stakeAPY ?? 0) / 100
    grossYieldPct = Math.pow(1 + apy, t) - 1
  } else if (strategyType === 'LP') {
    // Simple (fees are distributed continuously, not compounded)
    grossYieldPct = ((lpFeeAPR ?? 0) / 100) * t
  } else {
    // HOLD: no yield
    grossYieldPct = 0
  }

  // ── 2. Gross yield in USD ──────────────────────────────────────────────────
  const grossYieldUSD = portfolioValueUSD * grossYieldPct

  // ── 3. Net yield (LP subtracts IL; IL is already negative) ────────────────
  const netYieldPct = strategyType === 'LP'
    ? grossYieldPct + ilPercent
    : grossYieldPct

  const netYieldUSD = portfolioValueUSD * netYieldPct

  // ── 4. Yield-risk offset ───────────────────────────────────────────────────
  // Positive → yield more than covers the downside risk
  // Negative → risk exceeds what yield can offset
  const yieldRiskOffset = netYieldPct - capitalAtRiskPct

  // ── 5. Projected return range ──────────────────────────────────────────────
  // Min: worst-case price drawdown kept, yield still earned
  // maxDrawdownUSD = −(portfolioValueUSD × capitalAtRiskPct)
  const projectedReturnMinUSD =
    portfolioValueUSD - (portfolioValueUSD * capitalAtRiskPct) + netYieldUSD

  // Max: price holds or rises, full yield earned
  const projectedReturnMaxUSD = portfolioValueUSD * (1 + netYieldPct)

  return {
    grossYieldPct,
    grossYieldUSD,
    netYieldPct,
    netYieldUSD,
    yieldRiskOffset,
    projectedReturnMinUSD,
    projectedReturnMaxUSD,
  }
}

// ── Engine adapter (stub — wiring to scenario + risk outputs pending) ─────────

export async function runYieldEngine(
  _config: SimulationConfig,
  _scenario: ScenarioResult,
  _risk: RiskResult,
  _il?: ILResult,
): Promise<YieldResult> {
  throw new Error('yieldEngine: not yet implemented')
}

/*
── Example calculations ─────────────────────────────────────────────────────────

Example 1 — STAKE, 8 % APY, 90 days
  calculateYield('STAKE', 8, null, 90, 10_000, 0, 0.25)

  t              = 90 / 365                                          = 0.24658
  grossYieldPct  = (1 + 0.08)^0.24658 − 1                          ≈ 0.01916  (1.92 %)
  grossYieldUSD  = 10 000 × 0.01916                                 =   191.60
  netYieldPct    = 0.01916          (STAKE — same as gross)         ≈ 0.01916
  netYieldUSD    = 10 000 × 0.01916                                 =   191.60
  yieldRiskOffset= 0.01916 − 0.25                                   =  −0.2308  ← risk > yield
  projReturnMin  = 10 000 − (10 000×0.25) + 191.60                 = 7 691.60
  projReturnMax  = 10 000 × (1 + 0.01916)                          = 10 191.60

──

Example 2 — LP, 30 % APR, 60 days, IL = −5.72 %
  calculateYield('LP', null, 30, 60, 20_000, -0.0572, 0.40)

  t              = 60 / 365                                          = 0.16438
  grossYieldPct  = (0.30) × 0.16438                                 ≈ 0.04932  (4.93 %)
  grossYieldUSD  = 20 000 × 0.04932                                 =   986.30
  netYieldPct    = 0.04932 + (−0.0572)                              = −0.00788 (−0.79 %)
  netYieldUSD    = 20 000 × (−0.00788)                              =  −157.60
  yieldRiskOffset= −0.00788 − 0.40                                  =  −0.4079  ← risk >> yield
  projReturnMin  = 20 000 − (20 000×0.40) + (−157.60)              = 11 842.40
  projReturnMax  = 20 000 × (1 − 0.00788)                          = 19 842.40

──

Example 3 — HOLD, no yield
  calculateYield('HOLD', null, null, 90, 5_000, 0, 0.15)

  grossYieldPct  = 0
  grossYieldUSD  = 0
  netYieldPct    = 0
  netYieldUSD    = 0
  yieldRiskOffset= 0 − 0.15                                         =  −0.15
  projReturnMin  = 5 000 − (5 000×0.15) + 0                        =  4 250.00
  projReturnMax  = 5 000 × (1 + 0)                                  =  5 000.00

─────────────────────────────────────────────────────────────────────────────────
*/
