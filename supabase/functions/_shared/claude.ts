import Anthropic from "npm:@anthropic-ai/sdk"

export const CLAUDE_MODEL = "claude-opus-5-5"

type Part = { text?: string; inlineData?: { mimeType: string; data: string } }
type Content = { role: string; parts: Part[] }

export function getAnthropicApiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY")?.trim()
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY secret is not set on this Supabase project")
  }
  return key
}

function toMessages(contents: Content[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []
  for (const c of contents) {
    const role = c.role === "user" ? "user" : "assistant"
    const blocks: Anthropic.ContentBlockParam[] = []
    for (const p of c.parts) {
      if (p.inlineData) {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: p.inlineData.mimeType as Anthropic.Base64ImageSource["media_type"],
            data: p.inlineData.data,
          },
        })
      } else if (p.text) {
        blocks.push({ type: "text", text: p.text })
      }
    }
    if (blocks.length) messages.push({ role, content: blocks })
  }
  // API requires the first turn to be from the user
  while (messages.length && messages[0].role !== "user") messages.shift()
  return messages
}

/** Calls Claude. `contents` uses the user/model + parts shape the edge functions already build. */
export async function callClaude(opts: {
  apiKey: string
  systemPrompt?: string
  contents: Content[]
  json?: boolean
  maxTokens?: number
  effort?: "low" | "medium" | "high"
}): Promise<{ ok: true; text: string; model: string } | { ok: false; status: number; body: string }> {
  const client = new Anthropic({ apiKey: opts.apiKey })
  const system = [
    opts.systemPrompt ?? "",
    opts.json ? "Respond with ONLY valid JSON. No markdown fences, no commentary." : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const message = await client.messages
      .stream({
        model: CLAUDE_MODEL,
        max_tokens: opts.maxTokens ?? 16000,
        output_config: { effort: opts.effort ?? "low" },
        ...(system ? { system } : {}),
        messages: toMessages(opts.contents),
      })
      .finalMessage()

    if (message.stop_reason === "refusal") {
      return { ok: false, status: 400, body: JSON.stringify({ error: { message: "Claude declined this request." } }) }
    }
    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
    if (!text) return { ok: false, status: 502, body: "Empty model response" }
    return { ok: true, text, model: message.model }
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return { ok: false, status: err.status ?? 500, body: JSON.stringify({ error: { message: err.message } }) }
    }
    return { ok: false, status: 500, body: err instanceof Error ? err.message : "Claude request failed" }
  }
}

export function parseClaudeErrorMessage(status: number, body: string): string {
  if (status === 429) return "Rate limit. Hintayin mo sandali tapos try again."
  if (status === 401 || status === 403) return "Anthropic API key rejected. Check ANTHROPIC_API_KEY secret."
  try {
    const json = JSON.parse(body) as { error?: { message?: string } }
    return (json.error?.message ?? body).slice(0, 200)
  } catch {
    return body.slice(0, 200) || `Claude error ${status}`
  }
}
