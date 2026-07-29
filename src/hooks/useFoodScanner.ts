import { useState } from 'react'

export interface ScannedFood {
  food_name: string
  estimated_grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: number
}

export interface ScannedResult {
  items: ScannedFood[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

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
      "confidence": number
    }
  ]
}
confidence is 0-100. Do not include markdown, text, or explanations outside the JSON.`

/** Current Flash models that work with Google AI Studio keys. */
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
]

function normalizeItems(raw: unknown): ScannedFood[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const list = (obj.items ?? obj.foods ?? []) as unknown[]
  if (!Array.isArray(list)) return []

  return list
    .map((entry) => {
      const e = entry as Record<string, unknown>
      const confidenceRaw = Number(e.confidence ?? 80)
      return {
        food_name: String(e.food_name ?? e.name ?? 'Unknown food'),
        estimated_grams: Math.max(1, Math.round(Number(e.estimated_grams ?? e.estimated_weight_grams ?? e.grams ?? 100))),
        calories: Math.max(0, Math.round(Number(e.calories ?? 0))),
        protein: Math.max(0, Math.round(Number(e.protein ?? 0))),
        carbs: Math.max(0, Math.round(Number(e.carbs ?? 0))),
        fat: Math.max(0, Math.round(Number(e.fat ?? 0))),
        confidence: confidenceRaw <= 1 ? Math.round(confidenceRaw * 100) : Math.round(confidenceRaw),
      }
    })
    .filter((i) => i.food_name && i.food_name !== 'Unknown food')
}

function getMimeType(base64Image: string): string {
  const match = base64Image.match(/^data:(image\/[\w+.-]+);base64,/)
  return match?.[1] ?? 'image/jpeg'
}

async function callGemini(
  apiKey: string,
  model: string,
  base64Image: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const pureBase64 = base64Image.replace(/^data:image\/[\w+.-]+;base64,/, '')
  const mimeType = getMimeType(base64Image)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: pureBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  })

  const body = await response.text()
  if (!response.ok) return { ok: false, status: response.status, body }

  try {
    const data = JSON.parse(body)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { ok: false, status: 200, body: 'Empty model response' }
    return { ok: true, text }
  } catch {
    return { ok: false, status: response.status, body: body.slice(0, 300) }
  }
}

export function useFoodScanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function scanFoodImage(base64Image: string): Promise<ScannedResult | null> {
    setLoading(true)
    setError(null)

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
    if (!apiKey) {
      setError('Walang Gemini API key. Lagyan mo ng VITE_GEMINI_API_KEY sa .env.local')
      setLoading(false)
      return null
    }

    try {
      let lastError = ''
      for (const model of GEMINI_MODELS) {
        const result = await callGemini(apiKey, model, base64Image)
        if (!result.ok) {
          lastError = `API ${result.status}: ${result.body.slice(0, 180)}`
          // Invalid key / permission — don't bother trying other models
          if (result.status === 400 || result.status === 401 || result.status === 403) {
            break
          }
          continue
        }

        const cleaned = result.text.replace(/```json\s*|```/g, '').trim()
        const parsed = JSON.parse(cleaned) as unknown
        const items = normalizeItems(parsed)

        if (items.length === 0) {
          lastError = 'Walang na-detect na pagkain sa litrato.'
          continue
        }

        setLoading(false)
        return {
          items,
          total_calories: items.reduce((s, i) => s + i.calories, 0),
          total_protein: items.reduce((s, i) => s + i.protein, 0),
          total_carbs: items.reduce((s, i) => s + i.carbs, 0),
          total_fat: items.reduce((s, i) => s + i.fat, 0),
        }
      }

      console.error('Lamon Scan error:', lastError)
      if (lastError.includes('API key') || lastError.includes('401') || lastError.includes('403')) {
        setError('Invalid Gemini API key. Check VITE_GEMINI_API_KEY sa .env.local')
      } else {
        setError('Di mabasa yung pagkain. Subukan mo ulit picturan nang malinaw.')
      }
      setLoading(false)
      return null
    } catch (err) {
      console.error('Lamon Scan error:', err)
      setError('Di mabasa yung pagkain. Subukan mo ulit picturan nang malinaw.')
      setLoading(false)
      return null
    }
  }

  return { scanFoodImage, loading, error }
}
