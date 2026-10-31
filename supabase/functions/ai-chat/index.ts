import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts"
import { buildSystemPrompt } from "../_shared/coachPrompt.ts"
import { callClaude, getAnthropicApiKey, parseClaudeErrorMessage } from "../_shared/claude.ts"

interface ChatHistoryItem {
  role: "user" | "model"
  text: string
}

interface AiChatBody {
  message?: string
  coachingStyle?: string
  context?: string
  history?: ChatHistoryItem[]
  conversationId?: string | null
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

    let body: AiChatBody
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const message = body.message?.trim()
    if (!message) {
      return errorResponse("message is required", 400)
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

    const context = (body.context ?? "").trim() || "No structured user context was provided."
    const style = body.coachingStyle ?? "tropa"
    const history = Array.isArray(body.history) ? body.history.slice(-12) : []

    const apiKey = getAnthropicApiKey()
    const result = await callClaude({
      apiKey,
      systemPrompt: buildSystemPrompt(style),
      maxTokens: 16000,
      contents: [
        ...history.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        })),
        {
          role: "user",
          parts: [
            {
              text:
                `USER DATA CONTEXT (facts only — do not invent beyond this):\n\n${context}\n\n` +
                `---\nUSER MESSAGE:\n${message}`,
            },
          ],
        },
      ],
    })

    if (!result.ok) {
      return errorResponse(parseClaudeErrorMessage(result.status, result.body), result.status === 429 ? 429 : 502)
    }

    let conversationId = body.conversationId ?? null

    // Persist when authenticated (demo/bypass may skip)
    if (user) {
      try {
        if (!conversationId) {
          const { data: conv, error: convErr } = await supabase
            .from("ai_conversations")
            .insert({
              user_id: user.id,
              title: message.slice(0, 80),
              kind: "coach",
            })
            .select("id")
            .single()
          if (!convErr && conv) conversationId = conv.id
        }

        if (conversationId) {
          await supabase.from("ai_messages").insert([
            {
              conversation_id: conversationId,
              user_id: user.id,
              role: "user",
              content: message,
            },
            {
              conversation_id: conversationId,
              user_id: user.id,
              role: "assistant",
              content: result.text,
              model: result.model,
            },
          ])
        }
      } catch (persistErr) {
        console.error("ai-chat persist warning:", persistErr)
      }
    }

    return jsonResponse({
      reply: result.text,
      model: result.model,
      conversationId,
      authenticated: Boolean(user),
    })
  } catch (err) {
    console.error("ai-chat error:", err)
    const msg = err instanceof Error ? err.message : "Unexpected server error"
    if (/ANTHROPIC_API_KEY/.test(msg)) {
      return errorResponse(
        "ANTHROPIC_API_KEY secret is missing. Set it in Supabase Dashboard → Edge Functions → Secrets.",
        500,
      )
    }
    return errorResponse(msg, 500)
  }
})
