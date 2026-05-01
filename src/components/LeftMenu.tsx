import { Home, Plus } from 'lucide-react'

export default function LeftMenu() {
  return (
    <aside className="w-16 bg-carbon border-r border-border-default flex flex-col items-center pt-2 gap-1 shrink-0 min-h-full">

      {/* Home — active state */}
      <button className="flex flex-col items-center gap-1.5 py-3 w-[52px] bg-ash rounded-xl">
        <Home size={20} className="text-oxide" strokeWidth={1.75} />
        <span className="text-[10px] font-medium text-oxide leading-none">Home</span>
      </button>

      {/* New Simulation */}
      <button className="flex flex-col items-center gap-1.5 py-3 w-[52px]">
        <Plus size={16} className="text-dust" strokeWidth={1.75} />
        <span className="text-[10px] text-dust leading-none">New</span>
      </button>

    </aside>
  )
}
