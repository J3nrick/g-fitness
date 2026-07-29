import { getMessage, getCoachingStyle, type MessageEvent } from './messages'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  const style = getCoachingStyle()
  if (hour < 12) return getMessage('morning', style)
  if (hour < 18) return getMessage('afternoon', style)
  return getMessage('late_night', style)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const EVENT_MAP: Record<string, MessageEvent> = {
  water: 'water_goal',
  protein: 'protein_hit',
  meal: 'meal_logged',
  set: 'set_done',
  workout_done: 'workout_finished',
  weight: 'weight_logged',
  style_changed: 'saved',
  sleep: 'sleep_hit',
  delete_set: 'deleted',
  pr: 'personal_record',
  katamad_done: 'katamad_done',
  saved: 'saved',
  deleted: 'deleted',
  scan_success: 'scan_success',
  scan_failed: 'scan_failed',
  plan_generated: 'plan_generated',
  workout_started: 'workout_started',
  first_workout: 'first_workout',
  streak_3: 'streak_3',
  streak_7: 'streak_7',
  streak_14: 'streak_14',
  streak_30: 'streak_30',
  missed_workout: 'missed_workout',
  rest_day: 'rest_day',
  welcome: 'welcome',
}

export function toastFor(_style: unknown, key: string): string {
  const style = getCoachingStyle()
  const event = EVENT_MAP[key] ?? 'saved'
  return getMessage(event, style)
}
