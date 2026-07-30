import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGreeting } from '../lib/utils'
import { DynamicQuoteCard } from '../components/dashboard/DynamicQuoteCard'
import {
  DEFAULT_COACH,
  buildTodayPlan,
  computeNutrition,
  goalLabel,
} from '../lib/coach'
import {
  getCoachProfile,
  getExtProfile,
  getPlans,
  getWeekTemplate,
  isCompanionReady,
} from '../lib/store'
import { MissionChecklist, useStreak } from '../components/dashboard/MissionChecklist'

export function Dashboard() {
  const navigate = useNavigate()
  const streak = useStreak()
  const ext = getExtProfile()
  const coach = getCoachProfile() ?? { ...DEFAULT_COACH, name: ext.nickname, weight_kg: ext.current_weight, height_cm: ext.height_cm, onboarding_complete: false }
  const plans = getPlans()
  const week = getWeekTemplate()
  const ready = isCompanionReady()

  const today = useMemo(() => {
    const w = week.length ? week : [
      { day: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()], focus: 'Full Body', planName: plans[0]?.name ?? null, isRest: false },
    ]
    return buildTodayPlan(coach, plans, w)
  }, [coach, plans, week])

  const nutrition = computeNutrition(coach)

  if (!ready) {
    return (
      <div className="g-page">
        <header className="border-3 border-jet bg-jeepney text-dirty p-4 shadow-hard">
          <h1 className="font-display text-4xl">G! COACH</h1>
          <p className="mt-2 text-sm">Walang guesswork. Sundan mo lang.</p>
        </header>
        <div className="g-card">
          <p className="font-bold">Gusto mong magbago. Ano ang dapat mong gawin simula ngayon?</p>
          <p className="text-sm text-asphalt mt-2">Sagutin ang short setup — G! will build your plan.</p>
        </div>
        <button type="button" className="g-btn-primary w-full text-xl py-4" onClick={() => navigate('/setup')}>
          START SETUP
        </button>
      </div>
    )
  }

  return (
    <div className="g-page">
      <header className="border-3 border-jet bg-jeepney text-dirty p-4 shadow-hard">
        <p className="text-xs font-bold uppercase tracking-widest opacity-90">{getGreeting()}</p>
        <h1 className="font-display text-5xl mt-1">G! COACH</h1>
        <p className="mt-2 text-sm font-medium">
          {coach.name || ext.nickname} · {goalLabel(coach.goal)} · {coach.experience}
        </p>
      </header>

      <div className="g-card bg-mango space-y-2">
        <p className="g-label text-jet">Today&apos;s Plan · {today.weekday}</p>
        <p className="font-display text-3xl text-jet">
          {today.isRest ? 'REST DAY' : today.focus.toUpperCase()}
        </p>
        <p className="text-sm font-medium text-jet/80">{today.coachingLine}</p>
      </div>

      <div className="g-card !p-0 overflow-hidden">
        <div className="bg-jet text-dirty px-4 py-2 font-display text-lg">DO THIS TODAY</div>
        <ul className="divide-y-0">
          <li className="border-b-3 border-jet px-4 py-3 font-bold">
            {today.isRest
              ? '• Optional: Katamad Today (kung gusto mo pa rin gumalaw)'
              : `• ${today.focus} (~${today.durationMins} min)`}
          </li>
          <li className="border-b-3 border-jet px-4 py-3 font-bold">
            • Drink at least {today.waterLiters}L water
          </li>
          <li className="border-b-3 border-jet px-4 py-3 font-bold">
            • Aim for {nutrition.protein}g protein ({nutrition.calories} kcal)
          </li>
          <li className="px-4 py-3 font-bold">• Sleep before {today.sleepBy}</li>
        </ul>
      </div>

      <MissionChecklist />

      <div className="g-card flex items-end justify-between bg-concrete">
        <div>
          <p className="g-label">Streak</p>
          <p className="font-mono text-4xl font-bold">{streak}</p>
        </div>
        <div className="text-right text-xs font-bold uppercase text-asphalt">
          <p>C {nutrition.carbs}g</p>
          <p>F {nutrition.fat}g</p>
        </div>
      </div>

      {!today.isRest && today.plan ? (
        <button
          type="button"
          className="g-btn-primary w-full text-2xl py-5"
          onClick={() => navigate(`/bakal/active?plan=${today.plan!.id}`)}
        >
          START {today.focus.toUpperCase()}
        </button>
      ) : (
        <button
          type="button"
          className="g-btn-accent w-full text-xl py-4"
          onClick={() => navigate('/katamad')}
        >
          OPEN KATAMAD TODAY
        </button>
      )}

      <button type="button" className="g-btn-primary w-full text-xl py-4" onClick={() => navigate('/coach')}>
        ASK G! COACH
      </button>

      <DynamicQuoteCard />

      <button type="button" className="g-btn-ghost w-full" onClick={() => navigate('/katamad')}>
        Katamad Today
      </button>
      <button type="button" className="g-btn-ghost w-full" onClick={() => navigate('/progress')}>
        View Progress & Weight
      </button>
      <button type="button" className="g-btn-ghost w-full" onClick={() => navigate('/bakal')}>
        Edit routines sa Bakal
      </button>
    </div>
  )
}
