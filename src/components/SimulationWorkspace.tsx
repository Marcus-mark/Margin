export default function SimulationWorkspace() {
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Left panel — inputs */}
      <div className="w-[420px] shrink-0 bg-graphite border-r border-border-default overflow-y-auto" />

      {/* Right panel — outputs */}
      <div className="flex-1 bg-carbon overflow-y-auto" />

    </div>
  )
}
