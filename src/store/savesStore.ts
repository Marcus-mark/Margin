import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Strategy } from '../types'
import type { SimulationConfig, SimulationResults, AIExplanationState } from './simulationStore'
import type { ScenarioModifiers } from '../data/scenarioPresets'

// ── Saved simulation types ────────────────────────────────────────────────────

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
  marketScenario?:   string
  versions:          VersionRecord[]  // newest first
}

// Full snapshot per saveId
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
  aiExplanation?:    AIExplanationState | null
}

// ── Recent run types ──────────────────────────────────────────────────────────

// Lightweight index entry stored in Zustand persist
export interface RecentRecord {
  runId:             string
  name:              string
  runnedAt:          string
  riskLevel:         string
  strategy:          Strategy
  capitalAllocation: number
  marketScenario?:   string
}

// Full snapshot stored in localStorage per runId
export interface RecentSnapshot {
  runId:             string
  name:              string
  runnedAt:          string
  config:            SimulationConfig
  scenarioModifiers: ScenarioModifiers | null
  results:           SimulationResults
  aiExplanation?:    AIExplanationState | null
}

const RECENTS_CAP = 30

// ── localStorage helpers ──────────────────────────────────────────────────────

export function writeSave(obj: SavedSimulation): void {
  localStorage.setItem(`margin_save_${obj.id}`, JSON.stringify(obj))
}

export function readSave(saveId: string): SavedSimulation | null {
  const raw = localStorage.getItem(`margin_save_${saveId}`)
  return raw ? (JSON.parse(raw) as SavedSimulation) : null
}

export function writeRecent(snapshot: RecentSnapshot): void {
  localStorage.setItem(`margin_recent_${snapshot.runId}`, JSON.stringify(snapshot))
}

export function readRecent(runId: string): RecentSnapshot | null {
  const raw = localStorage.getItem(`margin_recent_${runId}`)
  return raw ? (JSON.parse(raw) as RecentSnapshot) : null
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface SavesState {
  // Explicitly saved simulations
  entries: SaveEntry[]
  upsert: (
    simulationGroupId: string,
    meta:    Omit<SaveEntry, 'versions'>,
    version: VersionRecord,
  ) => void
  updateName:  (simulationGroupId: string, name: string) => void
  removeEntry: (simulationGroupId: string) => void

  // Auto-recorded recent runs
  recents:    RecentRecord[]
  addRecent:  (record: RecentRecord) => void
  removeRecent: (runId: string) => void

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

      removeEntry: (simulationGroupId) =>
        set(s => ({
          entries: s.entries.filter(e => e.simulationGroupId !== simulationGroupId),
        })),

      recents: [],

      addRecent: (record) =>
        set(s => ({
          recents: [record, ...s.recents].slice(0, RECENTS_CAP),
        })),

      removeRecent: (runId) =>
        set(s => ({
          recents: s.recents.filter(r => r.runId !== runId),
        })),

      clear: () => set({ entries: [], recents: [] }),
    }),
    { name: 'margin_saves_index' }
  )
)
