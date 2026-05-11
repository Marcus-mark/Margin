import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { SimulationState, SimulationStoreApi } from './simulationStore'

export const SimulationStoreContext = createContext<SimulationStoreApi | null>(null)

// Overload: with selector
export function useSimulationStore<T>(selector: (s: SimulationState) => T): T
// Overload: no selector — returns full state
export function useSimulationStore(): SimulationState
// Implementation
export function useSimulationStore<T>(selector?: (s: SimulationState) => T): T | SimulationState {
  const store = useContext(SimulationStoreContext)
  if (!store) throw new Error('useSimulationStore must be used inside SimulationStoreContext.Provider')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useStore(store, selector ?? (s => s as unknown as T)) as T | SimulationState
}
