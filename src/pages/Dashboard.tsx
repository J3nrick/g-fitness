import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGreeting } from '../lib/utils'
import { BrandLogo, BrandMark } from '../components/BrandLogo'
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
  const coach = getCoachProfile() ?? {
    ...DEFAULT_COACH,
    name: ext.nickname,
    weight_kg: ext.current_weight,
    height_cm: ext.height_cm,
    onboarding_complete: false,
  }
  const plans = getPlans()
  const week = getWeekTemplate()
  const ready = isCompanionReady()

  const today = useMemo(() => {
    const w = week.length
      ? week
      : [
          {
            day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
              new Date().getDay()
            ],
            focus: 'Full Body',
            planName: plans[0]?.name ?? null,
            isRest: false,
          },
        ]
    return buildTodayPlan(coach, plans, w)
  }, [coach, plans, week])

  const nutrition = computeNutrition(coach)

  if (!ready) {
    return (
      <div className="g-page">
        <header className="space-y-2">
          <BrandLogo />
          <p className="text-xs font-bold uppercase tracking-wider text-asphalt">
            Walang guesswork. Sundan mo lang.
          </p>
        </header>
        <div className="g-card">
          <p className="font-bold leading-snug">
            Gusto mong magbago. Ano ang dapat mong gawin simula ngayon?
          </p>
          <p className="mt-2 text-sm text-asphalt">
            Sagutin ang short setup — G! will build your plan.
          </p>
        </div>
        <button
          type="button"
          className="g-btn-primary w-full text-sm py-2.5"
          onClick={() => navigate('/setup')}
        >
          START SETUP
        </button>
      </div>
    )
  }

  return (
    <div className="g-page">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-asphalt">
            {getGreeting()}
          </p>
          <h1 className="flex items-center gap-2 font-display text-2xl leading-none tracking-tight">
            <BrandMark className="h-7 w-7" title="" />
            G!
          </h1>
          <p className="truncate text-sm text-asphalt">
            {coach.name || ext.nickname} · {goalLabel(coach.goal)} · {coach.experience}
          </p>
        </div>
        <div className="g-card !p-2 !shadow-none shrink-0 text-center min-w-[4.5rem]">
          <p className="g-label !text-[9px]">Streak</p>
          <p className="font-mono text-lg font-bold leading-none">{streak}</p>
        </div>
      </header>

      <section className="g-card bg-mango space-y-1.5">
        <p className="g-label text-jet">Today&apos;s Plan · {today.weekday}</p>
        <p className="font-display text-xl leading-none text-jet">
          {today.isRest ? 'REST DAY' : today.focus.toUpperCase()}
        </p>
        <p className="text-sm leading-snug text-jet/80">{today.coachingLine}</p>
      </section>

      <section className="g-card !p-0 overflow-hidden">
        <div className="bg-jet px-3 py-1.5 font-display text-sm text-dirty">DO THIS TODAY</div>
        <ul>
          <li className="border-b-2 border-jet px-3 py-2.5 text-sm font-bold leading-snug">
            {today.isRest
              ? '• Optional: Katamad Today (kung gusto mo pa rin gumalaw)'
              : `• ${today.focus} (~${today.durationMins} min)`}
          </li>
          <li className="border-b-2 border-jet px-3 py-2.5 text-sm font-bold leading-snug">
            • Drink at least {today.waterLiters}L water
          </li>
          <li className="border-b-2 border-jet px-3 py-2.5 text-sm font-bold leading-snug">
            • Aim for {nutrition.protein}g protein ({nutrition.calories} kcal)
          </li>
          <li className="px-3 py-2.5 text-sm font-bold leading-snug">
            • Sleep before {today.sleepBy}
          </li>
        </ul>
      </section>

      <MissionChecklist />

      <div className="g-card grid grid-cols-3 gap-2 !py-2.5 text-center">
        <div>
          <p className="g-label">Carbs</p>
          <p className="font-mono text-sm font-bold">{nutrition.carbs}g</p>
        </div>
        <div>
          <p className="g-label">Protein</p>
          <p className="font-mono text-sm font-bold text-malunggay">{nutrition.protein}g</p>
        </div>
        <div>
          <p className="g-label">Fat</p>
          <p className="font-mono text-sm font-bold">{nutrition.fat}g</p>
        </div>
      </div>

      {!today.isRest && today.plan ? (
        <button
          type="button"
          className="g-btn-primary w-full text-sm py-2.5"
          onClick={() => navigate(`/bakal/active?plan=${today.plan!.id}`)}
        >
          START {today.focus.toUpperCase()}
        </button>
      ) : (
        <button
          type="button"
          className="g-btn-accent w-full text-sm py-2.5"
          onClick={() => navigate('/katamad')}
        >
          OPEN KATAMAD TODAY
        </button>
      )}

      <button
        type="button"
        className="g-btn-primary w-full text-sm py-2.5"
        onClick={() => navigate('/coach')}
      >
        ASK G! COACH
      </button>

      <DynamicQuoteCard />

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="g-btn-ghost w-full text-[10px] px-1" onClick={() => navigate('/katamad')}>
          Katamad
        </button>
        <button type="button" className="g-btn-ghost w-full text-[10px] px-1" onClick={() => navigate('/progress')}>
          Progress
        </button>
        <button type="button" className="g-btn-ghost w-full text-[10px] px-1" onClick={() => navigate('/bakal')}>
          Bakal
        </button>
      </div>
    </div>
  )
}
