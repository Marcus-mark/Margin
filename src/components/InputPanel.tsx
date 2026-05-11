import { useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { useSimulationStore } from '../store/useSimulationStore'
import type { Asset } from '../store/simulationStore'
import AdvancedRiskControl from './AdvancedRiskControl'
import StrategySelection from './StrategySelection'
import ScenarioSetup from './ScenarioSetup'

export default function InputPanel() {
  const { setConfig, config, state } = useSimulationStore()

  const isLocked = state !== 'INIT' && state !== 'CONFIG'

  // Local state for text inputs keeps cursor position stable while typing
  const [name, setName] = useState(config?.name ?? '')
  const [portfolioValue, setPortfolioValue] = useState(
    config?.capitalAllocation ? String(config.capitalAllocation) : ''
  )

  const assets: Asset[] = config?.assets ?? []

  const handleNameChange = (value: string) => {
    setName(value)
    setConfig({ name: value })
  }

  const handlePortfolioChange = (value: string) => {
    setPortfolioValue(value)
    setConfig({ capitalAllocation: parseFloat(value) || 0 })
  }

  const addAsset = () =>
    setConfig({ assets: [...assets, { id: crypto.randomUUID(), symbol: '', allocation: '' }] })

  const removeAsset = (id: string) =>
    setConfig({ assets: assets.filter(a => a.id !== id) })

  const updateAsset = (id: string, field: keyof Omit<Asset, 'id'>, value: string) =>
    setConfig({ assets: assets.map(a => a.id === id ? { ...a, [field]: value } : a) })

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Simulation name */}
      <div className="relative">
        <input
          type="text"
          placeholder="Untitled Simulation"
          value={name}
          disabled={isLocked}
          onChange={e => handleNameChange(e.target.value)}
          className="w-full bg-ash border border-border-default rounded-lg px-4 py-3 pr-10 text-sm text-bone placeholder:text-dust outline-none hover:border-dust focus:border-dust transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-default"
        />
        <Pencil size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-dust pointer-events-none" />
      </div>

      {/* Capital Allocation */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm text-dust">Enter Capital Allocation</h3>

        <div className="border border-border-default rounded-lg overflow-hidden hover:border-dust transition-colors has-[:disabled]:opacity-50 has-[:disabled]:hover:border-border-default">
          <div className="flex items-center gap-4 px-4 py-4 bg-ash">
            <span className="text-xl text-bone select-none">$</span>
            <input
              type="number"
              placeholder="0000.00"
              min={10}
              max={100_000_000}
              value={portfolioValue}
              disabled={isLocked}
              onChange={e => handlePortfolioChange(e.target.value)}
              className="flex-1 bg-transparent text-xl text-bone placeholder:text-dust text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2 bg-carbon border-t border-border-default">
            <span className="text-xs text-dust">Minimum: 10</span>
            <span className="text-xs text-dust">Maximum: 100,000,000</span>
          </div>
        </div>

        {/* Individual asset rows */}
        {assets.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ETH"
                  maxLength={10}
                  value={asset.symbol}
                  disabled={isLocked}
                  onChange={e => updateAsset(asset.id, 'symbol', e.target.value.toUpperCase())}
                  className="w-20 px-3 py-2 bg-ash border border-border-default rounded-lg text-sm text-bone placeholder:text-dust outline-none hover:border-dust focus:border-dust transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-default"
                />
                <div className="flex items-center flex-1 px-3 py-2 bg-ash border border-border-default rounded-lg hover:border-dust focus-within:border-dust transition-colors">
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    max={100}
                    value={asset.allocation}
                    disabled={isLocked}
                    onChange={e => updateAsset(asset.id, 'allocation', e.target.value)}
                    className="flex-1 bg-transparent text-sm text-bone placeholder:text-dust text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-dust ml-1 select-none">%</span>
                </div>
                <button
                  onClick={() => removeAsset(asset.id)}
                  disabled={isLocked}
                  className="text-dust hover:text-bone transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-dust"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add asset */}
        <button
          onClick={addAsset}
          disabled={isLocked}
          className="flex items-center gap-1.5 text-sm text-dust hover:text-bone transition-colors self-start mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-dust"
        >
          <Plus size={14} />
          Add Asset
        </button>
      </section>

      {/* Divider */}
      <div className="h-px bg-border-default -mx-4" />

      <AdvancedRiskControl />

      {/* Divider */}
      <div className="h-px bg-border-default -mx-4" />

      <StrategySelection />

      {/* Divider */}
      <div className="h-px bg-border-default -mx-4" />

      <ScenarioSetup />

    </div>
  )
}
