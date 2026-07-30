/** Prefer models that currently work with Google AI Studio keys. */
export const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
] as const

export function parseGeminiHttpError(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } }
    const msg = json.error?.message ?? body
    if (status === 429) return 'Rate limit / quota. Hintayin mo sandali tapos try again.'
    if (status === 400 && /API key/i.test(msg)) {
      return 'API key invalid. Check VITE_GEMINI_API_KEY sa .env.local'
    }
    if (status === 401 || status === 403) {
      return `API key rejected (${status}). Gumawa ng bagong key sa Google AI Studio.`
    }
    return `Gemini error ${status}: ${msg.slice(0, 120)}`
  } catch {
    if (status === 429) return 'Rate limit / quota. Hintayin mo sandali tapos try again.'
    return `Gemini error ${status}: ${body.slice(0, 120)}`
  }
}

/** Auth failures should stop the model loop; rate limits should try the next model. */
export function shouldStopModelLoop(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true
  if (status === 400 && /API key/i.test(body)) return true
  return false
}
