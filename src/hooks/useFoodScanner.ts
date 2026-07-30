import { useState } from 'react'
import { AiApiError, invokeMealScan } from '../lib/aiApi'

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

/** Shrink large camera photos so Gemini accepts them reliably. */
async function compressImage(base64Image: string, maxSide = 1280): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxSide && height <= maxSide && base64Image.length < 1_500_000) {
        resolve(base64Image)
        return
      }
      const scale = Math.min(maxSide / width, maxSide / height, 1)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(base64Image)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(base64Image)
    img.src = base64Image
  })
}

export function useFoodScanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function scanFoodImage(base64Image: string): Promise<ScannedResult | null> {
    setLoading(true)
    setError(null)

    try {
      const compressed = await compressImage(base64Image)
      const result = await invokeMealScan(compressed)
      setLoading(false)
      return {
        items: result.items,
        total_calories: result.total_calories,
        total_protein: result.total_protein,
        total_carbs: result.total_carbs,
        total_fat: result.total_fat,
      }
    } catch (err) {
      console.error('Lamon Scan error:', err)
      const msg =
        err instanceof AiApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Di mabasa yung pagkain. Subukan mo ulit.'
      setError(msg)
      setLoading(false)
      return null
    }
  }

  return { scanFoodImage, loading, error }
}
