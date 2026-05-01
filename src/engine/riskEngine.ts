import type { SimulationConfig, ScenarioResult, DrawdownResult, ILResult, RiskResult } from '../types'

// ── Volatility base scores ────────────────────────────────────────────────────

const VOLATILITY_BASE: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME', number> = {
  LOW:     0.25,
  MEDIUM:  0.50,
  HIGH:    1.00,
  EXTREME: 2.00,
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface RiskCalculation {
  capitalAtRiskUSD:   number                          // absolute dollar exposure
  capitalAtRiskPct:   number                          // absolute decimal, e.g. 0.45 for 45 %
  volatilityExposure: number                          // 0 – 2.0 after stress amplification
  compositeScore:     number                          // 0 – 100
  riskLevel:          'moderate' | 'high' | 'critical'
  yieldRiskOffset:    null                            // reserved — not yet calculated
}

// ── Pure calculation ──────────────────────────────────────────────────────────

export function calculateRisk(
  portfolioValueUSD:    number,                       // total capital in USD
  maxDrawdownPct:       number,                       // decimal, e.g. -0.45
  maxDrawdownUSD:       number,                       // dollar value of drawdown (negative)
  drawdownDurationDays: number,                       // days in drawdown phase
  timeToRecoveryDays:   number,                       // estimated recovery days
  volatilityLevel:      'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
  stressAmplifier:      number,                       // 1.0 – 3.0
  tailRiskMultiplier:   number,                       // 0.0 – 1.0 (normalised)
): RiskCalculation {

  // ── 1. Capital at risk ─────────────────────────────────────────────────────
  const capitalAtRiskUSD = Math.abs(maxDrawdownUSD)
  const capitalAtRiskPct = Math.abs(maxDrawdownPct)

  // ── 2. Volatility exposure ─────────────────────────────────────────────────
  // Base score amplified by the stress multiplier, hard-capped at 2.0
  const volatilityExposure = Math.min(
    VOLATILITY_BASE[volatilityLevel] * stressAmplifier,
    2.0,
  )

  // ── 3. Composite risk score (0 – 100) ─────────────────────────────────────
  const compositeScore = Math.min(
    (capitalAtRiskPct   * 50) +   // drawdown magnitude contributes up to 50 pts
    (volatilityExposure * 20) +   // volatility exposure contributes up to 40 pts
    (tailRiskMultiplier * 30),    // tail risk multiplier contributes up to 30 pts
    100,
  )

  // ── 4. Risk level ──────────────────────────────────────────────────────────
  let riskLevel: RiskCalculation['riskLevel']

  if (compositeScore > 70) {
    riskLevel = 'critical'
  } else if (compositeScore >= 40) {
    riskLevel = 'high'
  } else {
    riskLevel = 'moderate'
  }

  return {
    capitalAtRiskUSD,
    capitalAtRiskPct,
    volatilityExposure,
    compositeScore,
    riskLevel,
    yieldRiskOffset: null,
  }
}

// ── Engine adapter (stub — wiring to drawdown + scenario outputs pending) ─────

export async function runRiskEngine(
  _config: SimulationConfig,
  _scenario: ScenarioResult,
  _drawdown: DrawdownResult,
  _il?: ILResult,
): Promise<RiskResult> {
  throw new Error('riskEngine: not yet implemented')
}

/*
── Example calculations ─────────────────────────────────────────────────────────

Example 1 — Low inputs → MODERATE
  calculateRisk(10_000, -0.20, -2_000, 12, 18, 'LOW', 1.0, 0.25)

  capitalAtRiskUSD   = |−2 000|                                    =  2 000.00
  capitalAtRiskPct   = |−0.20|                                     =     0.20
  volatilityExposure = min(0.25 × 1.0, 2.0)                        =     0.25
  compositeScore     = min((0.20×50) + (0.25×20) + (0.25×30), 100)
                     = min(10 + 5 + 7.5, 100)                      =    22.50
  riskLevel          = 22.50 < 40                                   → moderate

──

Example 2 — Medium inputs → HIGH
  calculateRisk(20_000, -0.45, -9_000, 24, 48, 'HIGH', 1.5, 0.5)

  capitalAtRiskUSD   = |−9 000|                                    =  9 000.00
  capitalAtRiskPct   = |−0.45|                                     =     0.45
  volatilityExposure = min(1.0 × 1.5, 2.0)                         =     1.50
  compositeScore     = min((0.45×50) + (1.50×20) + (0.5×30), 100)
                     = min(22.5 + 30 + 15, 100)                    =    67.50
  riskLevel          = 40 ≤ 67.50 ≤ 70                             → high

──

Example 3 — Extreme inputs → CRITICAL (score hits cap)
  calculateRisk(50_000, -0.70, -35_000, 72, 216, 'EXTREME', 2.5, 1.0)

  capitalAtRiskUSD   = |−35 000|                                   = 35 000.00
  capitalAtRiskPct   = |−0.70|                                     =     0.70
  volatilityExposure = min(2.0 × 2.5, 2.0)                         =     2.00  ← capped
  compositeScore     = min((0.70×50) + (2.0×20) + (1.0×30), 100)
                     = min(35 + 40 + 30, 100)                      =   100.00  ← capped
  riskLevel          = 100 > 70                                     → critical

─────────────────────────────────────────────────────────────────────────────────
*/
