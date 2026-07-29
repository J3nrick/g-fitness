export const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_EMAIL = 'demo@gfitness.local'

const PREFIX = 'g_demo_'

export function demoGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function demoSet<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
