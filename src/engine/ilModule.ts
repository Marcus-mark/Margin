import type { SimulationConfig, ScenarioResult, ILResult } from '../types'

// ── Return type ───────────────────────────────────────────────────────────────

export interface ILCalculation {
  ilPercent:     number   // IL as a negative percentage, e.g. -5.72
  ilUSD:         number   // IL in dollars (negative)
  holdValueUSD:  number   // what the portfolio would be worth if tokens were simply held
  lpValueUSD:    number   // LP position value after IL
  feeIncomeUSD:  number   // fees earned over the time period at the given APR
  netPositionUSD: number  // lpValueUSD + feeIncomeUSD
}

// ── Pure calculation ──────────────────────────────────────────────────────────

export function calculateIL(
  initialPriceA:     number,  // entry price of asset A (e.g. 1000)
  initialPriceB:     number,  // entry price of asset B (e.g. 1)
  finalPriceA:       number,  // exit price of asset A
  finalPriceB:       number,  // exit price of asset B
  lpFeeApr:          number,  // fee APR as a percentage, e.g. 20 means 20 %
  timePeriodDays:    number,  // holding period in days
  portfolioValueUSD: number,  // total capital deposited (USD)
): ILCalculation {
  const priceRatio = finalPriceA / initialPriceA

  // IL = (2 × sqrt(priceRatio) / (1 + priceRatio)) − 1
  const il = (2 * Math.sqrt(priceRatio) / (1 + priceRatio)) - 1

  const ilPercent = il * 100

  // Assume 50 / 50 pool: half the portfolio in each asset at entry prices.
  // holdValueUSD is what a pure holder would have at final prices.
  const half = portfolioValueUSD / 2
  const holdValueUSD = half * (finalPriceA / initialPriceA)
                     + half * (finalPriceB / initialPriceB)

  // LP value = hold value scaled by the IL factor
  // (IL is defined as LP value / hold value − 1, so LP value = hold × (1 + il))
  const lpValueUSD = holdValueUSD * (1 + il)

  // Dollar IL is the gap between what a holder has and what the LP position has
  const ilUSD = lpValueUSD - holdValueUSD

  // Fees accrue on the deposited capital pro-rated to the holding period
  const feeIncomeUSD = portfolioValueUSD * (lpFeeApr / 100) * (timePeriodDays / 365)

  const netPositionUSD = lpValueUSD + feeIncomeUSD

  return { ilPercent, ilUSD, holdValueUSD, lpValueUSD, feeIncomeUSD, netPositionUSD }
}

// ── Engine adapter (stub — requires price oracle inputs not yet wired) ────────

export async function runILModule(
  _config: SimulationConfig,
  _scenario: ScenarioResult,
): Promise<ILResult> {
  throw new Error('ilModule: not yet implemented')
}

/*
── Example calculations ─────────────────────────────────────────────────────────

Example 1 — ETH doubles, USDC stable
  calculateIL(1000, 1, 2000, 1, 20, 30, 10_000)

  priceRatio = 2000 / 1000 = 2
  il         = (2 × √2 / (1 + 2)) − 1 = (2.82843 / 3) − 1 = 0.94281 − 1 = −0.05719
  ilPercent  = −5.72 %

  holdValueUSD   = 5000 × 2 + 5000 × 1               = 15 000.00
  lpValueUSD     = 15 000 × 0.94281                   = 14 142.14
  ilUSD          = 14 142.14 − 15 000                 =   −857.86
  feeIncomeUSD   = 10 000 × 0.20 × (30 / 365)         =    164.38
  netPositionUSD = 14 142.14 + 164.38                 = 14 306.52

──

Example 2 — No price change (zero IL)
  calculateIL(1000, 1, 1000, 1, 10, 365, 5_000)

  priceRatio = 1
  il         = (2 × 1 / 2) − 1 = 0
  ilPercent  = 0 %

  holdValueUSD   = 2500 × 1 + 2500 × 1               =  5 000.00
  lpValueUSD     = 5 000 × 1.0                        =  5 000.00
  ilUSD          = 0
  feeIncomeUSD   = 5 000 × 0.10 × (365 / 365)         =    500.00
  netPositionUSD = 5 000 + 500                        =  5 500.00

──

Example 3 — Price quadruples (landmark −20 % IL)
  calculateIL(1000, 1, 4000, 1, 5, 365, 100_000)

  priceRatio = 4
  il         = (2 × √4 / (1 + 4)) − 1 = (4 / 5) − 1 = −0.20
  ilPercent  = −20 %

  holdValueUSD   = 50 000 × 4 + 50 000 × 1            = 250 000.00
  lpValueUSD     = 250 000 × 0.80                      = 200 000.00
  ilUSD          = 200 000 − 250 000                   = −50 000.00
  feeIncomeUSD   = 100 000 × 0.05 × (365 / 365)        =   5 000.00
  netPositionUSD = 200 000 + 5 000                     = 205 000.00

─────────────────────────────────────────────────────────────────────────────────
*/
