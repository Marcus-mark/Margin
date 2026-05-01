import type { SimulationConfig, SimulationResult } from '../types'
import { buildScenario }    from './scenarioEngine'
import { calculateIL }      from './ilModule'
import { calculateDrawdown } from './drawdownEngine'
import { calculateRisk }    from './riskEngine'
import { calculateYield }   from './yieldEngine'

// ── Config → engine-parameter helpers ────────────────────────────────────────

function toVolatilityLevel(v: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
  const map: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'> = {
    Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH', Extreme: 'EXTREME',
  }
  return map[v] ?? 'MEDIUM'
}

function toCorrelationBehavior(c: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  if (c === 'High Correlation')                              return 'POSITIVE'
  if (c === 'Low Correlation' || c === 'Negative Correlation') return 'NEGATIVE'
  return 'NEUTRAL'  // 'Moderate Correlation'
}

function toStrategyType(s: string): 'HOLD' | 'LP' | 'STAKE' {
  if (s === 'provide_liquidity') return 'LP'
  if (s === 'stake_lend')        return 'STAKE'
  return 'HOLD'
}

function parseMultiplier(s: string): number {
  // '1.5x' → 1.5
  return parseFloat(s.replace('x', ''))
}

function normaliseTailRisk(s: string): number {
  // '0.5x'→0.25  '1.0x'→0.50  '1.5x'→0.75  '2.0x'→1.00
  return parseMultiplier(s) / 2
}

function normaliseRebalance(s: string): number {
  const map: Record<string, number> = { Low: 0.25, Medium: 0.5, High: 1.0 }
  return map[s] ?? 0.5
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(config: SimulationConfig): void {
  if (!config.name?.trim())
    throw new Error('Simulation name is required')

  if (!config.capitalAllocation || config.capitalAllocation < 10)
    throw new Error('Capital allocation must be at least 10')

  if (!config.strategy)
    throw new Error('Strategy is required')

  if (!config.marketScenario)
    throw new Error('Market scenario is required')

  if (config.timePeriodDays == null || config.timePeriodDays < 1)
    throw new Error('Time period must be at least 1 day')

  if (config.upperBand == null || config.lowerBand == null)
    throw new Error('Price bands (upper and lower) are required')

  if (config.upperBand < config.lowerBand)
    throw new Error('Upper band must be greater than or equal to lower band')
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function runSimulation(config: SimulationConfig): Promise<SimulationResult> {
  // Validation errors propagate directly (not wrapped in "Calculation failed:")
  validate(config)

  try {
    const strategy   = toStrategyType(config.strategy)
    const mods       = config.scenarioModifiers
    const stressAmp  = parseMultiplier(mods.stressValue)
    const tailRisk   = normaliseTailRisk(mods.tailRisk)
    const rebalance  = normaliseRebalance(mods.rebalanceSensitivity)
    const volLevel   = toVolatilityLevel(config.volatility)
    const corrBehav  = toCorrelationBehavior(config.correlation)

    // ── 1. Scenario ───────────────────────────────────────────────────────────
    // Store saves bands as integer percentages (e.g. -10, +12); engine wants decimals
    const scenario = buildScenario(
      config.lowerBand / 100,
      config.upperBand / 100,
      volLevel,
      corrBehav,
      stressAmp,
      tailRisk,
      rebalance,
      config.timePeriodDays,
    )

    // ── 2. Impermanent loss (LP only) ─────────────────────────────────────────
    // Prices are normalised to 1; final price derived from worst-case path
    type ILCalc = ReturnType<typeof calculateIL>
    let il: ILCalc | null = null

    if (strategy === 'LP') {
      il = calculateIL(
        1,                                          // initialPriceA (normalised)
        1,                                          // initialPriceB (stable, e.g. USDC)
        1 + scenario.worstCasePriceChangePct,       // finalPriceA
        1,                                          // finalPriceB (assumed stable)
        config.lpFeeApr ?? 0,
        config.timePeriodDays,
        config.capitalAllocation,
      )
    }

    // ilPercent from calculateIL is a percentage (e.g. -5.72);
    // drawdown and yield engines expect a decimal (e.g. -0.0572)
    const ilDecimal = il ? il.ilPercent / 100 : 0

    // ── 3. Drawdown ───────────────────────────────────────────────────────────
    const drawdown = calculateDrawdown(
      config.capitalAllocation,
      scenario.worstCasePriceChangePct,
      config.timePeriodDays,
      strategy,
      ilDecimal,
    )

    // ── 4. Risk ───────────────────────────────────────────────────────────────
    const risk = calculateRisk(
      config.capitalAllocation,
      drawdown.maxDrawdownPct,
      drawdown.maxDrawdownUSD,
      drawdown.drawdownDurationDays,
      drawdown.timeToRecoveryDays,
      volLevel,
      stressAmp,
      tailRisk,
    )

    // ── 5. Yield ──────────────────────────────────────────────────────────────
    const yld = calculateYield(
      strategy,
      config.stakeApy ?? null,
      config.lpFeeApr ?? null,
      config.timePeriodDays,
      config.capitalAllocation,
      ilDecimal,
      risk.capitalAtRiskPct,
    )

    // ── Combine all results ───────────────────────────────────────────────────
    return {
      // Scenario
      worstCasePriceChangePct:  scenario.worstCasePriceChangePct,
      expectedPriceChangePct:   scenario.expectedPriceChangePct,
      bestCasePriceChangePct:   scenario.bestCasePriceChangePct,
      rebalanceImpactPct:       scenario.rebalanceImpactPct,
      volatilityScalar:         scenario.volatilityScalar,

      // IL (null for non-LP)
      ilPercent:      il?.ilPercent      ?? null,
      ilUSD:          il?.ilUSD          ?? null,
      holdValueUSD:   il?.holdValueUSD   ?? null,
      lpValueUSD:     il?.lpValueUSD     ?? null,
      feeIncomeUSD:   il?.feeIncomeUSD   ?? null,
      netPositionUSD: il?.netPositionUSD ?? null,

      // Drawdown
      maxDrawdownPct:       drawdown.maxDrawdownPct,
      maxDrawdownUSD:       drawdown.maxDrawdownUSD,
      drawdownDurationDays: drawdown.drawdownDurationDays,
      timeToRecoveryDays:   drawdown.timeToRecoveryDays,

      // Risk
      capitalAtRiskUSD:   risk.capitalAtRiskUSD,
      capitalAtRiskPct:   risk.capitalAtRiskPct,
      volatilityExposure: risk.volatilityExposure,
      compositeScore:     risk.compositeScore,
      riskLevel:          risk.riskLevel,
      yieldRiskOffset:    yld.yieldRiskOffset,   // populated here from yieldEngine

      // Yield
      grossYieldPct:         yld.grossYieldPct,
      grossYieldUSD:         yld.grossYieldUSD,
      netYieldPct:           yld.netYieldPct,
      netYieldUSD:           yld.netYieldUSD,
      projectedReturnMinUSD: yld.projectedReturnMinUSD,
      projectedReturnMaxUSD: yld.projectedReturnMaxUSD,

      // Metadata
      computedAt:      new Date().toISOString(),
      timeHorizonDays: config.timePeriodDays,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Calculation failed: ${message}`)
  }
}
