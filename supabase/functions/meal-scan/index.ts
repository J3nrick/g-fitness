import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts"
import { callGeminiGenerate, getGeminiApiKey, parseGeminiErrorMessage } from "../_shared/gemini.ts"

const SYSTEM_PROMPT = `You are a precise nutrition AI. Analyze this food image.
Identify EACH distinct food item visible and estimate weight and macros for each.
Recognize Filipino/Asian dishes: Adobo, Sinigang, Tinola, Kare-Kare, Caldereta, Menudo,
Sisig, Bicol Express, Lumpia, Pancit, Halo-Halo, Lechon, Tapsilog, Longsilog, Tocilog,
Bangsilog, Liempo, Samgyupsal, Tokwa't Baboy, Laing, Pinakbet, Bulalo, Arroz Caldo, etc.

Respond ONLY with valid JSON matching this structure:
{
  "items": [
    {
      "food_name": "string",
      "estimated_grams": number,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "sugar": number,
      "confidence": number
    }
  ]
}
confidence is 0-100. Do not include markdown, text, or explanations outside the JSON.`

interface MealScanBody {
  imageBase64?: string
  mimeType?: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405)
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401)
    }

    let body: MealScanBody
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const raw = body.imageBase64?.trim()
    if (!raw) {
      return errorResponse("imageBase64 is required", 400)
    }

    const pureBase64 = raw.replace(/^data:image\/[\w+.-]+;base64,/, "")
    const mimeMatch = raw.match(/^data:(image\/[\w+.-]+);base64,/)
    const mimeType = body.mimeType ?? mimeMatch?.[1] ?? "image/jpeg"

    if (pureBase64.length < 100) {
      return errorResponse("Image data too small", 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    if (!supabaseUrl || !anonKey) {
      return errorResponse("Supabase env missing", 500)
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const apiKey = getGeminiApiKey()
    const result = await callGeminiGenerate({
      apiKey,
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType,
                data: pureBase64,
              },
            },
          ],
        },
      ],
    })

    if (!result.ok) {
      return errorResponse(parseGeminiErrorMessage(result.status, result.body), result.status === 429 ? 429 : 502)
    }

    let parsed: unknown
    try {
      const cleaned = result.text.replace(/```json\s*|```/g, "").trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return errorResponse("Malformed JSON from vision model", 502, { raw: result.text.slice(0, 200) })
    }

    const obj = parsed as Record<string, unknown>
    const list = (obj.items ?? obj.foods ?? []) as unknown[]
    if (!Array.isArray(list)) {
      return errorResponse("Vision response missing items array", 502)
    }

    const items = list
      .map((entry) => {
        const e = entry as Record<string, unknown>
        const confidenceRaw = Number(e.confidence ?? 80)
        const name = String(e.food_name ?? e.name ?? "").trim()
        return {
          food_name: name || "Unknown food",
          estimated_grams: Math.max(1, Math.round(Number(e.estimated_grams ?? e.grams ?? 100))),
          calories: Math.max(0, Math.round(Number(e.calories ?? 0))),
          protein: Math.max(0, Math.round(Number(e.protein ?? 0))),
          carbs: Math.max(0, Math.round(Number(e.carbs ?? 0))),
          fat: Math.max(0, Math.round(Number(e.fat ?? 0))),
          fiber: Math.max(0, Math.round(Number(e.fiber ?? 0))),
          sugar: Math.max(0, Math.round(Number(e.sugar ?? 0))),
          confidence: confidenceRaw <= 1 ? Math.round(confidenceRaw * 100) : Math.round(confidenceRaw),
        }
      })
      .filter((i) => i.food_name !== "Unknown food")

    if (items.length === 0) {
      return errorResponse("Walang na-detect na pagkain sa litrato. Subukan ang mas malinaw na picture.", 422)
    }

    const totals = items.reduce(
      (acc, i) => {
        acc.total_calories += i.calories
        acc.total_protein += i.protein
        acc.total_carbs += i.carbs
        acc.total_fat += i.fat
        return acc
      },
      { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 },
    )

    let scanId: string | null = null
    if (user) {
      try {
        const { data: scan } = await supabase
          .from("meal_scans")
          .insert({
            user_id: user.id,
            model: result.model,
            result: { items, ...totals },
            confirmed: false,
          })
          .select("id")
          .single()
        scanId = scan?.id ?? null
      } catch (persistErr) {
        console.error("meal-scan persist warning:", persistErr)
      }
    }

    return jsonResponse({
      items,
      ...totals,
      model: result.model,
      scanId,
      authenticated: Boolean(user),
    })
  } catch (err) {
    console.error("meal-scan error:", err)
    const msg = err instanceof Error ? err.message : "Unexpected server error"
    if (/GEMINI_API_KEY/.test(msg)) {
      return errorResponse(
        "GEMINI_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.",
        500,
      )
    }
    return errorResponse(msg, 500)
  }
})
