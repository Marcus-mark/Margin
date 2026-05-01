import { useState } from 'react'
import Header from './components/Header'
import SubHeader from './components/TabBar'
import LeftMenu from './components/LeftMenu'
import HomeScreen from './components/HomeScreen'
import SimulationWorkspace from './components/SimulationWorkspace'

type Simulation = { id: string; name: string }
type View = 'home' | 'simulation'

function App() {
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [view, setView]               = useState<View>('home')

  const newSimulation = () => {
    const id = crypto.randomUUID()
    setSimulations(s => [...s, { id, name: 'Untitled Simulation' }])
    setActiveId(id)
    setView('simulation')
  }

  const closeSimulation = (id: string) => {
    setSimulations(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (remaining.length === 0) {
        setActiveId(null)
        setView('home')
      } else if (activeId === id) {
        setActiveId(remaining[remaining.length - 1].id)
        setView('simulation')
      }
      return remaining
    })
  }

  const goHome = () => setView('home')

  const switchTab = (id: string) => {
    setActiveId(id)
    setView('simulation')
  }

  const inSim = view === 'simulation'

  return (
    <>
      <Header />

      {simulations.length > 0 && (
        <SubHeader
          simulations={simulations}
          activeId={inSim ? activeId : null}
          showNav={inSim}
          onTabClick={switchTab}
          onTabClose={closeSimulation}
          onHome={goHome}
          onNew={newSimulation}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!inSim && <LeftMenu onNew={newSimulation} />}
        {inSim ? <SimulationWorkspace /> : <HomeScreen />}
      </div>
    </>
  )
}

export default App
