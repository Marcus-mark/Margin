import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompareConfig, CompareResult } from './compareStore'
import type { ScenarioCompareConfig, ScenarioCompareResult } from './scenarioCompareStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ComparisonVersionRecord {
  saveId:  string
  version: number
  savedAt: string
  name:    string
}

export interface ComparisonEntry {
  comparisonGroupId: string
  name:              string
  savedAt:           string
  comparisonType:    'strategy' | 'scenario'
  riskLevels:        string[]   // per-column risk levels for display
  versions:          ComparisonVersionRecord[]  // newest first
}

export interface SavedComparison {
  id:                string
  comparisonGroupId: string
  version:           number
  name:              string
  savedAt:           string
  comparisonType:    'strategy' | 'scenario'
  // one of these pairs is populated depending on type
  strategyConfig?:   CompareConfig
  strategyResults?:  CompareResult
  scenarioConfig?:   ScenarioCompareConfig
  scenarioResults?:  ScenarioCompareResult
}

// ── localStorage helpers ──────────────────────────────────────────────────────

export function writeComparisonSave(obj: SavedComparison): void {
  localStorage.setItem(`margin_comparison_${obj.id}`, JSON.stringify(obj))
}

export function readComparisonSave(saveId: string): SavedComparison | null {
  const raw = localStorage.getItem(`margin_comparison_${saveId}`)
  return raw ? (JSON.parse(raw) as SavedComparison) : null
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ComparisonSavesState {
  entries: ComparisonEntry[]
  upsert: (
    comparisonGroupId: string,
    meta:    Omit<ComparisonEntry, 'versions'>,
    version: ComparisonVersionRecord,
  ) => void
  removeEntry: (comparisonGroupId: string) => void
}

export const useComparisonSavesStore = create<ComparisonSavesState>()(
  persist(
    (set) => ({
      entries: [],

      upsert: (comparisonGroupId, meta, versionRecord) =>
        set(s => {
          const idx = s.entries.findIndex(e => e.comparisonGroupId === comparisonGroupId)
          if (idx >= 0) {
            const updated = [...s.entries]
            updated[idx] = { ...meta, versions: [versionRecord, ...updated[idx].versions] }
            return { entries: updated }
          }
          return { entries: [{ ...meta, versions: [versionRecord] }, ...s.entries] }
        }),

      removeEntry: (comparisonGroupId) =>
        set(s => ({
          entries: s.entries.filter(e => e.comparisonGroupId !== comparisonGroupId),
        })),
    }),
    { name: 'margin_comparison_saves' }
  )
)
