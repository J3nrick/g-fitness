import { useCallback, useState } from 'react'
import { buildCoachContext, buildSystemPrompt } from '../lib/coachContext'
import { demoGet, demoSet } from '../lib/demoMode'

export interface CoachMessage {
  id: string
  role: 'user' | 'model'
  text: string
  at: string
}

const HISTORY_KEY = 'g_coach_chat_v1'
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite']

function uid() {
  return crypto.randomUUID()
}

function loadHistory(): CoachMessage[] {
  return demoGet<CoachMessage[]>(HISTORY_KEY, [])
}

function saveHistory(messages: CoachMessage[]) {
  demoSet(HISTORY_KEY, messages.slice(-40))
}

async function callGeminiChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  context: string,
  history: CoachMessage[],
  userText: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const contents = [
    ...history.slice(-12).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
    {
      role: 'user',
      parts: [
        {
          text: `USER DATA CONTEXT (facts only — do not invent beyond this):\n\n${context}\n\n---\nUSER MESSAGE:\n${userText}`,
        },
      ],
    },
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  })

  const body = await response.text()
  if (!response.ok) return { ok: false, status: response.status, body }

  try {
    const data = JSON.parse(body) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!text.trim()) return { ok: false, status: 200, body: 'Empty response' }
    return { ok: true, text: text.trim() }
  } catch {
    return { ok: false, status: response.status, body: body.slice(0, 300) }
  }
}

function parseError(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } }
    const msg = json.error?.message ?? body
    if (status === 429) return 'Rate limit muna. Hintayin mo sandali, try again.'
    if (status === 401 || status === 403) return 'API key issue. Check VITE_GEMINI_API_KEY.'
    return msg.slice(0, 140)
  } catch {
    if (status === 429) return 'Rate limit muna. Hintayin mo sandali, try again.'
    return `Error ${status}`
  }
}

export function useGCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>(() => loadHistory())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = useCallback(async (userText: string) => {
    const trimmed = userText.trim()
    if (!trimmed || loading) return null

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
    if (!apiKey) {
      setError('Walang Gemini API key. Restart npm run dev after setting VITE_GEMINI_API_KEY.')
      return null
    }

    const userMsg: CoachMessage = {
      id: uid(),
      role: 'user',
      text: trimmed,
      at: new Date().toISOString(),
    }

    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    saveHistory(nextHistory)
    setLoading(true)
    setError(null)

    try {
      const systemPrompt = buildSystemPrompt()
      const context = buildCoachContext()
      let lastError = ''

      for (const model of GEMINI_MODELS) {
        const result = await callGeminiChat(
          apiKey,
          model,
          systemPrompt,
          context,
          messages,
          trimmed,
        )
        if (result.ok === false) {
          lastError = parseError(result.status, result.body)
          if (result.status === 401 || result.status === 403 || result.status === 429) break
          continue
        }

        const modelMsg: CoachMessage = {
          id: uid(),
          role: 'model',
          text: result.text,
          at: new Date().toISOString(),
        }
        const withReply = [...nextHistory, modelMsg]
        setMessages(withReply)
        saveHistory(withReply)
        setLoading(false)
        return modelMsg
      }

      setError(lastError || 'Di makasagot si Coach. Try again.')
      setLoading(false)
      return null
    } catch (err) {
      console.error('G! Coach error:', err)
      setError(err instanceof Error ? err.message : 'Di makasagot si Coach.')
      setLoading(false)
      return null
    }
  }, [messages, loading])

  const clearChat = useCallback(() => {
    setMessages([])
    saveHistory([])
    setError(null)
  }, [])

  return { messages, loading, error, ask, clearChat, setError }
}
