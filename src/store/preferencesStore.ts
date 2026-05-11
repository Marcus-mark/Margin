import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ExpertiseMode = 'novice' | 'advanced'

interface PreferencesState {
  expertiseMode:         ExpertiseMode
  explainCount:          number
  setExpertiseMode:      (mode: ExpertiseMode) => void
  incrementExplainCount: () => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      expertiseMode: 'novice',
      explainCount:  0,

      setExpertiseMode: (mode) => set({ expertiseMode: mode }),

      incrementExplainCount: () =>
        set(s => ({ explainCount: s.explainCount + 1 })),
    }),
    { name: 'margin_preferences' }
  )
)
