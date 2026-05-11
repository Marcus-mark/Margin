import { useEffect } from 'react'
import { X, CircleUser, LogOut, Sparkles, BarChart2 } from 'lucide-react'
import { usePreferencesStore, type ExpertiseMode } from '../store/preferencesStore'

interface ProfilePanelProps {
  onClose: () => void
}

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { expertiseMode, setExpertiseMode, explainCount } = usePreferencesStore()

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[280px] z-50 flex flex-col bg-graphite border-l border-border-default shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 h-[52px] border-b border-border-default shrink-0">
          <div className="flex items-center gap-2.5">
            <CircleUser size={16} className="text-dust" />
            <span className="text-[13px] font-medium text-bone">Profile</span>
          </div>
          <button
            onClick={onClose}
            className="text-dust hover:text-bone transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* User identity */}
          <div className="px-5 py-5 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-ash border border-border-default flex items-center justify-center shrink-0">
                <CircleUser size={18} className="text-dust" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-bone">User</span>
                <span className="text-[11px] text-dust">MARGIN account</span>
              </div>
            </div>
          </div>

          {/* API Usage */}
          <Section icon={<BarChart2 size={13} />} title="API Usage">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-dust leading-snug">
                AI explanations generated
              </span>
              <span className="text-[20px] font-semibold text-bone tabular-nums">
                {explainCount}
              </span>
            </div>
            <p className="text-[11px] text-dust/60 mt-1 leading-relaxed">
              Each "Explain Results" request counts as one use.
            </p>
          </Section>

          {/* Preferences */}
          <Section icon={<Sparkles size={13} />} title="Preferences">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-dust">Default Expertise Mode</span>
              <div className="flex items-center rounded-lg bg-ash border border-border-default p-0.5 gap-0.5 w-fit">
                {(['novice', 'advanced'] as ExpertiseMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setExpertiseMode(m)}
                    className={[
                      'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors capitalize',
                      expertiseMode === m
                        ? 'bg-graphite text-bone shadow-sm border border-border-default'
                        : 'text-dust hover:text-bone',
                    ].join(' ')}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-dust/60 leading-relaxed">
                Sets the starting mode for AI explanations on new simulations.
              </p>
            </div>
          </Section>

        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-border-default shrink-0">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-dust border border-border-default hover:text-bone hover:border-dust transition-colors">
            <LogOut size={13} />
            Sign Out
          </button>
        </div>

      </div>
    </>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon:     React.ReactNode
  title:    string
  children: React.ReactNode
}) {
  return (
    <div className="px-5 py-4 border-b border-border-default flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-dust">{icon}</span>
        <span className="text-[11px] font-semibold tracking-[0.07em] text-dust uppercase">{title}</span>
      </div>
      {children}
    </div>
  )
}
