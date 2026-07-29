import type { CoachingStyle } from '../types/database.types'
import { getExtProfile } from './store'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning.'
  if (hour < 18) return 'Good Afternoon.'
  return 'Good Evening.'
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type ToastKey =
  | 'water'
  | 'protein'
  | 'meal'
  | 'set'
  | 'workout_done'
  | 'weight'
  | 'style_changed'
  | 'sleep'
  | 'delete_set'
  | 'pr'
  | 'katamad_done'
  | 'saved'
  | 'deleted'

const SOFT: Record<ToastKey, string> = {
  water: 'Tubig in. Solid.',
  protein: 'Protein logged. Tuloy lang.',
  meal: 'Kain logged. Ayos.',
  set: 'Set done. Isa pa.',
  workout_done: 'Ayos. Hindi ka nagpatalo ngayon.',
  weight: 'Timbang saved.',
  style_changed: 'Style updated.',
  sleep: 'Sleep checked. Recovery matters.',
  delete_set: 'Set removed.',
  pr: 'Lakas! Dagdag bakal na naman.',
  katamad_done: 'Kahit tinamad ka, gumalaw ka pa rin. Panalo ‘yan.',
  saved: 'Saved. G!',
  deleted: 'Deleted.',
}

const TROPA: Record<ToastKey, string> = {
  water: 'Inom! Wag puro kape.',
  protein: 'Ayan, protein. Hindi puro kanin.',
  meal: 'Kain! Tara continue.',
  set: 'Set done! Isa pa, tropa.',
  workout_done: 'Solid! Heto ang sinasabing disiplina.',
  weight: 'Timbang saved. Harapin mo.',
  style_changed: 'Tropa mode on.',
  sleep: 'Tulog marked. Bawi muscles.',
  delete_set: 'Binura? Okay — ayusin mo lang.',
  pr: 'Lakas! Sino nagturo sa’yo niyan?',
  katamad_done: 'Tinamad pero gumalaw. Panalo pa rin.',
  saved: 'Saved. Walang drama.',
  deleted: 'Gone. Next.',
}

export function toastFor(style: CoachingStyle | null | undefined, key: string): string {
  const tropa = getExtProfile().tropa_mode || style === 'real_talk' || style === 'tropa'
  const pack = tropa ? TROPA : SOFT
  return pack[key as ToastKey] ?? 'Done.'
}

export const PERSONA_TOASTS = {
  chill: SOFT,
  tropa: TROPA,
  real_talk: TROPA,
} as const
