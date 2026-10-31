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

import Anthropic from "npm:@anthropic-ai/sdk"

export const CLAUDE_MODEL = "claude-opus-5-5"

type Part = { text?: string; inlineData?: { mimeType: string; data: string } }
type Content = { role: string; parts: Part[] }

export function getAnthropicApiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY")?.trim()
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY secret is not set on this Supabase project")
  }
  return key
}

function toMessages(contents: Content[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []
  for (const c of contents) {
    const role = c.role === "user" ? "user" : "assistant"
    const blocks: Anthropic.ContentBlockParam[] = []
    for (const p of c.parts) {
      if (p.inlineData) {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: p.inlineData.mimeType as Anthropic.Base64ImageSource["media_type"],
            data: p.inlineData.data,
          },
        })
      } else if (p.text) {
        blocks.push({ type: "text", text: p.text })
      }
    }
    if (blocks.length) messages.push({ role, content: blocks })
  }
  // API requires the first turn to be from the user
  while (messages.length && messages[0].role !== "user") messages.shift()
  return messages
}

/** Calls Claude. `contents` uses the user/model + parts shape the edge functions already build. */
export async function callClaude(opts: {
  apiKey: string
  systemPrompt?: string
  contents: Content[]
  json?: boolean
  maxTokens?: number
  effort?: "low" | "medium" | "high"
}): Promise<{ ok: true; text: string; model: string } | { ok: false; status: number; body: string }> {
  const client = new Anthropic({ apiKey: opts.apiKey })
  const system = [
    opts.systemPrompt ?? "",
    opts.json ? "Respond with ONLY valid JSON. No markdown fences, no commentary." : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const message = await client.messages
      .stream({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens ?? 16000,
        output_config: { effort: opts.effort ?? "low" },
        ...(system ? { system } : {}),
        messages: toMessages(opts.contents),
      })
      .finalMessage()

    if (message.stop_reason === "refusal") {
      return { ok: false, status: 400, body: JSON.stringify({ error: { message: "Claude declined this request." } }) }
    }
    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
    if (!text) return { ok: false, status: 502, body: "Empty model response" }
    return { ok: true, text, model: message.model }
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return { ok: false, status: err.status ?? 500, body: JSON.stringify({ error: { message: err.message } }) }
    }
    return { ok: false, status: 500, body: err instanceof Error ? err.message : "Claude request failed" }
  }
}

export function parseClaudeErrorMessage(status: number, body: string): string {
  if (status === 429) return "Rate limit. Hintayin mo sandali tapos try again."
  if (status === 401 || status === 403) return "Anthropic API key rejected. Check ANTHROPIC_API_KEY secret."
  try {
    const json = JSON.parse(body) as { error?: { message?: string } }
    return (json.error?.message ?? body).slice(0, 200)
  } catch {
    return body.slice(0, 200) || `Claude error ${status}`
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

    const apiKey = getAnthropicApiKey()
    const result = await callClaude({
      apiKey,
      systemPrompt: system,
      maxTokens: 16000,
      json: true,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    })

    if (!result.ok) {
      return errorResponse(parseClaudeErrorMessage(result.status, result.body), result.status === 429 ? 429 : 502)
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
    if (/ANTHROPIC_API_KEY/.test(msg)) {
      return errorResponse("ANTHROPIC_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.", 500)
    }
    return errorResponse(msg, 500)
  }
})
