import { useState, useRef, useEffect } from 'react'
import { Search, Bell, CircleUser } from 'lucide-react'
import { useSavesStore } from '../store/savesStore'
import ProfilePanel from './ProfilePanel'

// ── Label / badge maps ────────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<string, string> = {
  hold_asset:        'Hold Asset',
  stake_lend:        'Stake / Lend',
  provide_liquidity: 'LP',
}

const RISK_BADGE: Record<string, { label: string; cls: string }> = {
  low:      { label: 'LOW',      cls: 'bg-ash text-dust border border-border-default' },
  moderate: { label: 'MODERATE', cls: 'bg-ochre/15 text-ochre border border-ochre/30' },
  high:     { label: 'HIGH',     cls: 'bg-oxide/15 text-oxide border border-oxide/30' },
  critical: { label: 'CRITICAL', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  extreme:  { label: 'EXTREME',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  kind:      'saved' | 'recent'
  id:        string
  name:      string
  date:      string
  strategy:  string
  riskLevel: string
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onOpenSaved:  (simulationGroupId: string) => void
  onOpenRecent: (runId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Header({ onOpenSaved, onOpenRecent }: HeaderProps) {
  const [query, setQuery]             = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [bellOpen, setBellOpen]       = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bellOpen) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen])
  const entries = useSavesStore(s => s.entries)
  const recents = useSavesStore(s => s.recents)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close results on click outside
  useEffect(() => {
    if (!query) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [query])

  // Build filtered results
  const q = query.trim().toLowerCase()
  const results: SearchResult[] = []

  if (q) {
    for (const e of entries) {
      if (e.name.toLowerCase().includes(q)) {
        results.push({
          kind: 'saved', id: e.simulationGroupId,
          name: e.name, date: e.savedAt,
          strategy: e.strategy, riskLevel: e.riskLevel,
        })
      }
    }
    for (const r of recents) {
      if (r.name.toLowerCase().includes(q)) {
        results.push({
          kind: 'recent', id: r.runId,
          name: r.name, date: r.runnedAt,
          strategy: r.strategy, riskLevel: r.riskLevel,
        })
      }
    }
    results.sort((a, b) => b.date.localeCompare(a.date))
  }

  const handleOpen = (result: SearchResult) => {
    setQuery('')
    if (result.kind === 'saved') onOpenSaved(result.id)
    else onOpenRecent(result.id)
  }

  const badge = (level: string) => RISK_BADGE[level] ?? RISK_BADGE.moderate

  return (
    <header className="w-full bg-carbon border-b border-border-default">
      <div className="flex items-center gap-4 px-5 h-[52px]">

        {/* Logo mark */}
        <div className="shrink-0">
          <svg width="28" height="28" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13.8574 19.5713C13.8574 23.9896 17.4391 27.5713 21.8574 27.5713H24.1426C24.1426 29.4649 22.6075 31 20.7139 31H15C10.5817 31 7 27.4183 7 23V17.2861C7 13.4989 10.0702 10.4287 13.8574 10.4287V19.5713ZM23 7C27.4183 7 31 10.5817 31 15V20.7139C31 24.5011 27.9298 27.5713 24.1426 27.5713V18.4287C24.1426 14.0104 20.5609 10.4287 16.1426 10.4287H13.8574C13.8574 8.53509 15.3925 7 17.2861 7H23Z"
              fill="#E8E6E3"
            />
          </svg>
        </div>

        {/* Search bar + dropdown */}
        <div ref={containerRef} className="relative w-[320px]">
          <div className="flex items-center gap-2.5 h-8 px-3 rounded-lg bg-graphite border border-border-default">
            <Search size={14} className="text-dust shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search simulations by name"
              className="flex-1 bg-transparent text-sm text-bone placeholder:text-dust outline-none"
            />
          </div>

          {/* Results panel */}
          {q && (
            <div className="absolute top-full mt-1 left-0 w-full bg-graphite border border-border-default rounded-xl shadow-xl z-50 overflow-hidden">
              {results.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-dust">
                  No simulations match your search.
                </div>
              ) : (
                results.map((r, i) => (
                  <button
                    key={`${r.kind}-${r.id}`}
                    onClick={() => handleOpen(r)}
                    className={[
                      'w-full flex items-center justify-between px-4 py-3 text-left',
                      'hover:bg-ash/60 transition-colors',
                      i < results.length - 1 ? 'border-b border-border-default' : '',
                    ].join(' ')}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 mr-3">
                      <span className="text-[13px] text-bone truncate">{r.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-dust">
                          {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                        </span>
                        <span className="text-[11px] text-dust/40">·</span>
                        <span className="text-[11px] text-dust">{relativeTime(r.date)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide shrink-0 ${badge(r.riskLevel).cls}`}>
                      {badge(r.riskLevel).label}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right icons */}
        <div className="ml-auto flex items-center gap-1">

          {/* Notification bell */}
          <div ref={bellRef} className="relative flex items-center">
            <button
              onClick={() => setBellOpen(o => !o)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-dust hover:text-bone hover:bg-ash/60 transition-colors"
            >
              <Bell size={16} />
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-[220px] bg-graphite border border-border-default rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border-default">
                  <span className="text-[12px] font-semibold tracking-[0.07em] text-dust uppercase">
                    Notifications
                  </span>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[13px] text-dust/60">No new notifications.</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-dust hover:text-bone hover:bg-ash/60 transition-colors"
          >
            <CircleUser size={16} />
          </button>
        </div>

      </div>

      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
    </header>
  )
}
