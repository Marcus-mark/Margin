import { useState, useRef } from 'react'
import { Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { usePreferencesStore } from '../store/preferencesStore'
import type { ExplainData, AIExplanationState, AIFollowUp } from '../store/simulationStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'novice' | 'advanced'

// ── Contextual color for numeric values ───────────────────────────────────────

function metricColor(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
  if (isNaN(num) || num >= 0) return 'text-bone'
  const abs = Math.abs(num)
  if (abs < 10)  return 'text-dust'
  if (abs < 25)  return 'text-ochre'
  if (abs < 45)  return 'text-oxide'
  return 'text-red-400'
}

// ── Inline {token} renderer ───────────────────────────────────────────────────

function Tokens({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{(.+)\}$/)
        return m
          ? <span key={i} className="text-ochre">{m[1]}</span>
          : <span key={i}>{part}</span>
      })}
    </>
  )
}

// ── API call ──────────────────────────────────────────────────────────────────

async function callExplain(
  results:      unknown,
  mode:         Mode,
  userQuestion: string | null,
): Promise<ExplainData> {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 25_000)

  try {
    const res = await fetch('/api/explain', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ results, expertiseMode: mode.toUpperCase(), userQuestion }),
      signal:  controller.signal,
    })

    if (!res.ok) {
      let errMsg = `Request failed — HTTP ${res.status}`
      try {
        const json = await res.json() as { error?: string }
        if (json.error) errMsg = json.error
      } catch { /* ignore */ }
      throw new Error(errMsg)
    }

    return await res.json() as ExplainData
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Explanation unavailable. Results are still valid and complete.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Explain Results dropdown ──────────────────────────────────────────────────

interface DropdownProps {
  loading:     boolean
  hasData:     boolean
  defaultMode: Mode
  onSelect:    (mode: Mode) => void
}

function ExplainDropdown({ loading, hasData, defaultMode, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = loading ? 'Analyzing…' : hasData ? 'Re-explain' : 'Explain Results'

  return (
    <div ref={ref} className="relative">
      <button
        disabled={loading}
        onClick={() => !loading && setOpen(o => !o)}
        className={[
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium',
          'border border-border-default bg-ash text-bone hover:border-dust transition-colors',
          loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ].join(' ')}
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        {label}
        {!loading && (
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[170px] bg-graphite border border-border-default rounded-xl shadow-xl z-20 overflow-hidden">
          {(['novice', 'advanced'] as Mode[]).map((m, i) => (
            <button
              key={m}
              onClick={() => { setOpen(false); onSelect(m) }}
              className={[
                'w-full flex flex-col gap-0.5 px-4 py-3 text-left hover:bg-ash/60 transition-colors',
                i === 0 ? 'border-b border-border-default' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-bone capitalize">{m}</span>
                {m === defaultMode && <span className="text-[10px] text-dust/60">default</span>}
              </div>
              <span className="text-[11px] text-dust">
                {m === 'novice' ? 'Plain English, no jargon' : 'DeFi terminology'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Card shell ────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border-default rounded-xl bg-graphite overflow-hidden">
      {children}
    </div>
  )
}

// ── Card 1: Worst Case Outcome ────────────────────────────────────────────────

function WorstCaseCard({ data }: { data: ExplainData['worstCase'] }) {
  return (
    <Shell>
      <div className="px-4 py-3 border-b border-border-default">
        <span className="text-[13px] font-medium text-bone">Worst Case Outcome</span>
      </div>
      <div className="flex items-start justify-between gap-6 px-4 py-3 border-b border-border-default">
        <span className="text-[12px] text-dust leading-snug">{data.condition}</span>
        <span className="text-[12px] text-bone text-right shrink-0 leading-snug">
          {data.metricLabel}{' '}
          <span className={metricColor(data.metricValue)}>{data.metricValue}</span>
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[12px] text-dust leading-relaxed">{data.detail}</p>
      </div>
    </Shell>
  )
}

// ── Card 2: Why This Risk Exists ──────────────────────────────────────────────

function WhyRiskCard({ data }: { data: ExplainData['whyRiskExists'] }) {
  return (
    <Shell>
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border-default">
        <span className="text-[13px] font-medium text-bone leading-snug">{data.title}</span>
        <Sparkles size={12} className="text-dust/50 shrink-0 mt-[2px]" />
      </div>
      <div className="divide-y divide-border-default">
        {data.bullets.map((bullet, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <span className="text-[11px] text-dust/60 shrink-0 mt-[2px] select-none">✓</span>
            <span className="text-[13px] text-bone leading-snug">{bullet}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

// ── Card 3: Variable Impact Breakdown ────────────────────────────────────────

function VariableImpactCard({ data }: { data: ExplainData['variableImpact'] }) {
  return (
    <Shell>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
        <span className="text-[13px] font-medium text-bone">Variable impact breakdown</span>
        <Sparkles size={12} className="text-dust/50 shrink-0" />
      </div>
      <div className="divide-y divide-border-default">
        {data.rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-[12px] text-dust leading-snug">{row.label}</span>
            <span className="text-[13px] text-bone text-right leading-snug">{row.value}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

// ── Card 4: Stress Scenario ───────────────────────────────────────────────────

function StressScenarioCard({ data }: { data: ExplainData['stressScenario'] }) {
  return (
    <Shell>
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border-default">
        <span className="text-[13px] font-medium text-bone leading-snug">
          {'Stress Scenario ('}
          <span className="text-ochre">{data.marketValue}</span>
          {' market decline scenario)'}
        </span>
        <Sparkles size={12} className="text-dust/50 shrink-0 mt-[2px]" />
      </div>
      <div className="divide-y divide-border-default">
        {data.lines.map((line, i) => (
          <div key={i} className="px-4 py-3">
            <p className="text-[13px] text-bone leading-snug">
              <Tokens text={line} />
            </p>
          </div>
        ))}
      </div>
    </Shell>
  )
}

// ── Card 5: Summary + Disclaimer ─────────────────────────────────────────────

const DISCLAIMER = [
  'MARGIN prioritizes downside exposure before return estimates',
  'All metrics are derived from deterministic scenario modeling',
  'Outputs are not predictive of future performance',
]

function SummaryCard({ summary }: { summary: string }) {
  return (
    <Shell>
      <div className="px-4 py-4 border-b border-border-default">
        <p className="text-[13px] text-bone leading-relaxed">{summary}</p>
      </div>
      <div className="divide-y divide-border-default">
        {DISCLAIMER.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
            <span className="text-[11px] text-dust/50 shrink-0 mt-[2px] select-none">✓</span>
            <span className="text-[12px] text-dust/70 leading-snug">{item}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

// ── Follow-up answer card ─────────────────────────────────────────────────────

function FollowUpCard({ question, answer }: { question: string; answer: string }) {
  return (
    <Shell>
      <div className="px-4 py-3 border-b border-border-default">
        <span className="text-[12px] text-dust leading-snug">{question}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] text-bone leading-relaxed">{answer}</p>
      </div>
    </Shell>
  )
}

// ── AIExplainPanel ────────────────────────────────────────────────────────────

export default function AIExplainPanel({
  results,
  initialState,
  onStateChange,
}: {
  results:        unknown
  initialState?:  AIExplanationState | null
  onStateChange?: (s: AIExplanationState) => void
}) {
  const { expertiseMode, incrementExplainCount } = usePreferencesStore()

  const [loading,       setLoading]       = useState(false)
  const [data,          setData]          = useState<ExplainData | null>(initialState?.data ?? null)
  const [error,         setError]         = useState<string | null>(null)
  const [mode,          setMode]          = useState<Mode | null>(initialState?.mode ?? null)
  const [followUps,     setFollowUps]     = useState<AIFollowUp[]>(initialState?.followUps ?? [])
  const [followInput,   setFollowInput]   = useState('')
  const [followLoading, setFollowLoading] = useState(false)
  const [followError,   setFollowError]   = useState<string | null>(null)

  // Stable ref so handlers always call the latest callback without being deps
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange

  const persist = (d: ExplainData, m: Mode, fu: AIFollowUp[]) =>
    onStateChangeRef.current?.({ data: d, mode: m, followUps: fu })

  const handleSelect = async (selectedMode: Mode) => {
    setMode(selectedMode)
    setLoading(true)
    setError(null)
    setData(null)
    setFollowUps([])
    setFollowError(null)

    try {
      const json = await callExplain(results, selectedMode, null)
      setData(json)
      incrementExplainCount()
      persist(json, selectedMode, [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUp = async () => {
    const question = followInput.trim()
    if (!question || !mode || !data) return
    setFollowLoading(true)
    setFollowError(null)

    try {
      const json    = await callExplain(results, mode, question)
      const newFUs  = [...followUps, { question, answer: json.summary }]
      setFollowUps(newFUs)
      setFollowInput('')
      persist(data, mode, newFUs)
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : String(err))
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">

      {/* Trigger row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-bone font-medium">AI Analysis</span>
          {mode && !loading && (
            <span className="text-[11px] text-dust capitalize">{mode} mode</span>
          )}
        </div>
        <ExplainDropdown
          loading={loading}
          hasData={!!data}
          defaultMode={expertiseMode}
          onSelect={handleSelect}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="text-dust animate-spin" />
          <span className="text-[13px] text-dust">Analyzing results…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      {/* Result cards */}
      {data && !loading && (
        <div className="w-full flex flex-col gap-4">
          <WorstCaseCard      data={data.worstCase} />
          <WhyRiskCard        data={data.whyRiskExists} />
          <VariableImpactCard data={data.variableImpact} />
          <StressScenarioCard data={data.stressScenario} />
          <SummaryCard        summary={data.summary} />

          {followUps.map((fu, i) => (
            <FollowUpCard key={i} question={fu.question} answer={fu.answer} />
          ))}

          {/* Follow-up input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={followInput}
                onChange={e => setFollowInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleFollowUp() }}
                placeholder="Ask a follow-up question…"
                disabled={followLoading}
                className="flex-1 bg-ash border border-border-default rounded-xl px-4 py-2.5 text-[13px] text-bone placeholder:text-dust/50 focus:outline-none focus:border-dust/60 disabled:opacity-50"
              />
              <button
                onClick={handleFollowUp}
                disabled={followLoading || !followInput.trim()}
                className={[
                  'px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-center min-w-[52px]',
                  followLoading || !followInput.trim()
                    ? 'bg-ash border border-border-default text-dust cursor-not-allowed'
                    : 'bg-oxide text-carbon hover:opacity-90 cursor-pointer',
                ].join(' ')}
              >
                {followLoading ? <Loader2 size={13} className="animate-spin" /> : 'Ask'}
              </button>
            </div>
            {followError && (
              <p className="text-[12px] text-red-400">{followError}</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
