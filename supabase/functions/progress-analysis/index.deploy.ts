import "jsr:@supabase/functions-js/edge-runtime.d.ts"
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return jsonResponse({ error: message, ...extra }, status)
}

const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

export function getGeminiApiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY')?.trim()
  if (!key) {
    throw new Error('GEMINI_API_KEY secret is not set on this Supabase project')
  }
  return key
}

export async function callGeminiGenerate(opts: {
  apiKey: string
  systemPrompt?: string
  contents: unknown[]
  responseMimeType?: string
  temperature?: number
  maxOutputTokens?: number
}): Promise<{ ok: true; text: string; model: string } | { ok: false; status: number; body: string }> {
  let lastStatus = 500
  let lastBody = 'No model available'

  for (const model of GEMINI_MODELS) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
      `?key=${encodeURIComponent(opts.apiKey)}`

    const body: Record<string, unknown> = {
      contents: opts.contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
        ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
      },
    }
    if (opts.systemPrompt) {
      body.systemInstruction = { parts: [{ text: opts.systemPrompt }] }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const textBody = await response.text()
    if (!response.ok) {
      lastStatus = response.status
      lastBody = textBody
      // Auth failures stop; rate limits try next model
      if (response.status === 401 || response.status === 403) {
        return { ok: false, status: response.status, body: textBody }
      }
      if (response.status === 400 && /API key/i.test(textBody)) {
        return { ok: false, status: response.status, body: textBody }
      }
      continue
    }

    try {
      const data = JSON.parse(textBody) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        promptFeedback?: { blockReason?: string }
      }
      if (data.promptFeedback?.blockReason) {
        return {
          ok: false,
          status: 400,
          body: JSON.stringify({ error: { message: `Blocked: ${data.promptFeedback.blockReason}` } }),
        }
      }
      const text =
        data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      if (!text.trim()) {
        lastStatus = 200
        lastBody = 'Empty model response'
        continue
      }
      return { ok: true, text: text.trim(), model }
    } catch {
      lastStatus = response.status
      lastBody = textBody.slice(0, 300)
    }
  }

  return { ok: false, status: lastStatus, body: lastBody }
}

export function parseGeminiErrorMessage(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } }
    const msg = json.error?.message ?? body
    if (status === 429) return 'Rate limit / quota. Hintayin mo sandali tapos try again.'
    if (status === 401 || status === 403) return 'Gemini API key rejected. Check GEMINI_API_KEY secret.'
    return msg.slice(0, 200)
  } catch {
    if (status === 429) return 'Rate limit / quota. Hintayin mo sandali tapos try again.'
    return `Gemini error ${status}`
  }
}

import { createClient } from "npm:@supabase/supabase-js@2"

interface ProgressBody {
  coachingStyle?: string
  context?: string
  periodDays?: 30 | 60 | 90
  workouts?: unknown[]
  weights?: unknown[]
  nutritionDays?: unknown[]
  checklistStats?: {
    workoutDays?: number
    proteinHits?: number
    waterHits?: number
    sleepHits?: number
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return errorResponse("Missing Authorization header", 401)

    let body: ProgressBody
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const periodDays = ([30, 60, 90].includes(Number(body.periodDays))
      ? Number(body.periodDays)
      : 30) as 30 | 60 | 90
    const style = body.coachingStyle ?? "tropa"
    const context = (body.context ?? "").trim()

    const system = `You are G! Progress Analyst for a Filipino fitness coach app.
Style: ${style}.
Analyze only the supplied data. Never invent workouts, weights, or streaks.
Return ONLY valid JSON:
{
  "period_days": number,
  "summary": "2-4 sentence overall report",
  "consistency": "string",
  "strength": "string",
  "nutrition": "string",
  "recovery": "string",
  "achievements": ["string"],
  "missed_goals": ["string"],
  "recommendations": ["string"],
  "score": number
}
score is 0-100 for overall adherence/progress quality.
Keep recommendations concrete and actionable (max 5).`

    const userPrompt = [
      `Analyze the last ${periodDays} days.`,
      "",
      "USER CONTEXT:",
      context || "(none)",
      "",
      "WORKOUT HISTORY:",
      JSON.stringify((body.workouts ?? []).slice(0, 40)),
      "",
      "WEIGHT LOG:",
      JSON.stringify((body.weights ?? []).slice(0, 40)),
      "",
      "NUTRITION SNAPSHOTS:",
      JSON.stringify((body.nutritionDays ?? []).slice(0, 40)),
      "",
      "CHECKLIST STATS:",
      JSON.stringify(body.checklistStats ?? {}),
    ].join("\n")

    const apiKey = getGeminiApiKey()
    const result = await callGeminiGenerate({
      apiKey,
      systemPrompt: system,
      temperature: 0.4,
      maxOutputTokens: 1600,
      responseMimeType: "application/json",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    })

    if (!result.ok) {
      return errorResponse(parseGeminiErrorMessage(result.status, result.body), result.status === 429 ? 429 : 502)
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(result.text.replace(/```json\s*|```/g, "").trim()) as Record<string, unknown>
    } catch {
      return errorResponse("Malformed progress JSON", 502)
    }

    const report = {
      period_days: Number(parsed.period_days) || periodDays,
      summary: String(parsed.summary ?? "Progress report ready."),
      consistency: String(parsed.consistency ?? ""),
      strength: String(parsed.strength ?? ""),
      nutrition: String(parsed.nutrition ?? ""),
      recovery: String(parsed.recovery ?? ""),
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.map(String) : [],
      missed_goals: Array.isArray(parsed.missed_goals) ? parsed.missed_goals.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String).slice(0, 5)
        : [],
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 50)))),
    }

    let reportId: string | null = null
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const { data } = await supabase
            .from("ai_reports")
            .insert({
              user_id: user.id,
              kind: periodDays >= 90 ? "monthly" : "weekly",
              period_days: periodDays,
              payload: { ...report, model: result.model },
            })
            .select("id")
            .single()
          reportId = data?.id ?? null
        } catch (e) {
          console.error("progress-analysis persist warning:", e)
        }
      }
    }

    return jsonResponse({ ...report, reportId, model: result.model })
  } catch (err) {
    console.error("progress-analysis error:", err)
    const msg = err instanceof Error ? err.message : "Unexpected server error"
    if (/GEMINI_API_KEY/.test(msg)) {
      return errorResponse("GEMINI_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.", 500)
    }
    return errorResponse(msg, 500)
  }
})
