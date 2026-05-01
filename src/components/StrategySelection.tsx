import { useState } from 'react'
import { Info } from 'lucide-react'
import { useSimulationStore, type Strategy } from '../store/simulationStore'

const OPTIONS: {
  id: Strategy
  name: string
  description: string
  info: string
}[] = [
  {
    id: 'hold_asset',
    name: 'Hold Asset',
    description: 'Direct exposure to asset price movement',
    info: 'High volatility exposure, no yield offset',
  },
  {
    id: 'stake_lend',
    name: 'Stake / Lend',
    description: 'Yield generation with protocol exposure',
    info: 'Moderate drawdown risk from asset volatility',
  },
  {
    id: 'provide_liquidity',
    name: 'Provide Liquidity',
    description: 'Fee generation with impermanent loss exposure',
    info: 'High sensitivity to price divergence',
  },
]

export default function StrategySelection() {
  const { config, setConfig, state } = useSimulationStore()
  const active   = config?.strategy ?? null
  const isLocked = state !== 'INIT' && state !== 'CONFIG'

  const [lpFeeApr, setLpFeeApr] = useState('')
  const [assetA, setAssetA]     = useState('')
  const [assetB, setAssetB]     = useState('')
  const [stakeApy, setStakeApy] = useState('')

  const select = (id: Strategy) => {
    if (isLocked) return
    setConfig({ strategy: id })
  }

  const handleStakeApyChange = (v: string) => {
    setStakeApy(v)
    const n = parseFloat(v)
    setConfig({ stakeApy: isNaN(n) ? null : n })
  }

  const handleLpFeeAprChange = (v: string) => {
    setLpFeeApr(v)
    const n = parseFloat(v)
    setConfig({ lpFeeApr: isNaN(n) ? null : n })
  }

  const handleAssetAChange = (v: string) => {
    setAssetA(v)
    setConfig({ assetA: v })
  }

  const handleAssetBChange = (v: string) => {
    setAssetB(v)
    setConfig({ assetB: v })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm text-bone">Select Strategy</h3>

      {/* Strategy cards */}
      <div className="flex flex-col gap-2">
        {OPTIONS.map(({ id, name, description, info }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => select(id)}
              disabled={isLocked}
              className={[
                'group w-full text-left border rounded-lg overflow-hidden transition-colors',
                isLocked ? 'opacity-60 cursor-not-allowed' : '',
                isActive ? 'border-oxide' : 'border-border-default hover:border-dust',
              ].join(' ')}
            >
              {/* Name + description row */}
              <div className={[
                'flex items-start justify-between gap-3 px-4 py-3 transition-colors',
                isActive ? 'bg-ash' : 'bg-ash group-hover:bg-graphite',
              ].join(' ')}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-bone font-medium">{name}</span>
                  <span className="text-xs text-dust">{description}</span>
                </div>
                {/* Radio */}
                <div className={[
                  'mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors',
                  isActive ? 'border-oxide' : 'border-border-default',
                ].join(' ')}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-oxide" />}
                </div>
              </div>

              {/* Info bar */}
              <div className={[
                'flex items-center gap-2 px-4 py-2 border-t border-border-default transition-colors',
                isActive ? 'bg-carbon' : 'bg-carbon group-hover:bg-graphite',
              ].join(' ')}>
                <Info size={12} className="text-dust shrink-0" />
                <span className="text-xs text-dust">{info}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Stake extra fields */}
      {active === 'stake_lend' && (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <ExtraRow label="Stake APY">
            <PercentInput value={stakeApy} onChange={handleStakeApyChange} placeholder="0.00" />
          </ExtraRow>
        </div>
      )}

      {/* LP extra fields */}
      {active === 'provide_liquidity' && (
        <div className="border border-border-default rounded-lg overflow-hidden divide-y divide-border-default">
          <ExtraRow label="LP Fee APR">
            <PercentInput value={lpFeeApr} onChange={handleLpFeeAprChange} placeholder="0.00" />
          </ExtraRow>
          <ExtraRow label="Asset A">
            <SymbolInput value={assetA} onChange={handleAssetAChange} placeholder="ETH" />
          </ExtraRow>
          <ExtraRow label="Asset B">
            <SymbolInput value={assetB} onChange={handleAssetBChange} placeholder="USDC" />
          </ExtraRow>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ExtraRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-ash">
      <span className="text-xs text-dust">{label}</span>
      {children}
    </div>
  )
}

function PercentInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-1 bg-carbon border border-border-default rounded-md px-2.5 py-1 focus-within:border-dust transition-colors">
      <input
        type="number"
        min={0}
        max={9999}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-16 bg-transparent text-xs text-bone placeholder:text-dust text-right outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-xs text-dust select-none">%</span>
    </div>
  )
}

function SymbolInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="text"
      maxLength={10}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value.toUpperCase())}
      className="w-24 bg-carbon border border-border-default rounded-md px-2.5 py-1 text-xs text-bone placeholder:text-dust outline-none focus:border-dust transition-colors"
    />
  )
}
