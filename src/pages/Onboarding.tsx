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
    <div className="min-h-screen bg-dirty p-4">
      <div className="mx-auto max-w-md space-y-5">
        <div className="border-3 border-jet bg-jeepney text-dirty p-5 shadow-hard">
          <h1 className="font-display text-4xl">PUMILI NG STYLE</h1>
          <p className="mt-2 text-sm font-medium">Pwede mong palitan anytime sa Ako.</p>
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
            <p className="font-display text-2xl">{opt.title}</p>
            <p className="text-sm text-asphalt mt-1">{opt.description}</p>
          </button>
        ))}
        <button
          type="button"
          disabled={!selected || busy}
          onClick={handleContinue}
          className="g-btn-primary w-full text-xl disabled:opacity-40"
        >
          G? TARA.
        </button>
      </div>
    </div>
  )
}
