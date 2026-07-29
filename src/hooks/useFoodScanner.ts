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
      "confidence": number (0-100)
    }
  ]
}
Do not include markdown, text, or explanations outside the JSON.`

export function useFoodScanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function scanFoodImage(base64Image: string): Promise<ScannedResult | null> {
    setLoading(true)
    setError(null)

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setError('Walang Gemini API key. Lagyan mo ng VITE_GEMINI_API_KEY sa .env.local')
      setLoading(false)
      return null
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    try {
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
                    mime_type: 'image/jpeg',
                    data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
          },
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`API ${response.status}: ${errBody.slice(0, 200)}`)
      }

      const data = await response.json()
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) throw new Error('Walang response mula sa AI.')

      const parsed = JSON.parse(rawText) as { items: ScannedFood[] }
      const items = parsed.items ?? []

      const result: ScannedResult = {
        items,
        total_calories: items.reduce((s, i) => s + i.calories, 0),
        total_protein: items.reduce((s, i) => s + i.protein, 0),
        total_carbs: items.reduce((s, i) => s + i.carbs, 0),
        total_fat: items.reduce((s, i) => s + i.fat, 0),
      }

      setLoading(false)
      return result
    } catch (err) {
      console.error('Lamon Scan error:', err)
      setError('Di mabasa yung pagkain. Subukan mo ulit picturan nang malinaw.')
      setLoading(false)
      return null
    }
  }

  return { scanFoodImage, loading, error }
}
