import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Strategy } from '../types'
import type { SimulationConfig, SimulationResults } from './simulationStore'
import type { ScenarioModifiers } from '../data/scenarioPresets'

// ── Persistence types ─────────────────────────────────────────────────────────

export interface VersionRecord {
  saveId:  string
  version: number
  savedAt: string
  name:    string
}

export interface SaveEntry {
  simulationGroupId: string
  name:              string
  savedAt:           string
  riskLevel:         string
  strategy:          Strategy
  capitalAllocation: number
  grossYieldPct:     number
  netYieldPct:       number
  versions:          VersionRecord[]  // newest first
}

// Full snapshot stored in localStorage per saveId
export interface SavedSimulation {
  id:                string
  simulationGroupId: string
  version:           number
  name:              string
  savedAt:           string
  config:            SimulationConfig
  scenarioModifiers: ScenarioModifiers
  results:           SimulationResults
  riskLevel:         string
  strategy:          Strategy
  capitalAllocation: number
}

// ── localStorage helpers ──────────────────────────────────────────────────────

export function writeSave(obj: SavedSimulation): void {
  localStorage.setItem(`margin_save_${obj.id}`, JSON.stringify(obj))
}

export function readSave(saveId: string): SavedSimulation | null {
  const raw = localStorage.getItem(`margin_save_${saveId}`)
  return raw ? (JSON.parse(raw) as SavedSimulation) : null
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface SavesState {
  entries: SaveEntry[]
  upsert: (
    simulationGroupId: string,
    meta:    Omit<SaveEntry, 'versions'>,
    version: VersionRecord,
  ) => void
  updateName: (simulationGroupId: string, name: string) => void
  clear: () => void
}

export const useSavesStore = create<SavesState>()(
  persist(
    (set) => ({
      entries: [],

      upsert: (simulationGroupId, meta, versionRecord) =>
        set(s => {
          const idx = s.entries.findIndex(e => e.simulationGroupId === simulationGroupId)
          if (idx >= 0) {
            const updated = [...s.entries]
            updated[idx] = {
              ...meta,
              versions: [versionRecord, ...updated[idx].versions],
            }
            return { entries: updated }
          }
          return { entries: [{ ...meta, versions: [versionRecord] }, ...s.entries] }
        }),

      updateName: (simulationGroupId, name) =>
        set(s => ({
          entries: s.entries.map(e =>
            e.simulationGroupId === simulationGroupId ? { ...e, name } : e
          ),
        })),

      clear: () => set({ entries: [] }),
    }),
    { name: 'margin_saves_index' }
  )
)
