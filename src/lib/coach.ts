import {
  EXERCISE_LIBRARY,
  type Difficulty,
  type Equipment,
  type LibraryExercise,
} from '../data/exercises'
import {
  savePlans,
  type PlanItem,
  type UserProfileExt,
  type UserWorkoutPlan,
  uid,
} from './store'

export type FitnessGoal = 'lose_fat' | 'gain_muscle' | 'maintain' | 'recomp'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type LocationPref = 'home' | 'gym' | 'both'

export interface CoachProfile {
  name: string
  age: number
  sex: 'male' | 'female' | 'other'
  height_cm: number
  weight_kg: number
  goal: FitnessGoal
  experience: Experience
  location: LocationPref
  equipment: Equipment[]
  days_per_week: 2 | 3 | 4 | 5 | 6
  duration_mins: 20 | 30 | 45 | 60 | 90
  onboarding_complete: boolean
  tropa_mode: boolean
  avatar: string
  sleep_by: string
  water_liters: number
}

export interface WeekDaySlot {
  day: string
  focus: string
  planName: string | null
  isRest: boolean
}

export interface NutritionTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface TodayPlan {
  weekday: string
  focus: string
  isRest: boolean
  plan: UserWorkoutPlan | null
  durationMins: number
  nutrition: NutritionTargets
  waterLiters: number
  sleepBy: string
  coachingLine: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const SPLITS: Record<number, string[]> = {
  2: ['Full Body A', 'Full Body B'],
  3: ['Push', 'Pull', 'Legs'],
  4: ['Push', 'Pull', 'Legs', 'Upper'],
  5: ['Push', 'Pull', 'Legs', 'Upper', 'Full Body'],
  6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
}

function hasEquipment(userEq: Equipment[], needed: Equipment[]): boolean {
  if (userEq.includes('full_gym')) return true
  if (userEq.includes('none') && needed.includes('none')) return true
  return needed.some((n) => userEq.includes(n) || n === 'none')
}

function matchesLocation(ex: LibraryExercise, location: LocationPref, equipment: Equipment[]): boolean {
  if (location === 'home') {
    const homeOk: Equipment[] = ['none', 'bands', 'dumbbells', 'bench', 'pullup_bar']
    return ex.equipment.some((e) => homeOk.includes(e) && (equipment.includes(e) || e === 'none' || equipment.includes('bands')))
  }
  if (location === 'gym') {
    return hasEquipment(equipment.includes('full_gym') ? ['full_gym'] : equipment, ex.equipment)
  }
  return hasEquipment(equipment, ex.equipment)
}

function difficultyOk(ex: LibraryExercise, experience: Experience): boolean {
  if (experience === 'beginner') return ex.difficulty !== 'advanced'
  if (experience === 'intermediate') return true
  return true
}

function pickForFocus(
  focus: string,
  coach: CoachProfile,
  count: number,
): LibraryExercise[] {
  const pool = EXERCISE_LIBRARY.filter(
    (ex) => matchesLocation(ex, coach.location, coach.equipment) && difficultyOk(ex, coach.experience),
  )

  const byFocus: Record<string, (ex: LibraryExercise) => boolean> = {
    Push: (ex) => ['Chest', 'Shoulders', 'Triceps'].includes(ex.primary),
    Pull: (ex) => ['Back', 'Biceps'].includes(ex.primary),
    Legs: (ex) => ['Quads', 'Hamstrings', 'Glutes'].includes(ex.primary),
    Upper: (ex) => ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'].includes(ex.primary),
    'Full Body': () => true,
    'Full Body A': () => true,
    'Full Body B': () => true,
  }

  const filter = byFocus[focus] ?? (() => true)
  let candidates = pool.filter(filter)
  if (candidates.length < count) candidates = pool

  // Prefer matching experience difficulty first
  candidates = [...candidates].sort((a, b) => {
    const score = (ex: LibraryExercise) =>
      (ex.difficulty === coach.experience ? 0 : 1) + (ex.equipment.includes('none') && coach.location === 'home' ? -1 : 0)
    return score(a) - score(b)
  })

  const picked: LibraryExercise[] = []
  const usedMuscles = new Set<string>()
  for (const ex of candidates) {
    if (picked.length >= count) break
    if (usedMuscles.has(ex.primary) && picked.length < count - 1) continue
    picked.push(ex)
    usedMuscles.add(ex.primary)
  }
  while (picked.length < count && candidates[picked.length]) {
    picked.push(candidates[picked.length])
  }
  return picked.slice(0, count)
}

function exerciseCountForDuration(mins: number): number {
  if (mins <= 20) return 3
  if (mins <= 30) return 4
  if (mins <= 45) return 5
  if (mins <= 60) return 6
  return 7
}

export function computeNutrition(coach: CoachProfile): NutritionTargets {
  const { weight_kg, sex, age, goal, days_per_week } = coach
  const bmr =
    sex === 'female'
      ? 10 * weight_kg + 6.25 * coach.height_cm - 5 * age - 161
      : 10 * weight_kg + 6.25 * coach.height_cm - 5 * age + 5

  const activity = 1.2 + Math.min(0.55, days_per_week * 0.08)
  let calories = Math.round(bmr * activity)

  if (goal === 'lose_fat') calories = Math.round(calories - 400)
  if (goal === 'gain_muscle') calories = Math.round(calories + 300)
  if (goal === 'recomp') calories = Math.round(calories - 100)

  const proteinPerKg = goal === 'gain_muscle' || goal === 'recomp' ? 2.0 : goal === 'lose_fat' ? 2.2 : 1.6
  const protein = Math.round(weight_kg * proteinPerKg)
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))

  return { calories, protein, carbs, fat }
}

export function buildWeekTemplate(days: number): WeekDaySlot[] {
  const focuses = SPLITS[days] ?? SPLITS[3]
  const pattern: WeekDaySlot[] = WEEKDAYS.map((day) => ({
    day,
    focus: 'Rest',
    planName: null,
    isRest: true,
  }))

  // Prefer Mon-Sat training slots
  const trainIndexes =
    days === 2
      ? [1, 4]
      : days === 3
        ? [1, 3, 5]
        : days === 4
          ? [1, 2, 4, 5]
          : days === 5
            ? [1, 2, 3, 4, 5]
            : [1, 2, 3, 4, 5, 6]

  trainIndexes.forEach((idx, i) => {
    const focus = focuses[i % focuses.length]
    pattern[idx] = {
      day: WEEKDAYS[idx],
      focus,
      planName: focus,
      isRest: false,
    }
  })

  return pattern
}

export function generateRoutine(coach: CoachProfile): UserWorkoutPlan[] {
  const focuses = [...new Set((SPLITS[coach.days_per_week] ?? SPLITS[3]).filter(Boolean))]
  const count = exerciseCountForDuration(coach.duration_mins)

  return focuses.map((focus, order) => {
    const exercises = pickForFocus(focus, coach, count)
    const items: PlanItem[] = exercises.map((ex, i) => ({
      id: uid(),
      exercise_id: ex.id,
      exercise_name: ex.name,
      sets: ex.default_sets,
      reps: Number(String(ex.default_reps).split('-')[0]) || 10,
      weight: 0,
      rest_seconds: ex.rest_seconds,
      notes: ex.default_reps,
      sort_order: i,
    }))

    return {
      id: uid(),
      name: focus,
      description: `${coach.duration_mins} min · ${coach.experience} · auto-built`,
      items,
      sort_order: order,
    }
  })
}

export function previewPlan(coach: CoachProfile): {
  plans: UserWorkoutPlan[]
  week: WeekDaySlot[]
  nutrition: NutritionTargets
} {
  const plans = generateRoutine(coach)
  const week = buildWeekTemplate(coach.days_per_week)
  const nutrition = computeNutrition(coach)
  return { plans, week, nutrition }
}

export function applyGeneratedPlan(coach: CoachProfile): {
  plans: UserWorkoutPlan[]
  week: WeekDaySlot[]
  nutrition: NutritionTargets
} {
  const result = previewPlan(coach)
  savePlans(result.plans)
  return result
}

export function getTodaySlot(week: WeekDaySlot[]): WeekDaySlot {
  const day = WEEKDAYS[new Date().getDay()]
  return week.find((w) => w.day === day) ?? { day, focus: 'Rest', planName: null, isRest: true }
}

export function buildTodayPlan(
  coach: CoachProfile,
  plans: UserWorkoutPlan[],
  week: WeekDaySlot[],
): TodayPlan {
  const slot = getTodaySlot(week)
  const plan = slot.planName
    ? plans.find((p) => p.name === slot.planName) ?? plans[0] ?? null
    : null
  const nutrition = computeNutrition(coach)

  const coachingLine = slot.isRest
    ? 'Rest day. Recover hard — water, protein, sleep. Or open Katamad if you still want to move.'
    : `Sundan mo lang: ${slot.focus} (~${coach.duration_mins} min). Walang guesswork.`

  return {
    weekday: slot.day,
    focus: slot.focus,
    isRest: slot.isRest,
    plan,
    durationMins: coach.duration_mins,
    nutrition,
    waterLiters: coach.water_liters || (coach.weight_kg >= 75 ? 3 : 2.5),
    sleepBy: coach.sleep_by || '23:00',
    coachingLine,
  }
}

export function generateKatamad(coach: CoachProfile): {
  minutes: number
  difficulty: Difficulty
  moves: { name: string; reps: string; exercise_id?: string }[]
} {
  const home = coach.location === 'home' || coach.equipment.includes('none') || coach.equipment.includes('bands')
  const level: Difficulty =
    coach.experience === 'advanced' ? 'advanced' : coach.experience === 'intermediate' ? 'intermediate' : 'beginner'

  if (!home && (coach.equipment.includes('full_gym') || coach.location === 'gym') && coach.experience !== 'beginner') {
    const gymMoves = pickForFocus('Full Body', coach, 4).map((ex) => ({
      name: ex.name,
      reps: `${ex.default_sets} x ${ex.default_reps}`,
      exercise_id: ex.id,
    }))
    return { minutes: 12, difficulty: level, moves: gymMoves }
  }

  if (level === 'beginner') {
    return {
      minutes: 5,
      difficulty: 'beginner',
      moves: [
        { name: 'Push-ups', reps: '10', exercise_id: 'push-ups' },
        { name: 'Bodyweight Squats', reps: '15', exercise_id: 'bodyweight-squat' },
        { name: 'Mountain Climbers', reps: '20', exercise_id: 'mountain-climbers' },
        { name: 'Plank', reps: '30s', exercise_id: 'plank' },
      ],
    }
  }

  if (level === 'intermediate') {
    return {
      minutes: 8,
      difficulty: 'intermediate',
      moves: [
        { name: 'Push-ups', reps: '20', exercise_id: 'push-ups' },
        { name: 'Walking Lunges', reps: '12/side', exercise_id: 'lunges' },
        { name: 'Mountain Climbers', reps: '30', exercise_id: 'mountain-climbers' },
        { name: 'Plank', reps: '45s', exercise_id: 'plank' },
      ],
    }
  }

  return {
    minutes: 10,
    difficulty: 'advanced',
    moves: [
      { name: 'Burpees', reps: '15', exercise_id: 'burpees' },
      { name: 'Push-ups', reps: '30', exercise_id: 'push-ups' },
      { name: 'Jumping Jacks', reps: '40', exercise_id: 'jumping-jacks' },
      { name: 'Plank', reps: '60s', exercise_id: 'plank' },
    ],
  }
}

export function goalLabel(goal: FitnessGoal): string {
  return {
    lose_fat: 'Lose Fat',
    gain_muscle: 'Gain Muscle',
    maintain: 'Maintain',
    recomp: 'Body Recomposition',
  }[goal]
}

export function toExtProfile(coach: CoachProfile, nutrition: NutritionTargets): UserProfileExt {
  return {
    nickname: coach.name,
    height_cm: coach.height_cm,
    goal: goalLabel(coach.goal),
    weekly_target: coach.days_per_week,
    workout_goal: `${coach.experience} · ${coach.duration_mins} min`,
    avatar: coach.avatar || '💪',
    tropa_mode: coach.tropa_mode,
    daily_calories: nutrition.calories,
    daily_protein: nutrition.protein,
    target_weight: coach.goal === 'lose_fat' ? Math.round(coach.weight_kg - 5) : Math.round(coach.weight_kg + 2),
    current_weight: coach.weight_kg,
  }
}

export const DEFAULT_COACH: CoachProfile = {
  name: '',
  age: 22,
  sex: 'male',
  height_cm: 170,
  weight_kg: 68,
  goal: 'gain_muscle',
  experience: 'beginner',
  location: 'home',
  equipment: ['none'],
  days_per_week: 3,
  duration_mins: 45,
  onboarding_complete: false,
  tropa_mode: false,
  avatar: '💪',
  sleep_by: '23:00',
  water_liters: 2.5,
}
