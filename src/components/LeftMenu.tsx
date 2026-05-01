import { Home, Plus } from 'lucide-react'

type LeftMenuProps = {
  onNew: () => void
}

export default function LeftMenu({ onNew }: LeftMenuProps) {
  return (
    <aside className="w-20 bg-carbon border-r border-border-default flex flex-col items-center pt-2 gap-1 shrink-0">

      {/* Home — always active visual while LeftMenu is shown */}
      <button className="flex flex-col items-center gap-1.5 py-3 w-[60px] bg-ash rounded-xl">
        <Home size={20} className="text-oxide" strokeWidth={1.75} />
        <span className="text-[10px] font-medium text-oxide leading-none">Home</span>
      </button>

      {/* New Simulation */}
      <button
        onClick={onNew}
        className="flex flex-col items-center gap-1.5 py-3 w-[60px] rounded-xl hover:bg-ash transition-colors"
      >
        <Plus size={18} className="text-dust" strokeWidth={1.75} />
        <span className="text-[10px] text-dust leading-none">New</span>
      </button>

    </aside>
  )
}
