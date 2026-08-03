import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Equipment } from '../data/exercises'
import {
  applyGeneratedPlan,
  DEFAULT_COACH,
  goalLabel,
  previewPlan,
  toExtProfile,
  type CoachProfile,
  type Experience,
  type FitnessGoal,
  type LocationPref,
} from '../lib/coach'
import { saveCoachProfile, saveExtProfile, saveWeekTemplate } from '../lib/store'
import { useToast } from '../context/ToastContext'

const STEPS = ['You', 'Goal', 'Level', 'Place', 'Gear', 'Schedule', 'Build'] as const

const EQUIPMENT_OPTIONS: { id: Equipment; label: string }[] = [
  { id: 'none', label: 'No Equipment' },
  { id: 'bands', label: 'Resistance Bands' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'bench', label: 'Bench' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'pullup_bar', label: 'Pull-up Bar' },
  { id: 'full_gym', label: 'Full Gym' },
]

export function CompanionSetup() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CoachProfile>({ ...DEFAULT_COACH })

  const preview = useMemo(() => {
    if (step < 6) return null
    return previewPlan(form)
  }, [step, form])

  function patch<K extends keyof CoachProfile>(key: K, value: CoachProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleEquipment(id: Equipment) {
    setForm((prev) => {
      const has = prev.equipment.includes(id)
      if (id === 'full_gym') return { ...prev, equipment: has ? ['none'] : ['full_gym'] }
      const next = has
        ? prev.equipment.filter((e) => e !== id)
        : [...prev.equipment.filter((e) => e !== 'full_gym' && e !== 'none'), id]
      return { ...prev, equipment: next.length ? next : ['none'] }
    })
  }

  function finish() {
    const { plans, week, nutrition } = applyGeneratedPlan(form)
    const complete: CoachProfile = { ...form, onboarding_complete: true, name: form.name.trim() || 'Tropa' }
    saveCoachProfile(complete)
    saveWeekTemplate(week)
    saveExtProfile(toExtProfile(complete, nutrition))
    void plans
    showToast('saved', 'Plan built. Sundan mo lang.')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-dirty p-4">
      <div className="mx-auto max-w-md space-y-4">
        <header className="border-3 border-jet bg-jeepney text-dirty p-3 shadow-hard">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">G! Companion Setup</p>
          <h1 className="font-display text-lg mt-1">WALANG GUESSWORK</h1>
          <p className="mt-2 text-sm">Sundan mo lang. Step {step + 1}/{STEPS.length}</p>
        </header>

        <div className="grid grid-cols-7 gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-2 border-2 border-jet ${i <= step ? 'bg-mango' : 'bg-concrete'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="g-card space-y-3">
            <p className="font-display text-lg">ABOUT YOU</p>
            <input className="g-input" placeholder="Name" value={form.name} onChange={(e) => patch('name', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="g-input" placeholder="Age" value={form.age} onChange={(e) => patch('age', Number(e.target.value) || 0)} />
              <select className="g-input" value={form.sex} onChange={(e) => patch('sex', e.target.value as CoachProfile['sex'])}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input type="number" className="g-input" placeholder="Height cm" value={form.height_cm} onChange={(e) => patch('height_cm', Number(e.target.value) || 0)} />
              <input type="number" className="g-input" placeholder="Weight kg" value={form.weight_kg} onChange={(e) => patch('weight_kg', Number(e.target.value) || 0)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="g-card space-y-2">
            <p className="font-display text-lg">GOAL</p>
            {(
              [
                ['lose_fat', 'Lose Fat'],
                ['gain_muscle', 'Gain Muscle'],
                ['maintain', 'Maintain'],
                ['recomp', 'Body Recomposition'],
              ] as [FitnessGoal, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => patch('goal', id)}
                className={`w-full g-btn border-3 border-jet py-3 text-left px-3 ${
                  form.goal === id ? 'bg-mango shadow-none' : 'bg-dirty shadow-hardSm'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="g-card space-y-2">
            <p className="font-display text-lg">EXPERIENCE</p>
            {(['beginner', 'intermediate', 'advanced'] as Experience[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => patch('experience', id)}
                className={`w-full g-btn border-3 border-jet py-3 capitalize ${
                  form.experience === id ? 'bg-mango shadow-none' : 'bg-dirty shadow-hardSm'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="g-card space-y-2">
            <p className="font-display text-lg">LOCATION</p>
            {(['home', 'gym', 'both'] as LocationPref[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => patch('location', id)}
                className={`w-full g-btn border-3 border-jet py-3 capitalize ${
                  form.location === id ? 'bg-mango shadow-none' : 'bg-dirty shadow-hardSm'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="g-card space-y-2">
            <p className="font-display text-lg">EQUIPMENT</p>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleEquipment(opt.id)}
                  className={`g-btn border-3 border-jet py-3 text-xs ${
                    form.equipment.includes(opt.id) ? 'bg-mango shadow-none' : 'bg-dirty shadow-hardSm'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="g-card space-y-4">
            <p className="font-display text-lg">SCHEDULE</p>
            <p className="g-label">Days / week</p>
            <div className="grid grid-cols-5 gap-2">
              {([2, 3, 4, 5, 6] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => patch('days_per_week', d)}
                  className={`g-btn border-3 border-jet py-3 ${
                    form.days_per_week === d ? 'bg-mango shadow-none' : 'bg-dirty shadow-hardSm'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="g-label">Duration</p>
            <div className="grid grid-cols-3 gap-2">
              {([20, 30, 45, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => patch('duration_mins', d)}
                  className={`g-btn border-3 border-jet py-3 text-xs ${
                    form.duration_mins === d ? 'bg-mango shadow-none' : 'bg-dirty shadow-hardSm'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && preview && (
          <div className="space-y-3">
            <div className="g-card">
              <p className="font-display text-lg">YOUR PLAN</p>
              <p className="text-sm mt-2">
                {goalLabel(form.goal)} · {form.experience} · {form.days_per_week} days · {form.duration_mins} min
              </p>
            </div>
            <div className="g-card !p-0 overflow-hidden">
              {preview.week.map((slot) => (
                <div key={slot.day} className="flex border-b-3 border-jet last:border-b-0">
                  <div className="w-28 bg-concrete border-r-3 border-jet px-3 py-2 font-bold text-sm">
                    {slot.day.slice(0, 3)}
                  </div>
                  <div className={`flex-1 px-3 py-2 font-bold ${slot.isRest ? 'text-asphalt' : 'bg-mango/40'}`}>
                    {slot.isRest ? 'Rest' : slot.focus}
                  </div>
                </div>
              ))}
            </div>
            <div className="g-card grid grid-cols-2 gap-3">
              <div>
                <p className="g-label">Calories</p>
                <p className="font-mono text-lg font-bold">{preview.nutrition.calories}</p>
              </div>
              <div>
                <p className="g-label">Protein</p>
                <p className="font-mono text-lg font-bold">{preview.nutrition.protein}g</p>
              </div>
              <div>
                <p className="g-label">Carbs</p>
                <p className="font-mono text-lg font-bold">{preview.nutrition.carbs}g</p>
              </div>
              <div>
                <p className="g-label">Fat</p>
                <p className="font-mono text-lg font-bold">{preview.nutrition.fat}g</p>
              </div>
            </div>
            <p className="text-xs text-asphalt font-bold uppercase">
              Editable anytime sa Bakal + Ako. Nothing is locked.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="g-btn-ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
          {step < 6 ? (
            <button
              type="button"
              className="g-btn-primary"
              onClick={() => setStep((s) => Math.min(6, s + 1))}
            >
              Next
            </button>
          ) : (
            <button type="button" className="g-btn-primary" onClick={finish}>
              G! BUILD
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
