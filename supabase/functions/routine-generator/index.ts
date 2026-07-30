import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts"
import { callGeminiGenerate, getGeminiApiKey, parseGeminiErrorMessage } from "../_shared/gemini.ts"

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

    const apiKey = getGeminiApiKey()
    const result = await callGeminiGenerate({
      apiKey,
      systemPrompt: system,
      temperature: 0.4,
      maxOutputTokens: 2500,
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
    if (/GEMINI_API_KEY/.test(msg)) {
      return errorResponse("GEMINI_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.", 500)
    }
    return errorResponse(msg, 500)
  }
})
