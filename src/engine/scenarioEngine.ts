import type { SimulationConfig, ScenarioResult } from '../types'

// ── Lookup tables ─────────────────────────────────────────────────────────────

const VOLATILITY_SCALAR: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME', number> = {
  LOW:     0.8,
  MEDIUM:  1.0,
  HIGH:    1.2,
  EXTREME: 1.5,
}

const CORRELATION_MODIFIER: Record<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', number> = {
  POSITIVE: 1.1,   // assets move together — amplifies directional moves
  NEUTRAL:  1.0,
  NEGATIVE: 0.7,   // assets partially offset each other — dampens moves
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface ScenarioCalculation {
  worstCasePriceChangePct:  number   // most negative path; capped at −0.95
  expectedPriceChangePct:   number   // midpoint path
  bestCasePriceChangePct:   number   // most positive path
  rebalanceImpactPct:       number   // extra drag from rebalancing under stress
  volatilityScalar:         number   // the scalar used (0.8 – 1.5)
}

// ── Pure calculation ──────────────────────────────────────────────────────────

export function buildScenario(
  lowerBandPct:         number,                               // negative decimal, e.g. −0.50
  upperBandPct:         number,                               // positive decimal, e.g. +0.30
  volatilityLevel:      'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
  correlationBehavior:  'POSITIVE' | 'NEUTRAL' | 'NEGATIVE', // caller maps UI strings to these
  stressAmplifier:      number,                               // 1.0 – 3.0
  tailRiskMultiplier:   number,                               // 0.0 – 1.0 (normalised)
  rebalanceSensitivity: number,                               // 0.0 – 1.0 (normalised)
  timePeriodDays:       number,
): ScenarioCalculation {

  const volatilityScalar   = VOLATILITY_SCALAR[volatilityLevel]
  const correlationModifier = CORRELATION_MODIFIER[correlationBehavior]

  // ── 1. Worst-case price path ───────────────────────────────────────────────
  // Step 1: scale lower band by volatility and stress
  const stressed = lowerBandPct * volatilityScalar * stressAmplifier
  // Step 2: subtract tail-risk penalty (additional negative move)
  const withTail = stressed - (tailRiskMultiplier * 0.20)
  // Step 3: apply correlation modifier
  const correlated = withTail * correlationModifier
  // Step 4: cap — cannot model more than a 95 % loss
  const worstCasePriceChangePct = Math.max(correlated, -0.95)

  // ── 2. Expected price path ─────────────────────────────────────────────────
  const midpoint = (lowerBandPct + upperBandPct) / 2
  const expectedPriceChangePct = midpoint * correlationModifier

  // ── 3. Best-case price path ────────────────────────────────────────────────
  const bestCasePriceChangePct = upperBandPct * volatilityScalar * correlationModifier

  // ── 4. Rebalance drag ──────────────────────────────────────────────────────
  // Cost from forced portfolio rebalancing proportional to stress severity
  const rebalanceImpactPct =
    rebalanceSensitivity * 0.05 * Math.abs(worstCasePriceChangePct)

  return {
    worstCasePriceChangePct,
    expectedPriceChangePct,
    bestCasePriceChangePct,
    rebalanceImpactPct,
    volatilityScalar,
  }
}

// ── Engine adapter (stub — wiring to SimulationConfig pending) ─────────────────

export async function runScenarioEngine(_config: SimulationConfig): Promise<ScenarioResult> {
  throw new Error('scenarioEngine: not yet implemented')
}

/*
── Example calculations ─────────────────────────────────────────────────────────

Example 1 — Baseline, LOW volatility, NEUTRAL correlation
  buildScenario(-0.10, 0.12, 'LOW', 'NEUTRAL', 1.0, 0.5, 0.5, 30)

  volatilityScalar    = 0.8
  correlationModifier = 1.0

  worstCase:
    stressed  = −0.10 × 0.8 × 1.0                              = −0.080
    withTail  = −0.080 − (0.5 × 0.20)                          = −0.180
    correlated= −0.180 × 1.0                                    = −0.180
    cap       = max(−0.180, −0.95)                              = −0.180

  expected    = ((−0.10 + 0.12) / 2) × 1.0 = 0.01 × 1.0       =  +0.010
  bestCase    = 0.12 × 0.8 × 1.0                               =  +0.096
  rebalance   = 0.5 × 0.05 × |−0.180|                          =  +0.0045

──

Example 2 — Sharp drawdown, HIGH volatility, POSITIVE correlation (cap triggered)
  buildScenario(-0.60, -0.25, 'HIGH', 'POSITIVE', 2.0, 1.0, 0.75, 60)

  volatilityScalar    = 1.2
  correlationModifier = 1.1

  worstCase:
    stressed  = −0.60 × 1.2 × 2.0                              = −1.440
    withTail  = −1.440 − (1.0 × 0.20)                          = −1.640
    correlated= −1.640 × 1.1                                    = −1.804
    cap       = max(−1.804, −0.95)                              = −0.950  ← capped

  expected    = ((−0.60 + (−0.25)) / 2) × 1.1 = −0.425 × 1.1  = −0.4675
  bestCase    = −0.25 × 1.2 × 1.1                              = −0.330
  rebalance   = 0.75 × 0.05 × |−0.950|                         = +0.03563

──

Example 3 — Bull expansion, MEDIUM volatility, NEGATIVE correlation (dampened)
  buildScenario(-0.20, 0.80, 'MEDIUM', 'NEGATIVE', 1.0, 0.5, 0.5, 365)

  volatilityScalar    = 1.0
  correlationModifier = 0.7

  worstCase:
    stressed  = −0.20 × 1.0 × 1.0                              = −0.200
    withTail  = −0.200 − (0.5 × 0.20)                          = −0.300
    correlated= −0.300 × 0.7                                    = −0.210
    cap       = max(−0.210, −0.95)                              = −0.210

  expected    = ((−0.20 + 0.80) / 2) × 0.7 = 0.30 × 0.7       =  +0.210
  bestCase    = 0.80 × 1.0 × 0.7                               =  +0.560
  rebalance   = 0.5 × 0.05 × |−0.210|                          =  +0.00525

─────────────────────────────────────────────────────────────────────────────────
*/
