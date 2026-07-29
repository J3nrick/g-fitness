import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

export interface SetRowData {
  id: string
  weight: number
  reps: number
  is_completed: boolean
}

interface SetRowProps {
  index: number
  set: SetRowData
  isPR?: boolean
  lastLabel?: string
  energetic?: boolean
  onChange: (id: string, patch: Partial<SetRowData>) => void
  onToggleComplete: (id: string) => void
}

export function SetRow({
  index,
  set,
  isPR = false,
  lastLabel,
  energetic = false,
  onChange,
  onToggleComplete,
}: SetRowProps) {
  const [pop, setPop] = useState(false)

  useEffect(() => {
    if (!set.is_completed) return
    setPop(true)
    const t = window.setTimeout(() => setPop(false), 220)
    return () => window.clearTimeout(t)
  }, [set.is_completed])

  const focusBorder = energetic ? 'focus:border-energy' : 'focus:border-accent'

  return (
    <div
      className={`flex items-center gap-2 rounded-xl p-2 border transition-all duration-150 ${
        set.is_completed
          ? 'bg-success/10 border-success/30'
          : 'border-transparent'
      } ${isPR && set.is_completed ? 'shadow-[0_0_20px_rgba(0,242,254,0.2)]' : ''} ${
        pop ? 'animate-g-pop' : ''
      }`}
    >
      <span className="w-6 text-sm text-secondaryText tabular-nums">{index + 1}</span>

      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          value={set.weight || ''}
          onChange={(e) => onChange(set.id, { weight: Number(e.target.value) || 0 })}
          className={`w-full rounded-xl bg-subcanvas border border-white/5 ${focusBorder} px-3 py-2.5 g-value text-sm outline-none transition-all placeholder:text-muted placeholder:font-sans placeholder:font-normal`}
          placeholder={lastLabel ? `Last: ${lastLabel}` : 'kg'}
          aria-label="Weight kg"
        />
        {isPR && (
          <span className="absolute -top-2 right-2 bg-energy/20 text-energy border border-energy/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            PR
          </span>
        )}
      </div>

      <input
        type="number"
        inputMode="numeric"
        value={set.reps || ''}
        onChange={(e) => onChange(set.id, { reps: Number(e.target.value) || 0 })}
        className={`flex-1 rounded-xl bg-subcanvas border border-white/5 ${focusBorder} px-3 py-2.5 g-value text-sm outline-none transition-all placeholder:text-muted placeholder:font-sans placeholder:font-normal`}
        placeholder="reps"
        aria-label="Reps"
      />

      <button
        type="button"
        onClick={() => onToggleComplete(set.id)}
        className={`g-btn flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-150 ${
          set.is_completed
            ? 'bg-success border-success text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]'
            : energetic
              ? 'border-energy/40 text-energy hover:bg-energy/10'
              : 'border-accent/40 text-accent hover:bg-accent/10'
        }`}
        aria-label="Mark set complete"
      >
        <Check size={18} strokeWidth={3} />
      </button>
    </div>
  )
}
