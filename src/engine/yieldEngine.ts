import type { SimulationConfig, ScenarioResult, RiskResult, ILResult, YieldResult } from '../types'

export async function runYieldEngine(
  _config: SimulationConfig,
  _scenario: ScenarioResult,
  _risk: RiskResult,
  _il?: ILResult,
): Promise<YieldResult> {
  throw new Error('yieldEngine: not yet implemented')
}
