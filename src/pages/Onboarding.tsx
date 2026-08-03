import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { CoachingStyle } from '../types/database.types'

const OPTIONS: { id: CoachingStyle; title: string; description: string }[] = [
  { id: 'chill', title: 'Chill', description: 'Calm. Focused. Pure discipline.' },
  { id: 'tropa', title: 'Tropa', description: 'Gym bro banter. Minsan mang-aasar.' },
  { id: 'real_talk', title: 'Real Talk', description: 'Direct. Optional unfiltered later via Tropa Mode.' },
]

export function Onboarding() {
  const { updateProfile } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<CoachingStyle | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleContinue() {
    if (!selected) return
    setBusy(true)
    await updateProfile({ coaching_style: selected })
    setBusy(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dirty p-3">
      <div className="mx-auto max-w-md space-y-3">
        <div className="border-2 border-jet bg-jeepney text-dirty p-3 shadow-hard">
          <h1 className="font-display text-lg">PUMILI NG STYLE</h1>
          <p className="mt-1 text-xs font-medium">Pwede mong palitan anytime sa Ako.</p>
        </div>
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`w-full text-left g-card ${
              selected === opt.id ? 'bg-mango' : 'bg-dirty'
            }`}
          >
            <p className="font-display text-lg">{opt.title}</p>
            <p className="text-sm text-asphalt mt-1">{opt.description}</p>
          </button>
        ))}
        <button
          type="button"
          disabled={!selected || busy}
          onClick={handleContinue}
          className="g-btn-primary w-full text-sm disabled:opacity-40"
        >
          G? TARA.
        </button>
      </div>
    </div>
  )
}
