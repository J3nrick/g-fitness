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

interface ProfileInput {
  goal?: string
  experience?: string
  location?: string
  equipment?: string[]
  days_per_week?: number
  duration_mins?: number
  injuries?: string
  preferred_days?: string[]
}

interface RoutineBody {
  coachingStyle?: string
  context?: string
  profile?: ProfileInput
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return errorResponse("Missing Authorization header", 401)

    let body: RoutineBody
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const profile = body.profile ?? {}
    const days = Math.min(6, Math.max(2, Number(profile.days_per_week) || 3))
    const duration = Number(profile.duration_mins) || 45
    const style = body.coachingStyle ?? "tropa"
    const context = (body.context ?? "").trim()

    const system = `You are G! Strength Coach. Build a complete, safe workout routine.
Style: ${style}.
Use evidence-based programming. Match experience and equipment. Respect injuries.
Prefer compound lifts when gym equipment exists; bodyweight/bands for home.
Return ONLY valid JSON:
{
  "summary": "short explanation",
  "days_per_week": number,
  "plans": [
    {
      "name": "string",
      "description": "string",
      "items": [
        {
          "exercise_name": "string",
          "sets": number,
          "reps": number,
          "weight": number,
          "rest_seconds": number,
          "notes": "string"
        }
      ]
    }
  ],
  "week": [
    {
      "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
      "focus": "string",
      "planName": "string|null",
      "isRest": boolean
    }
  ]
}
Rules:
- Create exactly ${days} training plans (unique names).
- Each plan: 4-7 exercises fitting ~${duration} minutes.
- week array must include all 7 weekdays.
- planName must match a plans[].name or null on rest days.
- weight can be 0 if unknown bodyweight movement.
- Never invent medical claims.`

    const userPrompt = [
      "USER CONTEXT:",
      context || "(none)",
      "",
      "PROFILE:",
      JSON.stringify(profile),
      "",
      `Build a ${days}-day routine for ~${duration} min sessions.`,
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
      return errorResponse("Malformed routine JSON", 502)
    }

    const plans = Array.isArray(parsed.plans) ? parsed.plans : []
    const week = Array.isArray(parsed.week) ? parsed.week : []
    if (plans.length === 0) return errorResponse("Routine generator returned no plans", 502)

    const summary = String(parsed.summary ?? "Generated a fresh routine based on your profile.")

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          await supabase.from("ai_reports").insert({
            user_id: user.id,
            kind: "routine",
            period_days: 7,
            payload: { summary, plans, week, profile, model: result.model },
          })
        } catch (e) {
          console.error("routine-generator persist warning:", e)
        }
      }
    }

    return jsonResponse({
      summary,
      days_per_week: Number(parsed.days_per_week) || days,
      plans,
      week,
      model: result.model,
    })
  } catch (err) {
    console.error("routine-generator error:", err)
    const msg = err instanceof Error ? err.message : "Unexpected server error"
    if (/ANTHROPIC_API_KEY/.test(msg)) {
      return errorResponse("ANTHROPIC_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.", 500)
    }
    return errorResponse(msg, 500)
  }
})
