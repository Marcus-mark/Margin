import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ── System prompts ─────────────────────────────────────────────────────────────

const BASE_RULES = `\
You are MARGIN's explanation engine. You explain DeFi simulation results in plain language.

Rules:
- Do not predict market movements.
- Do not give financial advice.
- Do not use numbers that are not in the data provided to you.
- Only explain what the computed results show.
- Return ONLY a valid JSON object — no markdown, no code fences, no prose outside the JSON.

Return a JSON object with exactly these four fields, each a string of two to four sentences:
{
  "summary": "...",
  "whyRiskExists": "...",
  "variableImpact": "...",
  "assumptionSensitivity": "..."
}

Field definitions:
- summary: The overall risk verdict — what the risk level and drawdown mean in practical terms for this capital amount.
- whyRiskExists: Which specific inputs (strategy, scenario, volatility, correlation) drove the risk level, and why.
- variableImpact: Which single scenario parameter or risk modifier had the largest effect on the outcome, and how.
- assumptionSensitivity: What would change most if one key input shifted — for example if volatility were lower, or the time horizon shorter.`

const NOVICE_INSTRUCTION = `\
Language style — NOVICE MODE:
Write as if explaining to someone who has never invested in crypto before.
- Use everyday analogies (e.g. "think of this like a savings account that can lose value").
- Never use acronyms like IL, APR, APY, LP, or DeFi without immediately explaining them in plain words.
- Keep sentences short. One idea per sentence.
- Replace financial jargon with plain equivalents: "drawdown" → "drop in value", "volatility" → "how much prices swing", "yield" → "money you earn".
- Make the stakes feel real and human: "if you put in $10,000, the worst case is you could end up with roughly $X".`

const ADVANCED_INSTRUCTION = `\
Language style — ADVANCED MODE:
Write for a DeFi practitioner with hands-on protocol experience.
- Use precise on-chain terminology without explanation: IL, delta exposure, fee APR, liquidity concentration, rebalancing friction, drawdown duration, yield-risk spread, tail-risk quantile.
- Reference the specific strategy mechanics (e.g. "concentrated LP position within a ±X% band amplifies IL nonlinearly near the band edges").
- Frame risk in portfolio terms: mention basis risk, correlation assumptions, scenario stress multipliers.
- Be analytically direct — state what the numbers imply for position sizing, hedging decisions, or exit triggers.`

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

function usd(n: number): string {
  return '$ ' + Math.round(Math.abs(n)).toLocaleString('en-US')
}

function buildUserMessage(body: Record<string, unknown>): string {
  const config  = (body.config  ?? {}) as Record<string, unknown>
  const results = (body.results ?? {}) as Record<string, unknown>

  const lines: string[] = [
    '=== SIMULATION INPUTS ===',
    `Name: ${config.name ?? 'Unnamed'}`,
    `Strategy: ${config.strategy ?? 'unknown'}`,
    `Capital Allocation: ${usd(Number(config.capitalAllocation ?? 0))}`,
    `Market Scenario: ${config.marketScenario ?? 'unknown'}`,
    `Time Horizon: ${config.timePeriodDays ?? '?'} days`,
    `Volatility: ${config.volatility ?? '?'}`,
    `Correlation: ${config.correlation ?? '?'}`,
    '',
    '=== SIMULATION RESULTS ===',
    `Risk Level: ${String(results.riskLevel ?? '?').toUpperCase()}`,
    `Max Drawdown: ${pct(Number(results.maxDrawdownPct ?? 0))} (${usd(Number(results.maxDrawdownUSD ?? 0))})`,
    `Capital at Risk: ${usd(Number(results.capitalAtRiskUSD ?? 0))} (${pct(Number(results.capitalAtRiskPct ?? 0))})`,
    `Volatility Exposure Score: ${Number(results.volatilityExposure ?? 0).toFixed(2)}`,
    `Drawdown Duration: ${Math.round(Number(results.drawdownDurationDays ?? 0))} days`,
    `Time to Recovery: ${Math.round(Number(results.timeToRecoveryDays ?? 0))} days`,
    `Gross Yield: ${pct(Number(results.grossYieldPct ?? 0))} (${usd(Number(results.grossYieldUSD ?? 0))})`,
    `Net Yield: ${pct(Number(results.netYieldPct ?? 0))} (${usd(Number(results.netYieldUSD ?? 0))})`,
    `Projected Return Range: ${usd(Number(results.projectedReturnMinUSD ?? 0))} – ${usd(Number(results.projectedReturnMaxUSD ?? 0))}`,
    `Yield vs Risk Offset: ${results.yieldRiskOffset != null ? Number(results.yieldRiskOffset).toFixed(3) : 'N/A'}`,
  ]

  if (results.ilPercent != null) {
    lines.push(
      `Impermanent Loss: ${Number(results.ilPercent).toFixed(2)}% (${usd(Number(results.ilUSD ?? 0))})`,
      `LP Value: ${usd(Number(results.lpValueUSD ?? 0))}`,
      `Hold Value: ${usd(Number(results.holdValueUSD ?? 0))}`,
      `Fee Income: ${usd(Number(results.feeIncomeUSD ?? 0))}`,
    )
  }

  lines.push('', 'Explain these results.')

  return lines.join('\n')
}

// ── Response type ─────────────────────────────────────────────────────────────

interface ExplainResponse {
  summary:               string
  whyRiskExists:         string
  variableImpact:        string
  assumptionSensitivity: string
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const body = req.body as Record<string, unknown>
    const mode = body.mode === 'advanced' ? 'advanced' : 'novice'

    const systemPrompt = [
      BASE_RULES,
      mode === 'advanced' ? ADVANCED_INSTRUCTION : NOVICE_INSTRUCTION,
    ].join('\n\n')

    const userMessage = buildUserMessage(body)

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      throw new Error('Unexpected response block type from Anthropic API')
    }

    let parsed: ExplainResponse
    try {
      parsed = JSON.parse(block.text) as ExplainResponse
    } catch {
      throw new Error('Anthropic response was not valid JSON')
    }

    return res.status(200).json({
      summary:               parsed.summary               ?? '',
      whyRiskExists:         parsed.whyRiskExists         ?? '',
      variableImpact:        parsed.variableImpact        ?? '',
      assumptionSensitivity: parsed.assumptionSensitivity ?? '',
    })
  } catch (err) {
    console.error('Anthropic API error:', err)
    return res.status(500).json({ error: 'Failed to generate explanation' })
  }
}
