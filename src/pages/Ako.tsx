import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  applyGeneratedPlan,
  DEFAULT_COACH,
  goalLabel,
  toExtProfile,
  type CoachProfile,
  type Experience,
  type FitnessGoal,
  type LocationPref,
} from '../lib/coach'
import {
  getCoachProfile,
  getExtProfile,
  saveCoachProfile,
  saveExtProfile,
  saveWeekTemplate,
  type UserProfileExt,
} from '../lib/store'
import {
  getCoachingStyle,
  getIntensity,
  setCoachingStyle,
  setIntensity,
} from '../lib/messages'
import type { CoachingStyle } from '../types/database.types'

export function Ako() {
  const { signOut, bypass } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const existing = getCoachProfile()
  const [coach, setCoach] = useState<CoachProfile>(existing ?? { ...DEFAULT_COACH, name: getExtProfile().nickname })
  const [ext, setExt] = useState<UserProfileExt>(getExtProfile)
  const [coachStyle, setCoachStyle] = useState<CoachingStyle>(getCoachingStyle)
  const [intensity, setIntensityState] = useState<'mild' | 'medium' | 'unfiltered'>(getIntensity)

  function patchCoach<K extends keyof CoachProfile>(key: K, value: CoachProfile[K]) {
    setCoach((prev) => ({ ...prev, [key]: value }))
  }

  function save() {
    const { week, nutrition } = applyGeneratedPlan(coach)
    const complete = { ...coach, onboarding_complete: true }
    saveCoachProfile(complete)
    saveWeekTemplate(week)
    const nextExt = {
      ...toExtProfile(complete, nutrition),
      avatar: ext.avatar,
      tropa_mode: coach.tropa_mode,
    }
    saveExtProfile(nextExt)
    setExt(nextExt)
    showToast('saved', 'Profile + plan updated.')
  }

  return (
    <div className="g-page">
      <header className="border-3 border-jet bg-jet text-dirty p-4 shadow-hard">
        <h1 className="font-display text-5xl">AKO</h1>
        <p className="mt-2 text-sm">Edit anytime. Rebuild plan anytime.</p>
      </header>

      <div className="g-card flex items-center gap-4">
        <button
          type="button"
          className="h-16 w-16 border-3 border-jet bg-mango text-3xl shadow-hardSm"
          onClick={() => {
            const emojis = ['💪', '🔥', '🏋️', '🇵🇭', '⚡', '🥊']
            const avatar = emojis[Math.floor(Math.random() * emojis.length)]
            setExt((p) => ({ ...p, avatar }))
            patchCoach('avatar', avatar)
          }}
        >
          {ext.avatar}
        </button>
        <div className="flex-1">
          <label className="g-label">Name</label>
          <input
            className="g-input mt-1"
            value={coach.name}
            onChange={(e) => patchCoach('name', e.target.value)}
          />
        </div>
      </div>

      <div className="g-card space-y-3">
        <p className="font-display text-xl">BODY</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="g-label">Age</label>
            <input type="number" className="g-input mt-1" value={coach.age} onChange={(e) => patchCoach('age', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="g-label">Sex</label>
            <select className="g-input mt-1" value={coach.sex} onChange={(e) => patchCoach('sex', e.target.value as CoachProfile['sex'])}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="g-label">Weight kg</label>
            <input type="number" className="g-input mt-1" value={coach.weight_kg} onChange={(e) => patchCoach('weight_kg', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="g-label">Height cm</label>
            <input type="number" className="g-input mt-1" value={coach.height_cm} onChange={(e) => patchCoach('height_cm', Number(e.target.value) || 0)} />
          </div>
        </div>
      </div>

      <div className="g-card space-y-3">
        <p className="font-display text-xl">GOAL & LEVEL</p>
        <select className="g-input" value={coach.goal} onChange={(e) => patchCoach('goal', e.target.value as FitnessGoal)}>
          <option value="lose_fat">Lose Fat</option>
          <option value="gain_muscle">Gain Muscle</option>
          <option value="maintain">Maintain</option>
          <option value="recomp">Body Recomposition</option>
        </select>
        <select className="g-input" value={coach.experience} onChange={(e) => patchCoach('experience', e.target.value as Experience)}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select className="g-input" value={coach.location} onChange={(e) => patchCoach('location', e.target.value as LocationPref)}>
          <option value="home">Home</option>
          <option value="gym">Gym</option>
          <option value="both">Both</option>
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="g-label">Days/week</label>
            <select className="g-input mt-1" value={coach.days_per_week} onChange={(e) => patchCoach('days_per_week', Number(e.target.value) as CoachProfile['days_per_week'])}>
              {[2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="g-label">Duration</label>
            <select className="g-input mt-1" value={coach.duration_mins} onChange={(e) => patchCoach('duration_mins', Number(e.target.value) as CoachProfile['duration_mins'])}>
              {[20, 30, 45, 60, 90].map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-asphalt font-bold uppercase">Current: {goalLabel(coach.goal)}</p>
      </div>

      <div className="g-card space-y-3">
        <p className="font-display text-xl">RECOVERY</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="g-label">Water (L)</label>
            <input type="number" step="0.1" className="g-input mt-1" value={coach.water_liters} onChange={(e) => patchCoach('water_liters', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="g-label">Sleep before</label>
            <input className="g-input mt-1" value={coach.sleep_by} onChange={(e) => patchCoach('sleep_by', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="g-card space-y-3">
        <p className="font-display text-xl">COACHING STYLE</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['chill', '🌱', 'Chill'],
            ['tropa', '🤝', 'Tropa'],
            ['real_talk', '🔥', 'Real Talk'],
          ] as [CoachingStyle, string, string][]).map(([val, emoji, label]) => (
            <button
              key={val}
              type="button"
              className={`g-btn py-3 text-center ${coachStyle === val ? 'bg-jeepney text-dirty shadow-hard' : 'bg-dirty shadow-hardSm'}`}
              onClick={() => {
                setCoachStyle(val)
                setCoachingStyle(val)
                patchCoach('tropa_mode', val !== 'chill')
                showToast('style_changed', `${emoji} ${label} mode activated`)
              }}
            >
              <span className="text-lg block">{emoji}</span>
              <span className="text-xs font-display">{label}</span>
            </button>
          ))}
        </div>
        {coachStyle === 'real_talk' && (
          <>
            <p className="g-label mt-2">Intensity</p>
            <div className="grid grid-cols-3 gap-2">
              {(['mild', 'medium', 'unfiltered'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`g-btn py-2 text-xs font-display uppercase ${intensity === lvl ? 'bg-traffic text-dirty shadow-hard' : 'bg-dirty shadow-hardSm'}`}
                  onClick={() => {
                    setIntensityState(lvl)
                    setIntensity(lvl)
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button type="button" className="g-btn-primary w-full text-xl py-4" onClick={save}>
        SAVE + REBUILD PLAN
      </button>

      <button type="button" className="g-btn-ghost w-full" onClick={() => navigate('/setup')}>
        Redo full setup
      </button>

      {!bypass && (
        <button type="button" className="g-btn-ghost w-full text-traffic" onClick={() => signOut()}>
          Logout
        </button>
      )}
    </div>
  )
}
