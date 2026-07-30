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
