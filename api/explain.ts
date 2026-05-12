import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEM_PROMPT = `You are MARGIN's explanation engine. You explain DeFi simulation results in plain language. You have access to computed results only. Do not predict future prices or market movements. Do not give financial advice. Do not reference any market data, prices, or events not contained in the payload provided to you. Do not use numbers that are not in the data provided. If expertiseMode is NOVICE use plain English only, no jargon. If expertiseMode is ADVANCED include technical terms.

Return only a valid JSON object with exactly these five top-level keys. Do not include markdown, code blocks, or any text outside the JSON object.

"worstCase": object with four string fields — "condition" (short context phrase, e.g. "Under adverse but realistic conditions"), "metricLabel" (the label before the key metric, e.g. "Capital declines up to"), "metricValue" (the numeric value with sign and unit from the data, e.g. "-18.4%"), "detail" (one to two sentences on the primary driver and its practical meaning).

"whyRiskExists": object with two fields — "title" (a sentence beginning with "Why this risk exists?" naming the primary drivers), "bullets" (array of two to four strings, each a distinct risk driver).

"variableImpact": object with one field — "rows" (array of three to four objects, each with "label" and "value" strings for two-column display).

"stressScenario": object with two fields — "marketValue" (the stress decline percentage from the data, e.g. "-30%"), "lines" (array of two to four strings describing stress outcomes; wrap any numeric metric values to visually emphasize in curly braces, e.g. "Drawdown increases to {-32%}").

"summary": a single string of one to two sentences giving the overall risk verdict.`

interface ExplainResponse {
  worstCase: {
    condition:   string
    metricLabel: string
    metricValue: string
    detail:      string
  }
  whyRiskExists: {
    title:   string
    bullets: string[]
  }
  variableImpact: {
    rows: Array<{ label: string; value: string }>
  }
  stressScenario: {
    marketValue: string
    lines:       string[]
  }
  summary: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: ANTHROPIC_API_KEY is not set' })
  }

  const body          = req.body as Record<string, unknown>
  const expertiseMode = body.expertiseMode === 'ADVANCED' ? 'ADVANCED' : 'NOVICE'
  const userQuestion  = typeof body.userQuestion === 'string' ? body.userQuestion : null

  const messageParts = [
    `expertiseMode: ${expertiseMode}`,
    '',
    'Simulation results:',
    JSON.stringify(body.results ?? {}, null, 2),
    '',
    userQuestion ? `Follow-up question: ${userQuestion}` : 'Explain these results.',
  ]

  try {
    const client = new Anthropic({ apiKey, timeout: 25_000 })

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: messageParts.join('\n') }],
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

    return res.status(200).json(parsed)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; error?: { type?: string; message?: string } }

    console.error('[explain] Anthropic call failed')
    console.error('[explain] status:', e.status ?? 'none')
    console.error('[explain] error body:', JSON.stringify(e.error ?? null))
    console.error('[explain] message:', e.message ?? String(err))

    let responseError: string
    if (e.status != null) {
      const type   = e.error?.type    ?? ''
      const detail = e.error?.message ?? e.message ?? ''
      const parts  = [type, detail].filter(Boolean).join(' — ')
      responseError = parts
        ? `Anthropic API error (status ${e.status}): ${parts}`
        : `Anthropic API error (status ${e.status})`
    } else if (err instanceof Error) {
      responseError = err.message
    } else {
      responseError = 'Failed to reach explanation service'
    }

    return res.status(500).json({ error: responseError })
  }
}
