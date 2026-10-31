/** Client-side Claude fallback for local/demo when the Edge secret is missing. */
import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = 'claude-opus-5-5'

type Part = { text?: string; inlineData?: { mimeType: string; data: string } }
type Content = { role: string; parts: Part[] }

export function getClientClaudeKey(): string | null {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim()
  return key || null
}

function toMessages(contents: Content[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []
  for (const c of contents) {
    const blocks: Anthropic.ContentBlockParam[] = []
    for (const p of c.parts) {
      if (p.inlineData) {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: p.inlineData.mimeType as Anthropic.Base64ImageSource['media_type'],
            data: p.inlineData.data,
          },
        })
      } else if (p.text) {
        blocks.push({ type: 'text', text: p.text })
      }
    }
    if (blocks.length) messages.push({ role: c.role === 'user' ? 'user' : 'assistant', content: blocks })
  }
  while (messages.length && messages[0].role !== 'user') messages.shift()
  return messages
}

export async function callClaudeClient(opts: {
  systemPrompt?: string
  contents: Content[]
  json?: boolean
  maxTokens?: number
}): Promise<{ ok: true; text: string; model: string } | { ok: false; status: number; body: string }> {
  const apiKey = getClientClaudeKey()
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY missing. Set Supabase Edge secret ANTHROPIC_API_KEY, or VITE_ANTHROPIC_API_KEY in .env.local for local fallback.',
      }),
    }
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const system = [
    opts.systemPrompt ?? '',
    opts.json ? 'Respond with ONLY valid JSON. No markdown fences, no commentary.' : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const message = await client.messages
      .stream({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens ?? 16000,
        output_config: { effort: 'low' },
        ...(system ? { system } : {}),
        messages: toMessages(opts.contents),
      })
      .finalMessage()
    if (message.stop_reason === 'refusal') {
      return { ok: false, status: 400, body: JSON.stringify({ error: 'Claude declined this request.' }) }
    }
    const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
    if (!text) return { ok: false, status: 502, body: 'Empty model response' }
    return { ok: true, text, model: message.model }
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return { ok: false, status: err.status ?? 500, body: JSON.stringify({ error: err.message }) }
    }
    return { ok: false, status: 500, body: err instanceof Error ? err.message : 'Claude request failed' }
  }
}

export function parseClientClaudeError(status: number, body: string): string {
  if (status === 429) return 'Rate limit. Hintayin mo sandali tapos try again.'
  if (status === 401 || status === 403) return 'Anthropic API key rejected. Check your key.'
  try {
    const json = JSON.parse(body) as { error?: { message?: string } | string }
    const msg = typeof json.error === 'string' ? json.error : (json.error?.message ?? body)
    return msg.slice(0, 200)
  } catch {
    return body.slice(0, 200) || `Claude error ${status}`
  }
}
