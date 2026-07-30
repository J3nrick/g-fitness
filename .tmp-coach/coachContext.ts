import { demoGet, todayISO } from './demoMode'
import {
  DEFAULT_COACH,
  buildTodayPlan,
  computeNutrition,
  goalLabel,
} from './coach'
import {
  getCoachProfile,
  getExtProfile,
  getFoods,
  getPlans,
  getWeekTemplate,
} from './store'
import { getCoachingStyle } from './messages'
import type { DailyLog, WeightLog } from '../types/database.types'

interface MealEntry {
  id: string
  food_id: string
  food?: { name: string; calories: number; protein: number; carbs: number; fat: number }
  consumed_at: string
}

interface HistoryEntry {
  id: string
  date: string
  elapsed: number
  planId?: string
  sets: { name: string; weight: number; reps: number }[]
}

function computeStreak(): number {
  let count = 0
  const cursor = new Date()
  const today = todayISO()
  const todayLog = demoGet<DailyLog | null>(`daily_${today}`, null)
  if (!todayLog?.workout_completed) cursor.setDate(cursor.getDate() - 1)
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    const day = demoGet<DailyLog | null>(`daily_${key}`, null)
    if (!day?.workout_completed) break
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

function mealTotals(logs: MealEntry[]) {
  return logs.reduce(
    (acc, log) => {
      const food = log.food
      acc.calories += food?.calories ?? 0
      acc.protein += food?.protein ?? 0
      acc.carbs += food?.carbs ?? 0
      acc.fat += food?.fat ?? 0
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/** Compact, factual snapshot sent to Gemini — never invent beyond this. */
export function buildCoachContext(): string {
  const coach = getCoachProfile() ?? DEFAULT_COACH
  const ext = getExtProfile()
  const plans = getPlans()
  const week = getWeekTemplate()
  const foods = getFoods()
  const style = getCoachingStyle()
  const streak = computeStreak()
  const date = todayISO()
  const daily = demoGet<DailyLog | null>(`daily_${date}`, null)
  const meals = demoGet<MealEntry[]>(`meals_${date}`, [])
  const totals = mealTotals(meals)
  const nutrition = computeNutrition(coach)
  const today = buildTodayPlan(coach, plans, week.length ? week : [])
  const history = demoGet<HistoryEntry[]>('workout_history', []).slice(0, 8)
  const weights = demoGet<WeightLog[]>('weight_logs', []).slice(-10)

  const remaining = {
    calories: Math.max(0, (ext.daily_calories || nutrition.calories) - totals.calories),
    protein: Math.max(0, (ext.daily_protein || nutrition.protein) - totals.protein),
  }

  const lines: string[] = [
    `DATE: ${date}`,
    `COACHING_STYLE: ${style}`,
    '',
    '=== USER PROFILE ===',
    `Name: ${coach.name || ext.nickname || 'Athlete'}`,
    `Age: ${coach.age} | Sex: ${coach.sex}`,
    `Height: ${coach.height_cm} cm | Weight: ${coach.weight_kg} kg | Target: ${ext.target_weight} kg`,
    `Goal: ${goalLabel(coach.goal)} (${coach.goal})`,
    `Experience: ${coach.experience} | Location: ${coach.location}`,
    `Equipment: ${(coach.equipment ?? []).join(', ') || 'none'}`,
    `Schedule: ${coach.days_per_week} days/week × ${coach.duration_mins} min`,
    `Sleep by: ${coach.sleep_by} | Water target: ${coach.water_liters}L`,
    '',
    '=== NUTRITION TARGETS ===',
    `Calories: ${ext.daily_calories || nutrition.calories} kcal`,
    `Protein: ${ext.daily_protein || nutrition.protein}g`,
    `Carbs: ${nutrition.carbs}g | Fat: ${nutrition.fat}g`,
    '',
    '=== TODAY ===',
    `Weekday plan: ${today.isRest ? 'REST DAY' : today.focus} (~${today.durationMins} min)`,
    `Workout completed: ${daily?.workout_completed ? 'YES' : 'NO'}`,
    `Protein hit: ${daily?.protein_hit ? 'YES' : 'NO'} | Water hit: ${daily?.water_hit ? 'YES' : 'NO'} | Sleep hit: ${daily?.sleep_hit ? 'YES' : 'NO'}`,
    `Meals logged today: ${meals.length}`,
    `Today macros: ${Math.round(totals.calories)} kcal | P${Math.round(totals.protein)} C${Math.round(totals.carbs)} F${Math.round(totals.fat)}`,
    `Remaining: ${Math.round(remaining.calories)} kcal | ${Math.round(remaining.protein)}g protein`,
    `Streak: ${streak} days`,
  ]

  if (meals.length) {
    lines.push('', '=== TODAY MEALS ===')
    meals.slice(0, 12).forEach((m) => {
      const f = m.food
      lines.push(
        `- ${f?.name ?? 'Food'}: ${f?.calories ?? 0} kcal, P${f?.protein ?? 0} C${f?.carbs ?? 0} F${f?.fat ?? 0}`,
      )
    })
  }

  lines.push('', '=== WORKOUT PLANS ===')
  plans.slice(0, 6).forEach((p) => {
    const moves = p.items
      .slice(0, 6)
      .map((i) => `${i.exercise_name} ${i.sets}x${i.reps}${i.weight ? `@${i.weight}kg` : ''}`)
      .join('; ')
    lines.push(`- ${p.name}: ${moves || 'empty'}`)
  })

  if (week.length) {
    lines.push('', '=== WEEK TEMPLATE ===')
    week.forEach((d) => {
      lines.push(`- ${d.day}: ${d.isRest ? 'Rest' : d.focus}`)
    })
  }

  if (history.length) {
    lines.push('', '=== RECENT WORKOUT HISTORY (newest first) ===')
    history.forEach((h) => {
      const setSummary = h.sets
        .slice(0, 8)
        .map((s) => `${s.name} ${s.weight}kg×${s.reps}`)
        .join(', ')
      lines.push(`- ${h.date} (${Math.round(h.elapsed / 60)} min): ${setSummary || 'no sets'}`)
    })
  } else {
    lines.push('', '=== RECENT WORKOUT HISTORY ===', 'None logged yet.')
  }

  if (weights.length) {
    lines.push('', '=== WEIGHT LOG (recent) ===')
    weights.forEach((w) => {
      lines.push(`- ${w.logged_at.slice(0, 10)}: ${w.weight} kg`)
    })
  }

  lines.push('', '=== FAVORITE FOODS ===')
  foods
    .filter((f) => f.is_favorite)
    .slice(0, 8)
    .forEach((f) => {
      lines.push(`- ${f.name}: ${f.calories} kcal, P${f.protein} C${f.carbs} F${f.fat}`)
    })

  return lines.join('\n')
}

export function buildSystemPrompt(): string {
  const style = getCoachingStyle()
  const styleRules =
    style === 'real_talk'
      ? `Coaching style: REAL TALK. Use light Filipino gym banter and occasional mild Taglish/Tagalog profanity in a playful tropa way. Never harass, shame, or encourage unsafe behavior.`
      : style === 'chill'
        ? `Coaching style: CHILL. Supportive, calm, encouraging. No profanity.`
        : `Coaching style: TROPA. Casual Filipino humor and Taglish. Friendly gym buddy energy. No heavy profanity.`

  return `You are G! Coach — the user's Filipino fitness companion inside the G! app.

You are NOT a generic AI assistant. You are their personal coach.

${styleRules}

RULES:
1. Always answer using the USER DATA CONTEXT provided below when available.
2. Never invent workout history, meal numbers, weights, or streaks. If data is missing, say so and ask a short follow-up.
3. Be supportive, practical, and concise. Prefer short paragraphs and bullet lists.
4. For nutrition: use calorie target, protein target, today's meals, and remaining macros.
5. For workouts: use their plans, history, equipment, experience, and goals.
6. Progressive overload advice should reference their actual logged weights when present.
7. Safety first: if pain/injury is mentioned, advise rest/modification and seeing a professional if it persists. Never diagnose.
8. You may reply in Taglish when it fits the coaching style.
9. Objective: help them stay consistent — not overwhelm them.

When the user first opens chat or asks for a briefing, give a proactive daily coaching summary using today's data (workout plan, remaining protein/calories, streak, checklist).`
}

export interface DailyBriefFacts {
  name: string
  focus: string
  isRest: boolean
  calories: number
  calorieTarget: number
  protein: number
  proteinTarget: number
  remainingProtein: number
  remainingCalories: number
  streak: number
  workoutDone: boolean
  style: string
}

export function getDailyBriefFacts(): DailyBriefFacts {
  const coach = getCoachProfile() ?? DEFAULT_COACH
  const ext = getExtProfile()
  const plans = getPlans()
  const week = getWeekTemplate()
  const nutrition = computeNutrition(coach)
  const today = buildTodayPlan(coach, plans, week.length ? week : [])
  const meals = demoGet<MealEntry[]>(`meals_${todayISO()}`, [])
  const totals = mealTotals(meals)
  const daily = demoGet<DailyLog | null>(`daily_${todayISO()}`, null)
  const calorieTarget = ext.daily_calories || nutrition.calories
  const proteinTarget = ext.daily_protein || nutrition.protein

  return {
    name: coach.name || ext.nickname || 'Tropa',
    focus: today.isRest ? 'Rest Day' : today.focus,
    isRest: today.isRest,
    calories: Math.round(totals.calories),
    calorieTarget,
    protein: Math.round(totals.protein),
    proteinTarget,
    remainingProtein: Math.max(0, Math.round(proteinTarget - totals.protein)),
    remainingCalories: Math.max(0, Math.round(calorieTarget - totals.calories)),
    streak: computeStreak(),
    workoutDone: Boolean(daily?.workout_completed),
    style: getCoachingStyle(),
  }
}
