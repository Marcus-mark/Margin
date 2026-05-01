import type { SimulationConfig, SimulationResult, ILResult } from '../types'
import { runScenarioEngine } from './scenarioEngine'
import { runILModule }       from './ilModule'
import { runDrawdownEngine } from './drawdownEngine'
import { runRiskEngine }     from './riskEngine'
import { runYieldEngine }    from './yieldEngine'

// ─── Validation ───────────────────────────────────────────────────────────────

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

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runSimulation(config: SimulationConfig): Promise<SimulationResult> {
  // Validation errors propagate as-is (not wrapped)
  validate(config)

  try {
    // 1. Scenario
    const scenario = await runScenarioEngine(config)

    // 2. Impermanent loss — LP strategy only
    let il: ILResult | undefined
    if (config.strategy === 'provide_liquidity') {
      il = await runILModule(config, scenario)
    }

    // 3. Drawdown
    const drawdown = await runDrawdownEngine(config, scenario)

    // 4. Risk
    const risk = await runRiskEngine(config, scenario, drawdown, il)

    // 5. Yield
    const yld = await runYieldEngine(config, scenario, risk, il)

    // Combine into one results object
    return {
      // Scenario
      priceReturnMin:    scenario.priceReturnMin,
      priceReturnMax:    scenario.priceReturnMax,
      volatilityScore:   scenario.volatilityScore,
      correlationFactor: scenario.correlationFactor,
      stressMultiplier:  scenario.stressMultiplier,

      // IL (null when not LP)
      impermanentLoss: il?.impermanentLoss ?? null,
      ilSeverity:      il?.ilSeverity      ?? null,
      breakEvenDays:   il?.breakEvenDays   ?? null,

      // Drawdown
      maxDrawdown:      drawdown.maxDrawdown,
      expectedDrawdown: drawdown.expectedDrawdown,
      drawdownDuration: drawdown.drawdownDuration,
      recoveryDays:     drawdown.recoveryDays,

      // Risk
      riskLevel:                risk.riskLevel,
      sharpeRatio:              risk.sharpeRatio,
      volatilityAdjustedReturn: risk.volatilityAdjustedReturn,
      tailRiskScore:            risk.tailRiskScore,

      // Yield
      expectedYieldMin: yld.expectedYieldMin,
      expectedYieldMax: yld.expectedYieldMax,
      annualizedYield:  yld.annualizedYield,
      yieldSource:      yld.yieldSource,

      // Metadata
      computedAt:      new Date().toISOString(),
      timeHorizonDays: config.timePeriodDays,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Calculation failed: ${message}`)
  }
}
