import { buildCoachContext, getDailyBriefFacts } from './coachContext'
import { getCoachingStyle } from './messages'
import {
  DEFAULT_COACH,
  computeNutrition,
  type WeekDaySlot,
} from './coach'
import {
  getCoachProfile,
  getFoods,
  getPlans,
  savePlans,
  saveWeekTemplate,
  uid,
  type PlanItem,
  type UserWorkoutPlan,
} from './store'
import { demoGet, todayISO } from './demoMode'
import { AiApiError, invokeNutritionCoach, invokeProgressAnalysis, invokeRoutineGenerator } from './aiApi'
import type { DailyLog, WeightLog } from '../types/database.types'

interface HistoryEntry {
  id: string
  date: string
  elapsed: number
  planId?: string
  sets: { name: string; weight: number; reps: number }[]
}

function formatMealsReply(
  reply: string,
  meals: Array<{
    name?: string
    meal_type?: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    notes?: string
  }>,
  focus?: string | null,
): string {
  const lines = [reply, '']
  if (meals.length) {
    lines.push('Suggested meals:')
    meals.forEach((m) => {
      lines.push(
        `• [${m.meal_type ?? 'meal'}] ${m.name ?? 'Food'} — ${m.calories ?? 0} kcal · P${m.protein ?? 0} C${m.carbs ?? 0} F${m.fat ?? 0}`,
      )
      if (m.notes) lines.push(`  ${m.notes}`)
    })
  }
  if (focus) lines.push('', `Focus: ${focus}`)
  return lines.join('\n')
}

function formatProgressReply(report: {
  period_days: number
  summary: string
  consistency?: string
  strength?: string
  nutrition?: string
  recovery?: string
  achievements?: string[]
  missed_goals?: string[]
  recommendations?: string[]
  score?: number
}): string {
  const lines = [
    `Progress report (${report.period_days} days) · Score ${report.score ?? '—'}/100`,
    '',
    report.summary,
  ]
  if (report.consistency) lines.push('', `Consistency: ${report.consistency}`)
  if (report.strength) lines.push(`Strength: ${report.strength}`)
  if (report.nutrition) lines.push(`Nutrition: ${report.nutrition}`)
  if (report.recovery) lines.push(`Recovery: ${report.recovery}`)
  if (report.achievements?.length) {
    lines.push('', 'Wins:')
    report.achievements.forEach((a) => lines.push(`• ${a}`))
  }
  if (report.missed_goals?.length) {
    lines.push('', 'Missed:')
    report.missed_goals.forEach((a) => lines.push(`• ${a}`))
  }
  if (report.recommendations?.length) {
    lines.push('', 'Next moves:')
    report.recommendations.forEach((a) => lines.push(`• ${a}`))
  }
  return lines.join('\n')
}

function applyAiRoutine(payload: {
  summary: string
  plans: Array<{
    name?: string
    description?: string
    items?: Array<{
      exercise_name?: string
      sets?: number
      reps?: number
      weight?: number
      rest_seconds?: number
      notes?: string
    }>
  }>
  week?: Array<{
    day?: string
    focus?: string
    planName?: string | null
    isRest?: boolean
  }>
}): { summary: string; planCount: number } {
  const plans: UserWorkoutPlan[] = payload.plans.map((p, idx) => {
    const items: PlanItem[] = (p.items ?? []).map((it, i) => ({
      id: uid(),
      exercise_id: `ai-${idx}-${i}`,
      exercise_name: String(it.exercise_name ?? `Exercise ${i + 1}`),
      sets: Math.max(1, Number(it.sets) || 3),
      reps: Math.max(1, Number(it.reps) || 10),
      weight: Math.max(0, Number(it.weight) || 0),
      rest_seconds: Math.max(30, Number(it.rest_seconds) || 90),
      notes: String(it.notes ?? ''),
      sort_order: i,
    }))
    return {
      id: uid(),
      name: String(p.name ?? `Day ${idx + 1}`),
      description: String(p.description ?? 'AI-generated'),
      items,
      sort_order: idx,
    }
  })

  if (plans.length === 0) throw new AiApiError('No plans returned by routine generator', 502)
  savePlans(plans)

  const week: WeekDaySlot[] = (payload.week ?? []).map((d) => ({
    day: String(d.day ?? 'Monday'),
    focus: String(d.focus ?? (d.isRest ? 'Rest' : 'Training')),
    planName: d.isRest ? null : (d.planName ?? plans[0]?.name ?? null),
    isRest: Boolean(d.isRest),
  }))

  if (week.length === 7) saveWeekTemplate(week)

  return { summary: payload.summary, planCount: plans.length }
}

function checklistStats(days: number) {
  let workoutDays = 0
  let proteinHits = 0
  let waterHits = 0
  let sleepHits = 0
  const cursor = new Date()
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10)
    const day = demoGet<DailyLog | null>(`daily_${key}`, null)
    if (day?.workout_completed) workoutDays += 1
    if (day?.protein_hit) proteinHits += 1
    if (day?.water_hit) waterHits += 1
    if (day?.sleep_hit) sleepHits += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return { workoutDays, proteinHits, waterHits, sleepHits }
}

export async function runNutritionCoachAction(): Promise<string> {
  const brief = getDailyBriefFacts()
  const coach = getCoachProfile() ?? DEFAULT_COACH
  const nutrition = computeNutrition(coach)
  const foods = getFoods().filter((f) => f.is_favorite).slice(0, 8)
  const result = await invokeNutritionCoach({
    coachingStyle: getCoachingStyle(),
    context: buildCoachContext(),
    remaining: {
      calories: brief.remainingCalories,
      protein: brief.remainingProtein,
      carbs: Math.max(0, nutrition.carbs - Math.round((brief.calories - brief.protein * 4) * 0.55)),
      fat: Math.max(0, nutrition.fat),
    },
    favorites: foods.map((f) => ({
      name: f.name,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
    })),
    budget: 'any',
  })
  return formatMealsReply(result.reply, result.meals ?? [], result.focus)
}

export async function runRoutineGeneratorAction(): Promise<string> {
  const coach = getCoachProfile() ?? DEFAULT_COACH
  const result = await invokeRoutineGenerator({
    coachingStyle: getCoachingStyle(),
    context: buildCoachContext(),
    profile: {
      goal: coach.goal,
      experience: coach.experience,
      location: coach.location,
      equipment: coach.equipment,
      days_per_week: coach.days_per_week,
      duration_mins: coach.duration_mins,
      injuries: '',
      preferred_days: [],
    },
  })
  const applied = applyAiRoutine(result)
  const names = getPlans()
    .map((p) => p.name)
    .join(', ')
  return [
    applied.summary,
    '',
    `Saved ${applied.planCount} routine(s) to Bakal: ${names}`,
    'Open Bakal to review sets/reps, then start from Home.',
  ].join('\n')
}

export async function runProgressAnalysisAction(periodDays: 30 | 60 | 90 = 30): Promise<string> {
  const workouts = demoGet<HistoryEntry[]>('workout_history', []).slice(0, 40)
  const weights = demoGet<WeightLog[]>('weight_logs', []).slice(-40)
  const result = await invokeProgressAnalysis({
    coachingStyle: getCoachingStyle(),
    context: buildCoachContext(),
    periodDays,
    workouts,
    weights,
    nutritionDays: [
      {
        date: todayISO(),
        calories: getDailyBriefFacts().calories,
        protein: getDailyBriefFacts().protein,
        targets: {
          calories: getDailyBriefFacts().calorieTarget,
          protein: getDailyBriefFacts().proteinTarget,
        },
      },
    ],
    checklistStats: checklistStats(periodDays),
  })
  return formatProgressReply(result)
}
