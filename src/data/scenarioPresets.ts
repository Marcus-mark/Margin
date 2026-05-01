export type ScenarioModifiers = {
  stressValue: string           // from STRESS_OPTIONS
  tailRisk: string              // from TAIL_RISK_OPTIONS
  rebalanceSensitivity: string  // 'Low' | 'Medium' | 'High'
}

export type ScenarioPreset = {
  id: string
  name: string
  lowerBand: number   // lower price bound (negative)
  upperBand: number   // upper price bound (negative or positive)
  volatility: string
  correlation: string
  modifiers: ScenarioModifiers
  isCustom?: true
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'baseline',
    name: 'Baseline Market Conditions',
    lowerBand: -10, upperBand: 12,
    volatility: 'Medium',
    correlation: 'Moderate Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.0x', rebalanceSensitivity: 'Medium' },
  },
  {
    id: 'sharp_drawdown',
    name: 'Sharp Market Drawdown',
    lowerBand: -60, upperBand: -25,
    volatility: 'High',
    correlation: 'High Correlation',
    modifiers: { stressValue: '2.0x', tailRisk: '2.0x', rebalanceSensitivity: 'High' },
  },
  {
    id: 'gradual_bear',
    name: 'Gradual Bear Trend',
    lowerBand: -45, upperBand: -15,
    volatility: 'Medium',
    correlation: 'Moderate Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.5x', rebalanceSensitivity: 'Medium' },
  },
  {
    id: 'sideways_vol',
    name: 'Sideways Volatility (Chop Zone)',
    lowerBand: -15, upperBand: 15,
    volatility: 'Medium',
    correlation: 'Low Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.5x', rebalanceSensitivity: 'High' },
  },
  {
    id: 'bull_expansion',
    name: 'Bull Expansion with Pullbacks',
    lowerBand: -20, upperBand: 80,
    volatility: 'Medium',
    correlation: 'Moderate Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.5x', rebalanceSensitivity: 'Medium' },
  },
  {
    id: 'liquidity_shock',
    name: 'Liquidity Shock Event',
    lowerBand: -70, upperBand: -30,
    volatility: 'Extreme',
    correlation: 'High Correlation',
    modifiers: { stressValue: '2.0x', tailRisk: '2.0x', rebalanceSensitivity: 'Low' },
  },
  {
    id: 'correlation_breakdown',
    name: 'Correlation Breakdown',
    lowerBand: -35, upperBand: 40,
    volatility: 'High',
    correlation: 'Negative Correlation',
    modifiers: { stressValue: '2.0x', tailRisk: '2.0x', rebalanceSensitivity: 'High' },
  },
  {
    id: 'low_vol',
    name: 'Low Volatility Compression',
    lowerBand: -5, upperBand: 5,
    volatility: 'Low',
    correlation: 'High Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.0x', rebalanceSensitivity: 'Low' },
  },
  {
    id: 'flash_crash',
    name: 'Flash Crash & Recovery',
    lowerBand: -65, upperBand: 10,
    volatility: 'Extreme',
    correlation: 'High Correlation',
    modifiers: { stressValue: '2.0x', tailRisk: '2.0x', rebalanceSensitivity: 'High' },
  },
  {
    id: 'custom_a',
    name: 'Custom A',
    lowerBand: -10, upperBand: 10,
    volatility: 'Medium',
    correlation: 'Moderate Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.0x', rebalanceSensitivity: 'Medium' },
    isCustom: true,
  },
  {
    id: 'custom_b',
    name: 'Custom B',
    lowerBand: -10, upperBand: 10,
    volatility: 'Medium',
    correlation: 'Moderate Correlation',
    modifiers: { stressValue: '1.0x', tailRisk: '1.0x', rebalanceSensitivity: 'Medium' },
    isCustom: true,
  },
]

// Quick-pick range: -100 to +100 in steps of 5 (41 values)
export const BAND_PRESETS: number[] = Array.from({ length: 41 }, (_, i) => -100 + i * 5)

export const fmtBand = (v: number): string => v > 0 ? `+${v}` : String(v)

// Scrolls the 4-item window to centre on value v (clamps to -100…+100 range)
export const windowFor = (v: number, totalLen: number, windowSize: number): number => {
  const clamped = Math.max(-100, Math.min(100, Math.round(v / 5) * 5))
  const idx = (clamped + 100) / 5
  return Math.max(0, Math.min(idx - 1, totalLen - windowSize))
}
