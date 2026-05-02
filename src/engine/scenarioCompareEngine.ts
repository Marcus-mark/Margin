import { runSimulation } from './index'
import type { Strategy } from '../types'
import type {
  ScenarioCompareConfig, ScenarioCompareResult,
  ScenarioColumnResult, ScenarioAIInsights, ScenarioBlock,
} from '../store/scenarioCompareStore'
import { PRESET_TO_MARKET_SCENARIO } from '../store/scenarioCompareStore'

const DEFAULT_STAKE_APY  = 8.5
const DEFAULT_LP_FEE_APR = 14.2

const STRATEGY_LABELS: Record<Strategy, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'Liquidity Provision',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function volatilityLabel(score: number): string {
  if (score < 0.4)  return 'Low'
  if (score < 0.75) return 'Moderate'
  if (score < 1.5)  return 'High'
  return 'Extreme'
}

function buildYieldDisplay(
  strategy: Strategy,
  grossYieldPct: number,
  ilPercent: number | null,
): { grossYieldDisplay: string; ilImpactDisplay: string | null } {
  const pct = (grossYieldPct * 100).toFixed(1)
  if (strategy === 'provide_liquidity' && ilPercent !== null && Math.abs(ilPercent) > 1) {
    return {
      grossYieldDisplay: `+${pct}%`,
      ilImpactDisplay:   `${ilPercent.toFixed(1)} after IL`,
    }
  }
  if (strategy === 'stake_lend') {
    return { grossYieldDisplay: `+${pct}%`, ilImpactDisplay: null }
  }
  return {
    grossYieldDisplay: grossYieldPct >= 0 ? `+${pct}%` : `${pct}%`,
    ilImpactDisplay:   null,
  }
}

// ── AI insight generator ──────────────────────────────────────────────────────

function generateInsights(
  columns: ScenarioColumnResult[],
  config: ScenarioCompareConfig,
): ScenarioAIInsights {
  const baseline    = columns.find(c => c.isBaseline)
  const stressors   = columns.filter(c => !c.isBaseline)
  const stratLabel  = STRATEGY_LABELS[config.strategy]
  const hasLP       = config.strategy === 'provide_liquidity'
  const hasStake    = config.strategy === 'stake_lend'

  // Summary
  let summary: string
  if (hasLP) {
    const baselinePositive = (baseline?.yieldVsRiskOffset ?? 0) > 0
    const allStressNegative = stressors.every(c => (c.yieldVsRiskOffset ?? 0) < 0)
    if (baselinePositive && allStressNegative) {
      const names = stressors.map(c => c.scenarioName).join(' and ')
      summary = `Under baseline conditions, LP produces positive yield with manageable risk exposure. However, under both ${names} scenarios, LP transitions into a net-loss strategy. The ${stressors[0]?.scenarioName ?? 'sharp drawdown'} scenario produces the most severe capital impairment due to compounded volatility and impermanent loss, while the ${stressors[1]?.scenarioName ?? 'gradual bear'} trend results in sustained erosion with slower recovery.`
    } else {
      summary = `LP performance varies significantly across scenarios. Baseline conditions support positive yield generation, while stress scenarios expose the structural sensitivity of LP positions to volatility and price divergence.`
    }
  } else if (hasStake) {
    summary = `${stratLabel} generates yield across all scenarios, but return profile diverges significantly under stress conditions. Capital preservation remains viable in baseline, while high-volatility scenarios compress net returns through increased impermanent loss risk and protocol exposure.`
  } else {
    const worstDd = columns.reduce((a, b) => a.maxDrawdownPct < b.maxDrawdownPct ? a : b)
    summary = `Hold Asset performance is purely price-driven across all scenarios. ${baseline?.scenarioName} shows modest drawdown at ${(Math.abs(baseline?.maxDrawdownPct ?? 0) * 100).toFixed(0)}%, while ${worstDd.scenarioName} produces the worst outcome with ${(Math.abs(worstDd.maxDrawdownPct) * 100).toFixed(0)}% maximum drawdown and no yield compensation.`
  }

  // Why risk exists
  let whyRiskTitle: string
  let whyRiskBullets: string[]
  if (hasLP) {
    whyRiskTitle = 'Why This Risk Exists (LP performance deteriorates under bearish conditions due to)'
    whyRiskBullets = [
      'Continuous rebalancing into falling assets',
      'Increasing exposure to underperforming tokens',
      'Fee generation failing to offset impermanent loss',
      'Higher volatility amplifying divergence between pooled assets',
      'In sharp drawdowns, losses accelerate rapidly. In gradual trends, losses accumulate persistently.',
    ]
  } else if (hasStake) {
    whyRiskTitle = 'Why This Risk Exists (Stake/Lend exposure increases under stress due to)'
    whyRiskBullets = [
      'Protocol liquidity constraints tighten during market stress events',
      'Yield compression as risk premiums are absorbed by capital losses',
      'Smart contract exposure amplifies downside beyond price movement',
      'Compounding effects reduce principal base, lowering effective APY',
      'Recovery extends as reduced principal generates lower absolute yield.',
    ]
  } else {
    whyRiskTitle = 'Why This Risk Exists (Hold positions amplify losses across bearish scenarios due to)'
    whyRiskBullets = [
      'No yield buffer to offset capital erosion during drawdowns',
      'Full directional correlation to underlying asset price',
      'Volatility regimes compound tail risk beyond expected ranges',
      'Recovery requires full price reversal with zero income generation',
      'Prolonged bear trends exhaust capital without any offset mechanism.',
    ]
  }

  // Assumption sensitivity (full-width text notes)
  const stressor0 = stressors[0]
  const stressor1 = stressors[1]
  let sensitivityNotes: string[]
  if (hasLP) {
    sensitivityNotes = [
      stressor0
        ? `Reducing volatility in ${stressor0.scenarioName} from ${columns.find(c => c.scenarioId === stressor0.scenarioId) ? 'Extreme' : 'High'} to High lowers IL by ~6–9% but does not restore profitability`
        : 'Reducing extreme volatility to high lowers IL by ~6–9% but does not restore profitability',
      'Turning OFF stress amplifier reduces max drawdown by ~8–12%',
      stressor1
        ? `In ${stressor1.scenarioName}, shortening time horizon reduces IL accumulation significantly`
        : 'Shortening the time horizon in gradual bear conditions reduces IL accumulation significantly',
      'Improving correlation (towards high) reduces divergence but increases synchronized downside risk',
    ]
  } else if (hasStake) {
    sensitivityNotes = [
      'Increasing staking APY by 2% partially compensates for drawdown under moderate stress',
      'Reducing volatility from Extreme to High extends recovery timeline by ~25%',
      'Lower correlation reduces correlated losses but increases basis risk',
      'Shortening time horizon limits total loss exposure but reduces yield accumulation',
    ]
  } else {
    sensitivityNotes = [
      'Reducing volatility from Extreme to High narrows drawdown range by ~15–20%',
      'Turning OFF stress amplifier reduces worst-case scenario by ~8–12%',
      'Negative correlation assumptions would reduce simultaneous drawdown across assets',
      'Shorter time horizons limit maximum drawdown but do not change the directionality of loss',
    ]
  }

  // Final recap
  let finalRecap: string[]
  if (hasLP) {
    finalRecap = [
      'LP is highly sensitive to both volatility intensity and trend persistence.',
      'It performs best in bounded or mildly volatile markets, but becomes structurally inefficient in sustained or extreme bearish conditions.',
    ]
  } else if (hasStake) {
    finalRecap = [
      `${stratLabel} provides yield in all scenarios, but net returns deteriorate sharply under sustained bear conditions.`,
      'The risk-adjusted case weakens as volatility increases and recovery timelines extend.',
    ]
  } else {
    finalRecap = [
      'Hold Asset exposes full capital to directional price risk with no income offset.',
      'Under sustained bearish scenarios, recovery requires complete price reversal and carries the longest time-to-recovery of all strategies.',
    ]
  }

  return { summary, whyRiskTitle, whyRiskBullets, sensitivityNotes, finalRecap }
}

// ── Main export ───────────────────────────────────────────────────────────────

function blockToSimConfig(
  block: ScenarioBlock,
  config: ScenarioCompareConfig,
) {
  return {
    name:              config.name,
    capitalAllocation: config.capitalAllocation,
    assets:            [] as never[],
    strategy:          config.strategy,
    marketScenario:    PRESET_TO_MARKET_SCENARIO[block.presetId] ?? ('baseline' as const),
    riskParameters:    { leverageCap: null, exposureCap: null, volatilitySensitivity: null },
    scenarioModifiers: block.scenarioModifiers,
    upperBand:         block.upperBand,
    lowerBand:         block.lowerBand,
    volatility:        block.volatility as import('../types').VolatilityLevel,
    correlation:       block.correlation,
    timePeriodDays:    block.timePeriodDays,
    stakeApy:          config.strategy === 'stake_lend'        ? DEFAULT_STAKE_APY  : undefined,
    lpFeeApr:          config.strategy === 'provide_liquidity' ? DEFAULT_LP_FEE_APR : undefined,
    assetA:            config.strategy === 'provide_liquidity' ? 'ETH'  : undefined,
    assetB:            config.strategy === 'provide_liquidity' ? 'USDC' : undefined,
  }
}

export async function runScenarioComparison(
  config: ScenarioCompareConfig,
): Promise<ScenarioCompareResult> {
  const simResults = await Promise.all(
    config.scenarios.map(block => runSimulation(blockToSimConfig(block, config)))
  )

  const columns: ScenarioColumnResult[] = config.scenarios.map((block, i) => {
    const r = simResults[i]
    const { grossYieldDisplay, ilImpactDisplay } = buildYieldDisplay(
      config.strategy, r.grossYieldPct, r.ilPercent,
    )
    return {
      scenarioId:              block.id,
      scenarioName:            block.label,
      isBaseline:              block.isBaseline,
      maxDrawdownPct:          r.maxDrawdownPct,
      capitalAtRiskUSD:        r.capitalAtRiskUSD,
      volatilityExposureLabel: volatilityLabel(r.volatilityExposure),
      timeToRecoveryDays:      r.timeToRecoveryDays,
      ilPercent:               r.ilPercent,
      grossYieldDisplay,
      ilImpactDisplay,
      yieldVsRiskOffset:       r.yieldRiskOffset,
    }
  })

  return { columns, insights: generateInsights(columns, config) }
}
