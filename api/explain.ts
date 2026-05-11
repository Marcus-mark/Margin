import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are MARGIN's AI risk analyst. You interpret DeFi capital simulation results and explain them clearly to investors and DeFi practitioners.

Given simulation output, write a structured explanation covering:
1. The overall risk verdict — what the risk level means in practical terms for this capital amount.
2. Capital exposure — what portion of capital is genuinely at risk, why, and what drives the drawdown.
3. Yield versus drawdown — whether the expected return adequately compensates for the risk, referencing the yield-risk offset.
4. Key watch-outs — one or two specific conditions or thresholds the user should monitor given this strategy and scenario.

Rules:
- Be direct and specific. Use the exact dollar amounts and percentages from the simulation.
- Do not use headers, bullet points, or markdown. Write in 3–4 concise prose paragraphs.
- Do not explain how the engine works or how numbers were calculated — only what they mean for the user's capital.
- Avoid generic risk disclaimers.`

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

  lines.push(
    '',
    'Explain these results to the investor.',
  )

  return lines.join('\n')
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
    const userMessage = buildUserMessage(body)

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      throw new Error('Unexpected response block type from Anthropic API')
    }

    return res.status(200).json({ explanation: block.text })
  } catch (err) {
    console.error('Anthropic API error:', err)
    return res.status(500).json({ error: 'Failed to generate explanation' })
  }
}
