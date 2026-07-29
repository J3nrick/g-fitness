import { DEMO_USER_ID, demoGet, demoSet } from './demoMode'

export interface UserExercise {
  id: string
  name: string
  muscle_group: string
  notes: string
  is_favorite: boolean
}

export interface PlanItem {
  id: string
  exercise_id: string
  exercise_name: string
  sets: number
  reps: number
  weight: number
  rest_seconds: number
  notes: string
  sort_order: number
}

export interface UserWorkoutPlan {
  id: string
  name: string
  description: string
  items: PlanItem[]
  sort_order: number
}

export interface UserFood {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  is_favorite: boolean
}

export interface UserProfileExt {
  nickname: string
  height_cm: number
  goal: string
  weekly_target: number
  workout_goal: string
  avatar: string
  tropa_mode: boolean
  daily_calories: number
  daily_protein: number
  target_weight: number
  current_weight: number
}

const DEFAULT_EXERCISES: UserExercise[] = [
  { id: 'ex-bench', name: 'Bench Press', muscle_group: 'Chest', notes: '', is_favorite: true },
  { id: 'ex-squat', name: 'Squat', muscle_group: 'Legs', notes: '', is_favorite: true },
  { id: 'ex-row', name: 'Barbell Row', muscle_group: 'Back', notes: '', is_favorite: false },
  { id: 'ex-ohp', name: 'Shoulder Press', muscle_group: 'Shoulders', notes: '', is_favorite: false },
  { id: 'ex-pushup', name: 'Push-ups', muscle_group: 'Chest', notes: '', is_favorite: true },
  { id: 'ex-bw-squat', name: 'Bodyweight Squats', muscle_group: 'Legs', notes: '', is_favorite: false },
]

const DEFAULT_PLANS: UserWorkoutPlan[] = [
  {
    id: 'plan-push',
    name: 'Push Day',
    description: 'Chest, shoulders, tris',
    sort_order: 0,
    items: [
      { id: 'pi1', exercise_id: 'ex-bench', exercise_name: 'Bench Press', sets: 4, reps: 10, weight: 60, rest_seconds: 90, notes: '', sort_order: 0 },
      { id: 'pi2', exercise_id: 'ex-ohp', exercise_name: 'Shoulder Press', sets: 3, reps: 10, weight: 30, rest_seconds: 75, notes: '', sort_order: 1 },
    ],
  },
]

const DEFAULT_FOODS: UserFood[] = [
  { id: 'fd-chicken', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, is_favorite: true },
  { id: 'fd-rice', name: 'Rice (1 cup)', calories: 206, protein: 4.3, carbs: 45, fat: 0.4, is_favorite: true },
  { id: 'fd-egg', name: 'Eggs (2)', calories: 140, protein: 12, carbs: 1, fat: 10, is_favorite: true },
  { id: 'fd-whey', name: 'Whey Shake', calories: 120, protein: 24, carbs: 3, fat: 1.5, is_favorite: false },
]

const DEFAULT_PROFILE: UserProfileExt = {
  nickname: 'Tropa',
  height_cm: 170,
  goal: 'Consistency',
  weekly_target: 4,
  workout_goal: 'Show up',
  avatar: '💪',
  tropa_mode: false,
  daily_calories: 2200,
  daily_protein: 170,
  target_weight: 70,
  current_weight: 72,
}

function uid() {
  return crypto.randomUUID()
}

export function getExercises(): UserExercise[] {
  const list = demoGet<UserExercise[]>('user_exercises', [])
  if (list.length === 0) {
    demoSet('user_exercises', DEFAULT_EXERCISES)
    return DEFAULT_EXERCISES
  }
  return list
}

export function saveExercises(list: UserExercise[]) {
  demoSet('user_exercises', list)
}

export function getPlans(): UserWorkoutPlan[] {
  const list = demoGet<UserWorkoutPlan[]>('user_plans', [])
  if (list.length === 0) {
    demoSet('user_plans', DEFAULT_PLANS)
    return DEFAULT_PLANS
  }
  return list.sort((a, b) => a.sort_order - b.sort_order)
}

export function savePlans(list: UserWorkoutPlan[]) {
  demoSet('user_plans', list)
}

export function getFoods(): UserFood[] {
  const list = demoGet<UserFood[]>('user_foods_v2', [])
  if (list.length === 0) {
    demoSet('user_foods_v2', DEFAULT_FOODS)
    return DEFAULT_FOODS
  }
  return list
}

export function saveFoods(list: UserFood[]) {
  demoSet('user_foods_v2', list)
}

export function getExtProfile(): UserProfileExt {
  return demoGet<UserProfileExt>('user_profile_ext', DEFAULT_PROFILE)
}

export function saveExtProfile(profile: UserProfileExt) {
  demoSet('user_profile_ext', profile)
}

export function getCoachProfile() {
  // lazy import avoided — stored as JSON
  return demoGet('coach_profile_v1', null as unknown as import('./coach').CoachProfile | null)
}

export function saveCoachProfile(profile: import('./coach').CoachProfile) {
  demoSet('coach_profile_v1', profile)
}

export function getWeekTemplate() {
  return demoGet('week_template_v1', [] as import('./coach').WeekDaySlot[])
}

export function saveWeekTemplate(week: import('./coach').WeekDaySlot[]) {
  demoSet('week_template_v1', week)
}

export function isCompanionReady(): boolean {
  const coach = demoGet<{ onboarding_complete?: boolean } | null>('coach_profile_v1', null)
  return Boolean(coach?.onboarding_complete)
}

export function duplicatePlan(plan: UserWorkoutPlan): UserWorkoutPlan {
  return {
    ...plan,
    id: uid(),
    name: `${plan.name} (Copy)`,
    items: plan.items.map((item, i) => ({ ...item, id: uid(), sort_order: i })),
    sort_order: Date.now(),
  }
}

export function newEmptyPlan(): UserWorkoutPlan {
  return {
    id: uid(),
    name: 'Bag Workout',
    description: '',
    items: [],
    sort_order: Date.now(),
  }
}

export function newEmptyExercise(): UserExercise {
  return {
    id: uid(),
    name: 'New Exercise',
    muscle_group: 'Full Body',
    notes: '',
    is_favorite: false,
  }
}

export function newEmptyFood(): UserFood {
  return {
    id: uid(),
    name: 'New Food',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    is_favorite: false,
  }
}

export { DEMO_USER_ID, uid }
