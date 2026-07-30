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

interface NutritionBody {
  coachingStyle?: string
  context?: string
  remaining?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  favorites?: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>
  budget?: "low" | "medium" | "any"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return errorResponse("Missing Authorization header", 401)

    let body: NutritionBody
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const style = body.coachingStyle ?? "tropa"
    const remaining = body.remaining ?? {}
    const favorites = Array.isArray(body.favorites) ? body.favorites.slice(0, 12) : []
    const budget = body.budget ?? "any"
    const context = (body.context ?? "").trim()

    const system = `You are G! Nutrition Coach for a Filipino fitness app.
Style: ${style}. Prefer practical Filipino meals when possible (rice, chicken, eggs, tofu, fish, veggies, carinderia-friendly).
Never invent the user's logged meals or remaining macros — use the numbers provided.
Return ONLY valid JSON:
{
  "reply": "short coaching message",
  "meals": [
    {
      "name": "string",
      "meal_type": "breakfast|lunch|dinner|snack",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "notes": "string"
    }
  ],
  "focus": "what to prioritize next (protein/calories/fiber/etc)"
}
Suggest 2-4 meals/snacks that fit remaining macros. Keep totals realistic.`

    const userPrompt = [
      "USER CONTEXT:",
      context || "(none)",
      "",
      "REMAINING MACROS TODAY:",
      JSON.stringify(remaining),
      "",
      "FAVORITE FOODS:",
      JSON.stringify(favorites),
      "",
      `BUDGET: ${budget}`,
      "",
      "Suggest meals that help hit remaining protein/calories without blowing macros.",
    ].join("\n")

    const apiKey = getGeminiApiKey()
    const result = await callGeminiGenerate({
      apiKey,
      systemPrompt: system,
      temperature: 0.5,
      maxOutputTokens: 1200,
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
      return errorResponse("Malformed nutrition JSON", 502)
    }

    const meals = Array.isArray(parsed.meals) ? parsed.meals : []
    const reply = String(parsed.reply ?? "Here's a practical meal plan for what's left today.")

    // Auth optional — demo mode may not have a user
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
            kind: "nutrition",
            period_days: 1,
            payload: { reply, meals, remaining, focus: parsed.focus, model: result.model },
          })
        } catch (e) {
          console.error("nutrition-coach persist warning:", e)
        }
      }
    }

    return jsonResponse({
      reply,
      meals,
      focus: parsed.focus ?? null,
      remaining,
      model: result.model,
    })
  } catch (err) {
    console.error("nutrition-coach error:", err)
    const msg = err instanceof Error ? err.message : "Unexpected server error"
    if (/GEMINI_API_KEY/.test(msg)) {
      return errorResponse("GEMINI_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.", 500)
    }
    return errorResponse(msg, 500)
  }
})
