import { useState, useRef, useEffect } from 'react'
import Header from './components/Header'
import SubHeader, { type Tab } from './components/TabBar'
import LeftMenu from './components/LeftMenu'
import HomeScreen from './components/HomeScreen'
import SimulationWorkspace from './components/SimulationWorkspace'
import CompareWorkspace from './components/CompareWorkspace'
import { useSimulationStore } from './store/simulationStore'
import { useCompareStore } from './store/compareStore'
import { useScenarioCompareStore } from './store/scenarioCompareStore'
import { useSavesStore, readSave } from './store/savesStore'

type View = 'home' | 'workspace'

function App() {
  const [tabs, setTabs]       = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView]         = useState<View>('home')

  const newSimulation = () => {
    useSimulationStore.getState().reset()
    const id = crypto.randomUUID()
    setTabs(prev => [...prev, { type: 'simulation', id, name: 'Untitled Simulation' }])
    setActiveId(id)
    setView('workspace')
  }

  const openComparison = () => {
    const sim = useSimulationStore.getState()
    if (!sim.config || !sim.results) return

    useCompareStore.getState().initFromSimulation({
      name:              sim.config.name,
      capitalAllocation: sim.config.capitalAllocation,
      strategy:          sim.config.strategy!,
      marketScenario:    sim.config.marketScenario!,
      upperBand:         sim.config.upperBand,
      lowerBand:         sim.config.lowerBand,
      volatility:        sim.config.volatility,
      correlation:       sim.config.correlation,
      timePeriodDays:    sim.config.timePeriodDays,
      scenarioModifiers: sim.scenarioModifiers ?? {
        stressValue: '1.0x', tailRisk: '1.0x', rebalanceSensitivity: 'Medium',
      },
    })

    useScenarioCompareStore.getState().initFromSimulation({
      name:              sim.config.name,
      capitalAllocation: sim.config.capitalAllocation,
      strategy:          sim.config.strategy!,
      timePeriodDays:    sim.config.timePeriodDays,
    })

    const id = crypto.randomUUID()
    const name = (sim.config.name?.trim() || 'Simulation') + ' Comparison'

    setTabs(prev => {
      // Replace any existing comparison tab (one at a time)
      const without = prev.filter(t => t.type !== 'comparison')
      return [...without, { type: 'comparison', id, name, parentSimId: activeId! }]
    })
    setActiveId(id)
    setView('workspace')
  }

  const closeTab = (id: string) => {
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== id)
      if (remaining.length === 0) {
        setActiveId(null)
        setView('home')
      } else if (activeId === id) {
        setActiveId(remaining[remaining.length - 1].id)
        setView('workspace')
      }
      return remaining
    })
  }

  const switchTab = (id: string) => {
    setActiveId(id)
    setView('workspace')
  }

  const goHome = () => setView('home')

  const openSavedSimulation = (simulationGroupId: string) => {
    const entry = useSavesStore.getState().entries.find(
      e => e.simulationGroupId === simulationGroupId
    )
    if (!entry || entry.versions.length === 0) return

    const latest = entry.versions[0]  // newest first
    const save   = readSave(latest.saveId)
    if (!save) return

    useSimulationStore.setState({
      config:            save.config,
      results:           save.results,
      scenarioModifiers: save.scenarioModifiers,
      saveId:            save.id,
      simulationGroupId: save.simulationGroupId,
      state:             'SAVED',
      isStale:           false,
      error:             null,
      version:           latest.version + 1,
    })

    const id = crypto.randomUUID()
    setTabs(prev => [...prev, { type: 'simulation', id, name: entry.name }])
    setActiveId(id)
    setView('workspace')
  }

  // Sync active simulation tab name with what the user typed in the input panel
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const simName = useSimulationStore(s => s.config?.name ?? '')
  useEffect(() => {
    const id = activeIdRef.current
    if (!id) return
    const display = simName.trim() || 'Untitled Simulation'
    setTabs(prev => prev.map(t =>
      t.id === id && t.type === 'simulation' ? { ...t, name: display } : t
    ))
  }, [simName])

  const inWorkspace  = view === 'workspace'
  const activeTab    = tabs.find(t => t.id === activeId)
  const isComparison = activeTab?.type === 'comparison'

  return (
    <>
      <Header />

      {tabs.length > 0 && (
        <SubHeader
          tabs={tabs}
          activeId={inWorkspace ? activeId : null}
          showNav={inWorkspace}
          onTabClick={switchTab}
          onTabClose={closeTab}
          onHome={goHome}
          onNew={newSimulation}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!inWorkspace && <LeftMenu onNew={newSimulation} />}
        {inWorkspace
          ? isComparison
            ? <CompareWorkspace />
            : <SimulationWorkspace onCompare={openComparison} />
          : <HomeScreen onOpenSimulation={openSavedSimulation} onNew={newSimulation} />
        }
      </div>
    </>
  )
}

export default App
