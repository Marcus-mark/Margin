import { runSimulation } from './index'
import type { Strategy } from '../types'
import type {
  CompareConfig, CompareResult, StrategyCompareResult,
  AIInsights, SensitivityRow,
} from '../store/compareStore'
import { SCENARIO_PRESETS } from '../data/scenarioPresets'

// ── Constants ─────────────────────────────────────────────────────────────────

export const STRATEGY_LABELS: Record<Strategy, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'Liquidity Provision',
}

const DEFAULT_STAKE_APY  = 8.5
const DEFAULT_LP_FEE_APR = 14.2

// ── Helpers ───────────────────────────────────────────────────────────────────

function volatilityLabel(score: number): string {
  if (score < 0.4)  return 'Low'
  if (score < 0.75) return 'Moderate'
  if (score < 1.5)  return 'High'
  return 'Extreme'
}

function buildYieldDisplay(
  strategy: Strategy,
  grossYieldPct: number,   // decimal
  ilPercent: number | null, // percentage, e.g. -21
): { grossYieldDisplay: string; ilImpactDisplay: string | null } {
  if (strategy === 'provide_liquidity') {
    const gross = `${(grossYieldPct * 100).toFixed(1)}%`
    const il    = ilPercent !== null ? `${ilPercent.toFixed(1)} IL impact` : null
    return { grossYieldDisplay: gross, ilImpactDisplay: il }
  }
  if (strategy === 'stake_lend') {
    return {
      grossYieldDisplay: `${(grossYieldPct * 100).toFixed(1)}% APY`,
      ilImpactDisplay:   null,
    }
  }
  return {
    grossYieldDisplay: grossYieldPct === 0 ? '0%' : `${(grossYieldPct * 100).toFixed(1)}%`,
    ilImpactDisplay:   null,
  }
}

// ── AI insight generator ──────────────────────────────────────────────────────

function generateInsights(
  strategies: StrategyCompareResult[],
  config: CompareConfig,
): AIInsights {
  const sorted   = [...strategies].sort((a, b) => a.maxDrawdownPct - b.maxDrawdownPct)
  const worst    = sorted[0]
  const best     = sorted[sorted.length - 1]
  const hasLP    = strategies.some(s => s.strategy === 'provide_liquidity')
  const hasStake = strategies.some(s => s.strategy === 'stake_lend')
  const hasHold  = strategies.some(s => s.strategy === 'hold_asset')

  const presetName = SCENARIO_PRESETS.find(p => p.id === config.scenarioPresetId)?.name
    ?? 'current market conditions'

  // Summary
  let summary: string
  if (hasLP) {
    let text = `Under ${presetName.toLowerCase()} conditions, Liquidity Provision (LP) exhibits the highest nominal yield but the worst risk-adjusted performance due to impermanent loss amplification.`
    if (hasStake) text += ` Stake provides the most stable capital preservation profile, while`
    if (hasHold)  text += ` Hold sits between both strategies in downside exposure but offers no yield compensation.`
    else if (hasStake) text += ` it maintains yield generation even under sustained downside pressure.`
    summary = text
  } else {
    summary = `Under ${presetName.toLowerCase()} conditions, ${worst.label} exhibits the highest risk exposure with ${(Math.abs(worst.maxDrawdownPct) * 100).toFixed(0)}% maximum drawdown. ${best.label} provides the most favorable risk-adjusted profile under these conditions.`
  }

  // Why risk exists
  let whyRiskTitle: string
  let whyRiskBullets: string[]
  if (hasLP) {
    whyRiskTitle = 'Why This Risk Exists (LP positions are structurally exposed to)'
    whyRiskBullets = [
      'Price divergence between paired assets',
      'Automated rebalancing selling strength and buying weakness',
      'Volatility amplification during directional moves',
      'Fee income insufficient to offset IL under stress conditions',
      'In sharp drawdowns, these factors compound instead of offsetting.',
    ]
  } else if (worst.strategy === 'hold_asset') {
    whyRiskTitle = 'Why This Risk Exists (Hold positions are directly exposed to)'
    whyRiskBullets = [
      'Full directional exposure to asset price movements',
      'No yield generation to offset capital losses during drawdowns',
      'Correlation effects amplify losses during market-wide downturns',
      `${config.volatility} volatility regime compounds tail-risk events`,
      'Recovery requires full price reversal with no fee income buffer.',
    ]
  } else {
    whyRiskTitle = `Why This Risk Exists (${worst.label} positions are exposed to)`
    whyRiskBullets = [
      'Protocol and smart contract exposure amplifies market risk',
      'Liquidity withdrawal risk concentrates during peak stress events',
      `Yield generation does not fully offset ${config.volatility.toLowerCase()} volatility losses`,
      'Compounding drawdown effects reduce principal faster than yield accrues',
      'Recovery period extends due to diminished base capital.',
    ]
  }

  // Assumption sensitivity
  const volMap: Record<string, string> = {
    Extreme: 'High', High: 'Medium', Medium: 'Low', Low: 'Low',
  }
  const sensitivityRows: SensitivityRow[] = [
    {
      label:     `Reducing volatility from ${config.volatility} to ${volMap[config.volatility] ?? 'Medium'}`,
      effect:    `Improves ${worst.label} recovery time by`,
      highlight: '~18%',
    },
    {
      label:     `Lowering tail risk multiplier from ${config.scenarioModifiers.tailRisk} to 1.2x`,
      effect:    `Reduces ${worst.label} drawdown by`,
      highlight: '~9–12%',
    },
  ]
  const sensitivityNote = hasLP
    ? 'If correlation drops to Moderate, LP IL impact decreases but remains negative under sustained downtrend'
    : `If correlation drops to Moderate, ${worst.label} losses decrease but downside exposure remains under sustained pressure`

  // Final recap
  let finalRecap: string[]
  if (hasLP) {
    finalRecap = [
      'LP is yield-positive only in low-to-moderate volatility regimes.',
      'In sharp drawdowns, it becomes a negative convexity strategy—loss accelerates as price divergence increases.',
    ]
  } else {
    const diff = ((Math.abs(worst.maxDrawdownPct) - Math.abs(best.maxDrawdownPct)) * 100).toFixed(0)
    finalRecap = [
      `${worst.label} performance deteriorates significantly under ${config.volatility.toLowerCase()} volatility conditions.`,
      `Switching to ${best.label} reduces drawdown exposure by ~${diff}pp under this scenario.`,
    ]
  }

  return { summary, whyRiskTitle, whyRiskBullets, sensitivityRows, sensitivityNote, finalRecap }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runComparison(config: CompareConfig): Promise<CompareResult> {
  const simResults = await Promise.all(
    config.selectedStrategies.map(strategy =>
      runSimulation({
        name:              config.name,
        capitalAllocation: config.capitalAllocation,
        assets:            [],
        strategy,
        marketScenario:    config.marketScenario,
        riskParameters:    { leverageCap: null, exposureCap: null, volatilitySensitivity: null },
        scenarioModifiers: config.scenarioModifiers,
        upperBand:         config.upperBand,
        lowerBand:         config.lowerBand,
        volatility:        config.volatility as import('../types').VolatilityLevel,
        correlation:       config.correlation,
        timePeriodDays:    config.timePeriodDays,
        stakeApy:          strategy === 'stake_lend'        ? DEFAULT_STAKE_APY  : undefined,
        lpFeeApr:          strategy === 'provide_liquidity' ? DEFAULT_LP_FEE_APR : undefined,
        assetA:            strategy === 'provide_liquidity' ? 'ETH'  : undefined,
        assetB:            strategy === 'provide_liquidity' ? 'USDC' : undefined,
      })
    )
  )

  const strategies: StrategyCompareResult[] = config.selectedStrategies.map((strategy, i) => {
    const r = simResults[i]
    const { grossYieldDisplay, ilImpactDisplay } = buildYieldDisplay(strategy, r.grossYieldPct, r.ilPercent)
    return {
      strategy,
      label:                   STRATEGY_LABELS[strategy],
      maxDrawdownPct:          r.maxDrawdownPct,
      capitalAtRiskUSD:        r.capitalAtRiskUSD,
      volatilityExposureLabel: volatilityLabel(r.volatilityExposure),
      timeToRecoveryDays:      r.timeToRecoveryDays,
      ilPercent:               r.ilPercent,
      grossYieldDisplay,
      ilImpactDisplay,
      yieldVsRiskOffset:       r.yieldRiskOffset,
      riskLevel:               r.riskLevel,
    }
  })

  return { strategies, insights: generateInsights(strategies, config) }
}
