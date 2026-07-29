import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { CoachingStyle } from '../types/database.types'

const STYLES: { id: CoachingStyle; label: string }[] = [
  { id: 'chill', label: 'Chill' },
  { id: 'tropa', label: 'Tropa' },
  { id: 'real_talk', label: 'Real Talk' },
]

export function Settings() {
  const { profile, updateProfile, signOut } = useAuth()
  const { showToast } = useToast()
  const [calories, setCalories] = useState(String(profile?.daily_calories ?? 2200))
  const [protein, setProtein] = useState(String(profile?.daily_protein ?? 170))
  const [targetWeight, setTargetWeight] = useState(String(profile?.target_weight ?? 70))
  const [style, setStyle] = useState<CoachingStyle>(profile?.coaching_style ?? 'tropa')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setCalories(String(profile.daily_calories))
    setProtein(String(profile.daily_protein))
    setTargetWeight(String(profile.target_weight))
    if (profile.coaching_style) setStyle(profile.coaching_style)
  }, [profile])

  async function saveTargets(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const { error } = await updateProfile({
      daily_calories: Number(calories),
      daily_protein: Number(protein),
      target_weight: Number(targetWeight),
    })
    setSaving(false)
    if (error) {
      setMessage(error)
      return
    }
    setMessage('Targets updated.')
  }

  async function switchStyle(next: CoachingStyle) {
    setStyle(next)
    const { error } = await updateProfile({ coaching_style: next })
    if (error) {
      setMessage(error)
      return
    }
    showToast('style_changed')
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-primaryText">Settings</h1>
        <p className="mt-1 text-secondaryText">Targets, persona, account.</p>
        {import.meta.env.VITE_AUTH_BYPASS === 'true' && (
          <p className="mt-2 text-xs text-warning">Demo mode on — auth bypassed. Data saves locally.</p>
        )}
      </header>

      <form onSubmit={saveTargets} className="rounded-2xl bg-card p-5 space-y-4">
        <h2 className="font-semibold text-primaryText">Daily Targets</h2>
        <div>
          <label className="block text-sm text-secondaryText mb-1.5">Calories</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full rounded-xl bg-background border border-white/10 px-4 py-3 text-primaryText outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-secondaryText mb-1.5">Protein (g)</label>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="w-full rounded-xl bg-background border border-white/10 px-4 py-3 text-primaryText outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-secondaryText mb-1.5">Target Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="w-full rounded-xl bg-background border border-white/10 px-4 py-3 text-primaryText outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-white py-3 font-semibold text-background disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Targets'}
        </button>
        {message && <p className="text-sm text-secondaryText">{message}</p>}
      </form>

      <div className="rounded-2xl bg-card p-5 space-y-3">
        <h2 className="font-semibold text-primaryText">Coaching Style</h2>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => switchStyle(s.id)}
              className={`rounded-xl py-3 text-sm font-medium transition-colors ${
                style === s.id
                  ? 'bg-accent text-white'
                  : 'bg-background text-secondaryText'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        className="w-full rounded-2xl border border-danger/40 text-danger py-4 font-semibold"
      >
        Logout
      </button>
    </div>
  )
}
