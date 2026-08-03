import { useEffect, useRef, useState } from 'react'
import { Bot, Dumbbell, LineChart, Send, Trash2, Utensils } from 'lucide-react'
import { useGCoach, type CoachAction } from '../hooks/useGCoach'
import { getDailyBriefFacts } from '../lib/coachContext'

const QUICK_PROMPTS = [
  'Am I eating enough protein today?',
  'Ano dapat kainin ko mamaya?',
  'Tama ba workout plan ko?',
  'Gumawa ka ng short briefing for today.',
  'Palitan ng exercise kung crowded ang gym.',
  'Bakit hindi ako umuusad?',
]

const ACTIONS: Array<{ id: CoachAction; label: string; icon: typeof Utensils }> = [
  { id: 'nutrition', label: 'Meal plan', icon: Utensils },
  { id: 'routine', label: 'Build routine', icon: Dumbbell },
  { id: 'progress', label: '30-day report', icon: LineChart },
]

export function Coach() {
  const { messages, loading, error, ask, runAction, clearChat } = useGCoach()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const brief = getDailyBriefFacts()
  const [briefAsked, setBriefAsked] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (briefAsked || messages.length > 0 || loading) return
    setBriefAsked(true)
    void ask(
      "Give me a short proactive daily coaching briefing based on my data. Cover: today's workout/rest, calories & protein progress, remaining macros, streak, and one clear next action. Keep it under 120 words.",
    )
  }, [ask, briefAsked, messages.length, loading])

  async function submit(text?: string) {
    const value = (text ?? input).trim()
    if (!value) return
    setInput('')
    await ask(value)
  }

  return (
    <div className="g-page !space-y-3 flex flex-col min-h-[calc(100vh-8rem)]">
      <header className="border-3 border-jet bg-jeepney text-dirty p-3 shadow-hard">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <img
              src="/favicon.png"
              alt=""
              className="h-9 w-9 border-2 border-dirty object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">Your AI Coach</p>
              <h1 className="font-display text-lg mt-1">G! COACH</h1>
              <p className="text-sm mt-1 opacity-90">Kilala ka na niya ? workouts, macros, streak.</p>
            </div>
          </div>
          <button
            type="button"
            className="g-btn bg-dirty text-jet shadow-hardSm !p-2"
            onClick={() => {
              if (window.confirm('Clear chat history?')) clearChat()
            }}
            aria-label="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="g-card !py-3 grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="g-label !text-[9px]">Today</p>
          <p className="font-display text-sm leading-tight">
            {brief.isRest ? 'REST' : brief.focus.toUpperCase()}
          </p>
        </div>
        <div>
          <p className="g-label !text-[9px]">Protein</p>
          <p className="font-mono text-sm font-bold">
            {brief.protein}/{brief.proteinTarget}g
          </p>
        </div>
        <div>
          <p className="g-label !text-[9px]">Kcal</p>
          <p className="font-mono text-sm font-bold">
            {brief.calories}/{brief.calorieTarget}
          </p>
        </div>
        <div>
          <p className="g-label !text-[9px]">Streak</p>
          <p className="font-mono text-sm font-bold">{brief.streak}d</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={loading}
            className="g-btn-ghost !py-2 text-[10px] flex flex-col items-center gap-1 disabled:opacity-50"
            onClick={() => void runAction(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto min-h-[240px]">
        {messages.length === 0 && !loading && (
          <div className="g-card text-center py-8">
            <Bot size={32} className="mx-auto mb-2 text-jeepney" />
            <p className="font-display text-lg">G! COACH</p>
            <p className="text-xs text-asphalt mt-1">Naka-load ang data mo. Magtanong ka lang.</p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`border-3 border-jet p-3 shadow-hardSm whitespace-pre-wrap text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-mango ml-6' : 'bg-dirty mr-2'
            }`}
          >
            {m.role === 'model' && (
              <p className="g-label mb-1 flex items-center gap-1">
                <Bot size={12} /> G! Coach
              </p>
            )}
            {m.text}
          </div>
        ))}

        {loading && (
          <div className="g-card mr-2 text-sm text-asphalt animate-pulse">Coach is thinking?</div>
        )}

        {error && (
          <div className="g-card !bg-jeepney/10 border-jeepney text-sm font-bold text-jeepney">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading}
            className="g-btn-ghost !py-1.5 !px-2 text-[10px] whitespace-nowrap shrink-0 disabled:opacity-50"
            onClick={() => void submit(q)}
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          className="g-input flex-1"
          placeholder="Tanong kay Coach?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="g-btn-primary !px-3 disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
