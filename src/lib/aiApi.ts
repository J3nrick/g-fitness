import { supabase } from './supabase'
import type { ScannedResult } from '../hooks/useFoodScanner'

export class AiApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AiApiError'
    this.status = status
  }
}

async function readInvokeError(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error?: unknown }).error
    if (typeof err === 'string' && err.trim()) return err
  }

  const maybe = error as { message?: string; context?: Response } | null
  if (maybe?.context && typeof maybe.context.json === 'function') {
    try {
      const body = await maybe.context.clone().json()
      if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
        return (body as { error: string }).error
      }
    } catch {
      // ignore parse failures
    }
  }

  return maybe?.message ?? 'AI request failed'
}

export async function invokeAiChat(input: {
  message: string
  context: string
  coachingStyle: string
  history: Array<{ role: 'user' | 'model'; text: string }>
  conversationId?: string | null
}): Promise<{ reply: string; model?: string; conversationId?: string | null }> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      message: input.message,
      context: input.context,
      coachingStyle: input.coachingStyle,
      history: input.history,
      conversationId: input.conversationId ?? null,
    },
  })

  if (error) {
    throw new AiApiError(await readInvokeError(error, data), 502)
  }
  if (!data || typeof data !== 'object' || typeof (data as { reply?: unknown }).reply !== 'string') {
    throw new AiApiError(await readInvokeError(null, data) || 'Empty coach reply', 502)
  }

  const payload = data as {
    reply: string
    model?: string
    conversationId?: string | null
    error?: string
  }
  if (payload.error) throw new AiApiError(payload.error, 502)
  return payload
}

export async function invokeMealScan(
  imageBase64: string,
): Promise<ScannedResult & { scanId?: string | null; model?: string }> {
  const { data, error } = await supabase.functions.invoke('meal-scan', {
    body: { imageBase64 },
  })

  if (error) {
    throw new AiApiError(await readInvokeError(error, data), 502)
  }
  if (!data || typeof data !== 'object') {
    throw new AiApiError('Empty meal scan response', 502)
  }

  const payload = data as ScannedResult & { error?: string; scanId?: string | null; model?: string }
  if (payload.error) throw new AiApiError(payload.error, 502)
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new AiApiError(
      'Walang na-detect na pagkain sa litrato. Subukan ang mas malinaw na picture.',
      422,
    )
  }
  return payload
}

export async function invokeNutritionCoach(input: {
  coachingStyle: string
  context: string
  remaining: { calories: number; protein: number; carbs: number; fat: number }
  favorites: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>
  budget?: 'low' | 'medium' | 'any'
}): Promise<{
  reply: string
  meals: Array<{
    name?: string
    meal_type?: string
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    notes?: string
  }>
  focus?: string | null
  model?: string
}> {
  const { data, error } = await supabase.functions.invoke('nutrition-coach', { body: input })
  if (error) throw new AiApiError(await readInvokeError(error, data), 502)
  const payload = data as { reply?: string; meals?: unknown[]; focus?: string | null; error?: string; model?: string }
  if (!payload || payload.error || typeof payload.reply !== 'string') {
    throw new AiApiError(payload?.error || (await readInvokeError(null, data)), 502)
  }
  return {
    reply: payload.reply,
    meals: Array.isArray(payload.meals) ? (payload.meals as never[]) : [],
    focus: payload.focus ?? null,
    model: payload.model,
  }
}

export async function invokeRoutineGenerator(input: {
  coachingStyle: string
  context: string
  profile: Record<string, unknown>
}): Promise<{
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
  week?: Array<{ day?: string; focus?: string; planName?: string | null; isRest?: boolean }>
  model?: string
}> {
  const { data, error } = await supabase.functions.invoke('routine-generator', { body: input })
  if (error) throw new AiApiError(await readInvokeError(error, data), 502)
  const payload = data as {
    summary?: string
    plans?: unknown[]
    week?: unknown[]
    error?: string
    model?: string
  }
  if (!payload || payload.error || !Array.isArray(payload.plans) || payload.plans.length === 0) {
    throw new AiApiError(payload?.error || 'Routine generator failed', 502)
  }
  return {
    summary: String(payload.summary ?? 'Routine generated.'),
    plans: payload.plans as never[],
    week: Array.isArray(payload.week) ? (payload.week as never[]) : [],
    model: payload.model,
  }
}

export async function invokeProgressAnalysis(input: {
  coachingStyle: string
  context: string
  periodDays: 30 | 60 | 90
  workouts: unknown[]
  weights: unknown[]
  nutritionDays: unknown[]
  checklistStats: Record<string, number>
}): Promise<{
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
  reportId?: string | null
  model?: string
}> {
  const { data, error } = await supabase.functions.invoke('progress-analysis', { body: input })
  if (error) throw new AiApiError(await readInvokeError(error, data), 502)
  const payload = data as {
    period_days?: number
    summary?: string
    error?: string
    [key: string]: unknown
  }
  if (!payload || payload.error || typeof payload.summary !== 'string') {
    throw new AiApiError(payload?.error || 'Progress analysis failed', 502)
  }
  return payload as never
}
