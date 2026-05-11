import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Loader2, ChevronDown } from 'lucide-react'
import { useSimulationStore } from '../store/simulationStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'novice' | 'advanced'

interface ExplainData {
  summary:               string
  whyRiskExists:         string
  variableImpact:        string
  assumptionSensitivity: string
}

// ── Dropdown trigger ──────────────────────────────────────────────────────────

interface DropdownProps {
  loading:   boolean
  hasData:   boolean
  onSelect:  (mode: Mode) => void
}

function ExplainDropdown({ loading, hasData, onSelect }: DropdownProps) {
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
          'border border-border-default bg-ash text-bone',
          'hover:border-dust transition-colors',
          loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ].join(' ')}
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        {label}
        {!loading && (
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
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
              <span className="text-[13px] text-bone capitalize">{m}</span>
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

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, body, bullet = false }: {
  title:   string
  body:    string
  bullet?: boolean
}) {
  const sentences = bullet
    ? body.split(/(?<=[.!?])\s+/).filter(Boolean)
    : null

  return (
    <div className="mx-[10%] border border-border-default rounded-xl bg-graphite px-4 py-4 flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.07em] text-dust uppercase">{title}</span>
      {bullet && sentences ? (
        <ul className="flex flex-col gap-1.5">
          {sentences.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-oxide shrink-0 mt-[2px]" />
              <span className="text-[13px] text-bone leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-bone leading-relaxed">{body}</p>
      )}
    </div>
  )
}

// ── Stress card ───────────────────────────────────────────────────────────────

function StressCard({ body }: { body: string }) {
  const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean)

  return (
    <div className="mx-[10%] border border-border-default rounded-xl bg-graphite px-4 py-4 flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.07em] text-dust uppercase">Stress Scenario</span>
      <div className="flex flex-col gap-1.5">
        {sentences.map((s, i) => (
          <p key={i} className={`text-[13px] leading-relaxed ${i === 0 ? 'text-ochre' : 'text-bone'}`}>
            {s}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Disclaimer card ───────────────────────────────────────────────────────────

function DisclaimerCard() {
  const items = [
    'MARGIN prioritizes downside exposure in all calculations.',
    'All metrics are derived from deterministic scenario modeling.',
    'Outputs are not predictive of future performance.',
  ]
  return (
    <div className="mx-[10%] border border-border-default rounded-xl bg-graphite px-4 py-4 flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.07em] text-dust uppercase">Disclaimer</span>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 size={13} className="text-dust/50 shrink-0 mt-[2px]" />
            <span className="text-[12px] text-dust leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── ExplainPanel ──────────────────────────────────────────────────────────────

export default function ExplainPanel() {
  const { config, results } = useSimulationStore()

  const [loading, setLoading] = useState(false)
  const [data,    setData]    = useState<ExplainData | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [mode,    setMode]    = useState<Mode | null>(null)

  const handleSelect = async (selectedMode: Mode) => {
    if (!config || !results) return
    setMode(selectedMode)
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch('/api/explain', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ config, results, mode: selectedMode }),
      })

      if (!res.ok) throw new Error(`Request failed (${res.status})`)

      const json = await res.json() as ExplainData
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate explanation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-3 pb-1">

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className="mx-[10%] flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-bone font-medium">AI Analysis</span>
          {mode && !loading && (
            <span className="text-[11px] text-dust capitalize">{mode} mode</span>
          )}
        </div>
        <ExplainDropdown
          loading={loading}
          hasData={!!data}
          onSelect={handleSelect}
        />
      </div>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="mx-[10%] flex items-center gap-2 py-4">
          <Loader2 size={14} className="text-dust animate-spin" />
          <span className="text-[13px] text-dust">Analyzing simulation results…</span>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="mx-[10%] rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {data && !loading && (
        <div className="flex flex-col gap-3">
          <SectionCard title="Summary"              body={data.summary} />
          <SectionCard title="Why this risk exists" body={data.whyRiskExists} bullet />
          <SectionCard title="Variable impact"      body={data.variableImpact} />
          <StressCard  body={data.assumptionSensitivity} />
          <DisclaimerCard />
        </div>
      )}

    </div>
  )
}
