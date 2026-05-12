import { useCallback } from 'react'
import { useSimulationStore } from '../store/useSimulationStore'
import AIExplainPanel from './AIExplainPanel'
import type { AIExplanationState } from '../store/simulationStore'

export default function ExplainPanel() {
  const { state, results, aiExplanation, setAIExplanation } = useSimulationStore()

  const handleStateChange = useCallback((s: AIExplanationState) => {
    setAIExplanation(s)
  }, [setAIExplanation])

  if ((state !== 'COMPUTED' && state !== 'SAVED') || !results) return null

  return (
    <AIExplainPanel
      results={results}
      initialState={aiExplanation}
      onStateChange={handleStateChange}
    />
  )
}
