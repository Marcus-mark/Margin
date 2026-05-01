import { useState } from 'react'
import Header from './components/Header'
import TabBar from './components/TabBar'
import LeftMenu from './components/LeftMenu'
import HomeScreen from './components/HomeScreen'
import SimulationWorkspace from './components/SimulationWorkspace'

function App() {
  const [view, setView] = useState<'home' | 'simulation'>('home')

  return (
    <>
      <Header />
      <TabBar onViewChange={setView} />
      <div className="flex flex-1 overflow-hidden">
        <LeftMenu />
        {view === 'home' ? <HomeScreen /> : <SimulationWorkspace />}
      </div>
    </>
  )
}

export default App
