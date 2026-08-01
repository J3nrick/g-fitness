import { supabase } from './supabase'
import type { ScannedResult } from '../hooks/useFoodScanner'
import { buildSystemPrompt } from './coachContext'
import {
  callGeminiClient,
  getClientGeminiKey,
  parseClientGeminiError,
} from './geminiClient'

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
      // ignore
    }
  }

  return maybe?.message ?? 'AI request failed'
}

function shouldFallbackToClient(message: string): boolean {
  return /GEMINI_API_KEY|Missing Authorization|secret is missing|Edge Function|non-2xx|Failed to send/i.test(
    message,
  )
}

async function tryEdge<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body })
    if (error) return { ok: false, message: await readInvokeError(error, data) }
    if (data && typeof data === 'object' && 'error' in data && (data as { error?: unknown }).error) {
      return { ok: false, message: String((data as { error: unknown }).error) }
    }
    return { ok: true, data: data as T }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Edge invoke failed' }
  }
}

export async function invokeAiChat(input: {
  message: string
  context: string
  coachingStyle: string
  history: Array<{ role: 'user' | 'model'; text: string }>
  conversationId?: string | null
}): Promise<{ reply: string; model?: string; conversationId?: string | null }> {
  const edge = await tryEdge<{
    reply?: string
    model?: string
    conversationId?: string | null
    error?: string
  }>('ai-chat', {
    message: input.message,
    context: input.context,
    coachingStyle: input.coachingStyle,
    history: input.history,
    conversationId: input.conversationId ?? null,
  })

  if (edge.ok && typeof edge.data.reply === 'string') {
    return {
      reply: edge.data.reply,
      model: edge.data.model,
      conversationId: edge.data.conversationId ?? null,
    }
  }

  const edgeMsg = edge.ok ? edge.data.error || 'Empty coach reply' : edge.message
  if (!shouldFallbackToClient(edgeMsg) && getClientGeminiKey()) {
    // still try client if we have a key and edge failed for any reason in demo
  }
  if (!getClientGeminiKey()) {
    throw new AiApiError(
      edgeMsg.includes('GEMINI')
        ? edgeMsg
        : `${edgeMsg} — Set GEMINI_API_KEY in Supabase Secrets, or VITE_GEMINI_API_KEY in .env.local.`,
      502,
    )
  }

  const result = await callGeminiClient({
    systemPrompt: buildSystemPrompt(),
    temperature: 0.7,
    maxOutputTokens: 1024,
    contents: [
      ...input.history.slice(-12).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      {
        role: 'user',
        parts: [
          {
            text:
              `USER DATA CONTEXT (facts only — do not invent beyond this):\n\n${input.context}\n\n` +
              `---\nUSER MESSAGE:\n${input.message}`,
          },
        ],
      },
    ],
  })

  if (!result.ok) {
    throw new AiApiError(parseClientGeminiError(result.status, result.body), result.status)
  }
  return { reply: result.text, model: result.model, conversationId: null }
}

const MEAL_SCAN_PROMPT = `You are a precise nutrition AI. Analyze this food image.
Identify EACH distinct food item visible and estimate weight and macros for each.
Recognize Filipino/Asian dishes.
Respond ONLY with valid JSON:
{"items":[{"food_name":"string","estimated_grams":number,"calories":number,"protein":number,"carbs":number,"fat":number,"confidence":number}]}
confidence is 0-100.`

export async function invokeMealScan(
  imageBase64: string,
): Promise<ScannedResult & { scanId?: string | null; model?: string }> {
  const edge = await tryEdge<ScannedResult & { error?: string; scanId?: string | null; model?: string }>(
    'meal-scan',
    { imageBase64 },
  )

  if (edge.ok && Array.isArray(edge.data.items) && edge.data.items.length > 0) {
    return edge.data
  }

  const edgeMsg = edge.ok
    ? edge.data.error || 'Empty meal scan response'
    : edge.message

  if (!getClientGeminiKey()) {
    throw new AiApiError(
      `${edgeMsg} — Set GEMINI_API_KEY in Supabase Secrets, or VITE_GEMINI_API_KEY in .env.local.`,
      502,
    )
  }

  const pureBase64 = imageBase64.replace(/^data:image\/[\w+.-]+;base64,/, '')
  const mimeMatch = imageBase64.match(/^data:(image\/[\w+.-]+);base64,/)
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

  const result = await callGeminiClient({
    temperature: 0.2,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    contents: [
      {
        role: 'user',
        parts: [
          { text: MEAL_SCAN_PROMPT },
          { inlineData: { mimeType, data: pureBase64 } },
        ],
      },
    ],
  })

  if (!result.ok) {
    throw new AiApiError(parseClientGeminiError(result.status, result.body), result.status)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(result.text.replace(/```json\s*|```/g, '').trim()) as Record<string, unknown>
  } catch {
    throw new AiApiError('Malformed JSON from vision model', 502)
  }

  const list = (parsed.items ?? parsed.foods ?? []) as unknown[]
  if (!Array.isArray(list)) throw new AiApiError('Vision response missing items', 502)

  const items = list
    .map((entry) => {
      const e = entry as Record<string, unknown>
      const confidenceRaw = Number(e.confidence ?? 80)
      const name = String(e.food_name ?? e.name ?? '').trim()
      return {
        food_name: name || 'Unknown food',
        estimated_grams: Math.max(1, Math.round(Number(e.estimated_grams ?? e.grams ?? 100))),
        calories: Math.max(0, Math.round(Number(e.calories ?? 0))),
        protein: Math.max(0, Math.round(Number(e.protein ?? 0))),
        carbs: Math.max(0, Math.round(Number(e.carbs ?? 0))),
        fat: Math.max(0, Math.round(Number(e.fat ?? 0))),
        confidence: confidenceRaw <= 1 ? Math.round(confidenceRaw * 100) : Math.round(confidenceRaw),
      }
    })
    .filter((i) => i.food_name !== 'Unknown food')

  if (items.length === 0) {
    throw new AiApiError('Walang na-detect na pagkain sa litrato. Subukan ang mas malinaw na picture.', 422)
  }

  return {
    items,
    total_calories: items.reduce((s, i) => s + i.calories, 0),
    total_protein: items.reduce((s, i) => s + i.protein, 0),
    total_carbs: items.reduce((s, i) => s + i.carbs, 0),
    total_fat: items.reduce((s, i) => s + i.fat, 0),
    model: result.model,
    scanId: null,
  }
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
  const edge = await tryEdge<{
    reply?: string
    meals?: unknown[]
    focus?: string | null
    error?: string
    model?: string
  }>('nutrition-coach', input)

  if (edge.ok && typeof edge.data.reply === 'string') {
    return {
      reply: edge.data.reply,
      meals: Array.isArray(edge.data.meals) ? (edge.data.meals as never[]) : [],
      focus: edge.data.focus ?? null,
      model: edge.data.model,
    }
  }

  if (!getClientGeminiKey()) {
    throw new AiApiError(edge.ok ? edge.data.error || 'Nutrition coach failed' : edge.message, 502)
  }

  const result = await callGeminiClient({
    temperature: 0.5,
    maxOutputTokens: 1200,
    responseMimeType: 'application/json',
    systemPrompt: `You are G! Nutrition Coach. Style: ${input.coachingStyle}. Prefer Filipino meals. Return ONLY JSON: {"reply":"string","meals":[{"name":"string","meal_type":"breakfast|lunch|dinner|snack","calories":number,"protein":number,"carbs":number,"fat":number,"notes":"string"}],"focus":"string"}`,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `CONTEXT:\n${input.context}\n\nREMAINING:${JSON.stringify(input.remaining)}\nFAVORITES:${JSON.stringify(input.favorites)}\nBUDGET:${input.budget ?? 'any'}`,
          },
        ],
      },
    ],
  })
  if (!result.ok) throw new AiApiError(parseClientGeminiError(result.status, result.body), result.status)
  const parsed = JSON.parse(result.text.replace(/```json\s*|```/g, '').trim()) as {
    reply?: string
    meals?: unknown[]
    focus?: string
  }
  return {
    reply: String(parsed.reply ?? 'Meal ideas ready.'),
    meals: Array.isArray(parsed.meals) ? (parsed.meals as never[]) : [],
    focus: parsed.focus ?? null,
    model: result.model,
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
  const edge = await tryEdge<{
    summary?: string
    plans?: unknown[]
    week?: unknown[]
    error?: string
    model?: string
  }>('routine-generator', input)

  if (edge.ok && Array.isArray(edge.data.plans) && edge.data.plans.length > 0) {
    return {
      summary: String(edge.data.summary ?? 'Routine generated.'),
      plans: edge.data.plans as never[],
      week: Array.isArray(edge.data.week) ? (edge.data.week as never[]) : [],
      model: edge.data.model,
    }
  }

  if (!getClientGeminiKey()) {
    throw new AiApiError(edge.ok ? edge.data.error || 'Routine generator failed' : edge.message, 502)
  }

  const days = Number(input.profile.days_per_week) || 3
  const duration = Number(input.profile.duration_mins) || 45
  const result = await callGeminiClient({
    temperature: 0.4,
    maxOutputTokens: 2500,
    responseMimeType: 'application/json',
    systemPrompt: `You are G! Strength Coach. Style: ${input.coachingStyle}. Return ONLY JSON with summary, plans[${days}], week[7 days]. Each plan 4-7 exercises for ~${duration} min.`,
    contents: [
      {
        role: 'user',
        parts: [{ text: `CONTEXT:\n${input.context}\n\nPROFILE:${JSON.stringify(input.profile)}` }],
      },
    ],
  })
  if (!result.ok) throw new AiApiError(parseClientGeminiError(result.status, result.body), result.status)
  const parsed = JSON.parse(result.text.replace(/```json\s*|```/g, '').trim()) as {
    summary?: string
    plans?: unknown[]
    week?: unknown[]
  }
  if (!Array.isArray(parsed.plans) || parsed.plans.length === 0) {
    throw new AiApiError('Routine generator returned no plans', 502)
  }
  return {
    summary: String(parsed.summary ?? 'Routine generated.'),
    plans: parsed.plans as never[],
    week: Array.isArray(parsed.week) ? (parsed.week as never[]) : [],
    model: result.model,
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
  const edge = await tryEdge<{
    period_days?: number
    summary?: string
    error?: string
    [key: string]: unknown
  }>('progress-analysis', input)

  if (edge.ok && typeof edge.data.summary === 'string') {
    return edge.data as never
  }

  if (!getClientGeminiKey()) {
    throw new AiApiError(edge.ok ? edge.data.error || 'Progress analysis failed' : edge.message, 502)
  }

  const result = await callGeminiClient({
    temperature: 0.4,
    maxOutputTokens: 1600,
    responseMimeType: 'application/json',
    systemPrompt: `You are G! Progress Analyst. Style: ${input.coachingStyle}. Never invent data. Return ONLY JSON: period_days, summary, consistency, strength, nutrition, recovery, achievements[], missed_goals[], recommendations[], score.`,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Analyze last ${input.periodDays} days.\nCONTEXT:\n${input.context}\nWORKOUTS:${JSON.stringify(input.workouts.slice(0, 40))}\nWEIGHTS:${JSON.stringify(input.weights.slice(0, 40))}\nNUTRITION:${JSON.stringify(input.nutritionDays.slice(0, 40))}\nCHECKLIST:${JSON.stringify(input.checklistStats)}`,
          },
        ],
      },
    ],
  })
  if (!result.ok) throw new AiApiError(parseClientGeminiError(result.status, result.body), result.status)
  const parsed = JSON.parse(result.text.replace(/```json\s*|```/g, '').trim()) as Record<string, unknown>
  return {
    period_days: Number(parsed.period_days) || input.periodDays,
    summary: String(parsed.summary ?? 'Progress report ready.'),
    consistency: String(parsed.consistency ?? ''),
    strength: String(parsed.strength ?? ''),
    nutrition: String(parsed.nutrition ?? ''),
    recovery: String(parsed.recovery ?? ''),
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements.map(String) : [],
    missed_goals: Array.isArray(parsed.missed_goals) ? parsed.missed_goals.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map(String).slice(0, 5)
      : [],
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 50)))),
    reportId: null,
    model: result.model,
  }
}
