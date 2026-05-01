import type { SimulationConfig, ScenarioResult, DrawdownResult } from '../types'

// ── Return type ───────────────────────────────────────────────────────────────

export interface DrawdownCalculation {
  maxDrawdownPct:      number   // worst percentage drop as a decimal, e.g. -0.45
  maxDrawdownUSD:      number   // dollar value of that drop (negative)
  drawdownDurationDays: number  // how long the drawdown phase lasts
  timeToRecoveryDays:  number   // estimated days to recover from the low point
}

// ── Pure calculation ──────────────────────────────────────────────────────────

export function calculateDrawdown(
  portfolioValueUSD:      number,           // total capital in USD
  worstCasePriceChangePct: number,          // lowest price path as a decimal, e.g. -0.45 for -45 %
  timePeriodDays:         number,           // simulation horizon in days
  strategyType:           'HOLD' | 'LP' | 'STAKE',
  ilPercent:              number,           // IL as a decimal from ilModule (e.g. -0.0572); pass 0 for non-LP
): DrawdownCalculation {

  // ── 1. Max drawdown percentage ─────────────────────────────────────────────
  let maxDrawdownPct: number

  if (strategyType === 'LP') {
    // IL compounds the price loss — both values are negative, so sum is more negative
    maxDrawdownPct = worstCasePriceChangePct + ilPercent
  } else if (strategyType === 'STAKE') {
    // Staking income partially offsets price decline
    maxDrawdownPct = worstCasePriceChangePct * 0.6
  } else {
    // HOLD: drawdown matches price movement exactly
    maxDrawdownPct = worstCasePriceChangePct
  }

  // ── 2. Max drawdown in USD ─────────────────────────────────────────────────
  const maxDrawdownUSD = portfolioValueUSD * maxDrawdownPct

  // ── 3. Drawdown duration ───────────────────────────────────────────────────
  // The drawdown phase occupies 40 % of the total simulation horizon
  const drawdownDurationDays = timePeriodDays * 0.4

  // ── 4. Time to recovery ────────────────────────────────────────────────────
  // Tiered by severity: mild (> -0.3) recovers fastest, severe (≤ -0.5) slowest
  let timeToRecoveryDays: number

  if (maxDrawdownPct > -0.3) {
    // Mild drawdown — recovery is 1.5× the drawdown phase
    timeToRecoveryDays = drawdownDurationDays * 1.5
  } else if (maxDrawdownPct > -0.5) {
    // Moderate drawdown — recovery is 2× the drawdown phase
    timeToRecoveryDays = drawdownDurationDays * 2
  } else {
    // Severe drawdown — recovery is 3× the drawdown phase
    timeToRecoveryDays = drawdownDurationDays * 3
  }

  return { maxDrawdownPct, maxDrawdownUSD, drawdownDurationDays, timeToRecoveryDays }
}

// ── Engine adapter (stub — wiring to scenario output pending) ─────────────────

export async function runDrawdownEngine(
  _config: SimulationConfig,
  _scenario: ScenarioResult,
): Promise<DrawdownResult> {
  throw new Error('drawdownEngine: not yet implemented')
}

/*
── Example calculations ─────────────────────────────────────────────────────────

Example 1 — HOLD, mild drawdown (triggers × 1.5 recovery tier)
  calculateDrawdown(10_000, -0.20, 30, 'HOLD', 0)

  strategy      = HOLD  → maxDrawdownPct = worstCasePriceChangePct = -0.20
  maxDrawdownUSD         = 10 000 × -0.20                          = -2 000.00
  drawdownDurationDays   = 30 × 0.4                                = 12
  maxDrawdownPct -0.20 > -0.3  → tier: mild  → × 1.5
  timeToRecoveryDays     = 12 × 1.5                                = 18

──

Example 2 — LP, moderate drawdown (price + IL, triggers × 2 recovery tier)
  calculateDrawdown(20_000, -0.35, 60, 'LP', -0.0572)

  strategy      = LP  → maxDrawdownPct = -0.35 + (-0.0572)         = -0.4072
  maxDrawdownUSD         = 20 000 × -0.4072                        = -8 144.00
  drawdownDurationDays   = 60 × 0.4                                = 24
  maxDrawdownPct -0.4072 is NOT > -0.3, but IS > -0.5 → tier: moderate → × 2
  timeToRecoveryDays     = 24 × 2                                  = 48

──

Example 3 — STAKE, severe underlying crash (triggers × 3 recovery tier)
  calculateDrawdown(50_000, -0.90, 180, 'STAKE', 0)

  strategy      = STAKE → maxDrawdownPct = -0.90 × 0.6             = -0.54
  maxDrawdownUSD         = 50 000 × -0.54                          = -27 000.00
  drawdownDurationDays   = 180 × 0.4                               = 72
  maxDrawdownPct -0.54 is NOT > -0.5 → tier: severe → × 3
  timeToRecoveryDays     = 72 × 3                                  = 216

─────────────────────────────────────────────────────────────────────────────────
*/
