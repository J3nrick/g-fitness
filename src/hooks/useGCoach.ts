import { useCallback, useState } from 'react'
import { buildCoachContext } from '../lib/coachContext'
import { getCoachingStyle } from '../lib/messages'
import { demoGet, demoSet } from '../lib/demoMode'
import { AiApiError, invokeAiChat } from '../lib/aiApi'
import {
  runNutritionCoachAction,
  runProgressAnalysisAction,
  runRoutineGeneratorAction,
} from '../lib/aiActions'

export interface CoachMessage {
  id: string
  role: 'user' | 'model'
  text: string
  at: string
}

export type CoachAction = 'nutrition' | 'routine' | 'progress'

const HISTORY_KEY = 'g_coach_chat_v1'
const CONVERSATION_KEY = 'g_coach_conversation_id'

function uid() {
  return crypto.randomUUID()
}

function loadHistory(): CoachMessage[] {
  return demoGet<CoachMessage[]>(HISTORY_KEY, [])
}

function saveHistory(messages: CoachMessage[]) {
  demoSet(HISTORY_KEY, messages.slice(-40))
}

const ACTION_LABELS: Record<CoachAction, string> = {
  nutrition: 'Suggest meals for my remaining macros today.',
  routine: 'Generate a full workout routine from my profile and save it to Bakal.',
  progress: 'Analyze my last 30 days of progress and give recommendations.',
}

export function useGCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>(() => loadHistory())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(() =>
    demoGet<string | null>(CONVERSATION_KEY, null),
  )

  const appendExchange = useCallback((userText: string, assistantText: string) => {
    const userMsg: CoachMessage = {
      id: uid(),
      role: 'user',
      text: userText,
      at: new Date().toISOString(),
    }
    const modelMsg: CoachMessage = {
      id: uid(),
      role: 'model',
      text: assistantText,
      at: new Date().toISOString(),
    }
    setMessages((prev) => {
      const next = [...prev, userMsg, modelMsg]
      saveHistory(next)
      return next
    })
  }, [])

  const ask = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim()
      if (!trimmed || loading) return null

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
        const result = await invokeAiChat({
          message: trimmed,
          context: buildCoachContext(),
          coachingStyle: getCoachingStyle(),
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          conversationId,
        })

        if (result.conversationId) {
          setConversationId(result.conversationId)
          demoSet(CONVERSATION_KEY, result.conversationId)
        }

        const modelMsg: CoachMessage = {
          id: uid(),
          role: 'model',
          text: result.reply,
          at: new Date().toISOString(),
        }
        const withReply = [...nextHistory, modelMsg]
        setMessages(withReply)
        saveHistory(withReply)
        setLoading(false)
        return modelMsg
      } catch (err) {
        console.error('G! Coach error:', err)
        const msg =
          err instanceof AiApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Di makasagot si Coach.'
        setError(msg)
        setLoading(false)
        return null
      }
    },
    [messages, loading, conversationId],
  )

  const runAction = useCallback(
    async (action: CoachAction) => {
      if (loading) return null
      setLoading(true)
      setError(null)
      const label = ACTION_LABELS[action]
      try {
        let reply = ''
        if (action === 'nutrition') reply = await runNutritionCoachAction()
        else if (action === 'routine') reply = await runRoutineGeneratorAction()
        else reply = await runProgressAnalysisAction(30)
        appendExchange(label, reply)
        setLoading(false)
        return reply
      } catch (err) {
        console.error('G! Coach action error:', err)
        const msg =
          err instanceof AiApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Action failed.'
        setError(msg)
        setLoading(false)
        return null
      }
    },
    [loading, appendExchange],
  )

  const clearChat = useCallback(() => {
    setMessages([])
    saveHistory([])
    setConversationId(null)
    demoSet(CONVERSATION_KEY, null)
    setError(null)
  }, [])

  return { messages, loading, error, ask, runAction, clearChat, setError }
}
