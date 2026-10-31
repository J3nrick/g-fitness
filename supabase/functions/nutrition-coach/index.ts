import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts"
import { callClaude, getAnthropicApiKey, parseClaudeErrorMessage } from "../_shared/claude.ts"

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
    if (/ANTHROPIC_API_KEY/.test(msg)) {
      return errorResponse("ANTHROPIC_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.", 500)
    }
    return errorResponse(msg, 500)
  }
})
