import { useState, useRef } from 'react'
import Header from './components/Header'
import SubHeader, { type Tab } from './components/TabBar'
import LeftMenu from './components/LeftMenu'
import HomeScreen from './components/HomeScreen'
import SimulationWorkspace from './components/SimulationWorkspace'
import CompareWorkspace from './components/CompareWorkspace'
import { createSimulationStore } from './store/simulationStore'
import type { SimulationStoreApi } from './store/simulationStore'
import { SimulationStoreContext } from './store/useSimulationStore'
import { useCompareStore } from './store/compareStore'
import { useScenarioCompareStore } from './store/scenarioCompareStore'
import { useSavesStore, readSave, readRecent } from './store/savesStore'
import { useComparisonSavesStore, readComparisonSave } from './store/compareSavesStore'

type View = 'home' | 'workspace'

function App() {
  const [tabs, setTabs]         = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView]         = useState<View>('home')

  // Per-tab store instances — each simulation tab owns one store
  const storeRegistry = useRef(new Map<string, SimulationStoreApi>())

  const getStore = (id: string | null) =>
    id ? (storeRegistry.current.get(id) ?? null) : null

  // ── Tab management ──────────────────────────────────────────────────────────

  const newSimulation = () => {
    const id    = crypto.randomUUID()
    const store = createSimulationStore()
    storeRegistry.current.set(id, store)
    setTabs(prev => [...prev, { type: 'simulation', id, name: 'Untitled Simulation' }])
    setActiveId(id)
    setView('workspace')
  }

  const closeTab = (id: string) => {
    storeRegistry.current.delete(id)
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

  // ── Open saved / recent ─────────────────────────────────────────────────────

  const openSavedSimulation = (simulationGroupId: string) => {
    const entry = useSavesStore.getState().entries.find(
      e => e.simulationGroupId === simulationGroupId
    )
    if (!entry || entry.versions.length === 0) return

    const latest = entry.versions[0]
    const save   = readSave(latest.saveId)
    if (!save) return

    const id    = crypto.randomUUID()
    const store = createSimulationStore()
    store.setState({
      config:            save.config,
      results:           save.results,
      scenarioModifiers: save.scenarioModifiers,
      saveId:            save.id,
      simulationGroupId: save.simulationGroupId,
      state:             'SAVED',
      isStale:           false,
      error:             null,
      version:           latest.version + 1,
      aiExplanation:     save.aiExplanation ?? null,
    })
    storeRegistry.current.set(id, store)
    setTabs(prev => [...prev, { type: 'simulation', id, name: entry.name }])
    setActiveId(id)
    setView('workspace')
  }

  const openRecentSimulation = (runId: string) => {
    const snapshot = readRecent(runId)
    if (!snapshot) return

    const id    = crypto.randomUUID()
    const store = createSimulationStore()
    store.setState({
      config:            snapshot.config,
      results:           snapshot.results,
      scenarioModifiers: snapshot.scenarioModifiers,
      saveId:            null,
      simulationGroupId: null,
      state:             'COMPUTED',
      isStale:           false,
      error:             null,
      version:           1,
      aiExplanation:     snapshot.aiExplanation ?? null,
    })
    storeRegistry.current.set(id, store)
    setTabs(prev => [...prev, {
      type: 'simulation',
      id,
      name: snapshot.name || 'Untitled Simulation',
    }])
    setActiveId(id)
    setView('workspace')
  }

  // ── Open saved comparison ───────────────────────────────────────────────────

  const openSavedComparison = (comparisonGroupId: string) => {
    const entry = useComparisonSavesStore.getState().entries.find(
      e => e.comparisonGroupId === comparisonGroupId
    )
    if (!entry || entry.versions.length === 0) return

    const latest = entry.versions[0]
    const save   = readComparisonSave(latest.saveId)
    if (!save) return

    if (save.comparisonType === 'strategy' && save.strategyConfig && save.strategyResults) {
      useCompareStore.getState().loadVersion(save.strategyConfig, save.strategyResults, save.id)
    } else if (save.comparisonType === 'scenario' && save.scenarioConfig && save.scenarioResults) {
      useScenarioCompareStore.getState().loadVersion(save.scenarioConfig, save.scenarioResults, save.id)
    } else {
      return
    }

    const id = crypto.randomUUID()
    setTabs(prev => {
      const without = prev.filter(t => t.type !== 'comparison')
      return [...without, {
        type:           'comparison',
        id,
        name:           entry.name,
        parentSimId:    '',
        compareType:    save.comparisonType,
      }]
    })
    setActiveId(id)
    setView('workspace')
  }

  // ── Compare ─────────────────────────────────────────────────────────────────

  const openComparison = () => {
    const store = getStore(activeId)
    if (!store) return
    const sim = store.getState()
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

    const id   = crypto.randomUUID()
    const name = (sim.config.name?.trim() || 'Simulation') + ' Comparison'

    setTabs(prev => {
      const without = prev.filter(t => t.type !== 'comparison')
      return [...without, { type: 'comparison', id, name, parentSimId: activeId! }]
    })
    setActiveId(id)
    setView('workspace')
  }

  // ── Tab name sync (callback from SimulationWorkspace) ───────────────────────

  const handleNameChange = (name: string) => {
    setTabs(prev => prev.map(t =>
      t.id === activeId && t.type === 'simulation' ? { ...t, name } : t
    ))
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const inWorkspace   = view === 'workspace'
  const activeTab     = tabs.find(t => t.id === activeId)
  const isComparison  = activeTab?.type === 'comparison'
  const activeStore   = (!isComparison && activeId) ? getStore(activeId) : null
  const compareType   = (activeTab?.type === 'comparison' && activeTab.compareType) ? activeTab.compareType : undefined

  return (
    <>
      <Header onOpenSaved={openSavedSimulation} onOpenRecent={openRecentSimulation} />

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
            ? <CompareWorkspace key={activeId} initialMode={compareType} />
            : activeStore
              ? (
                  <SimulationStoreContext.Provider value={activeStore}>
                    <SimulationWorkspace
                      onCompare={openComparison}
                      onNameChange={handleNameChange}
                    />
                  </SimulationStoreContext.Provider>
                )
              : null
          : <HomeScreen
              onOpenSimulation={openSavedSimulation}
              onOpenRecent={openRecentSimulation}
              onOpenComparison={openSavedComparison}
              onNew={newSimulation}
            />
        }
      </div>
    </>
  )
}

export default App
