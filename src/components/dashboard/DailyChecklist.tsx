import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Droplets, Dumbbell, Moon, Egg } from 'lucide-react'
import { AUTH_BYPASS, demoGet, demoSet, todayISO } from '../../lib/demoMode'
import { calcDisciplineScore } from '../../lib/discipline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import type { DailyLog } from '../../types/database.types'
import { DisciplineScoreBar } from './DisciplineScoreBar'

type ChecklistKey = 'workout_completed' | 'protein_hit' | 'water_hit' | 'sleep_hit'

const ITEMS: {
  key: ChecklistKey
  label: string
  toastKey: string
  icon: typeof Dumbbell
}[] = [
  { key: 'workout_completed', label: 'Workout', toastKey: 'workout_done', icon: Dumbbell },
  { key: 'protein_hit', label: 'Protein', toastKey: 'protein', icon: Egg },
  { key: 'water_hit', label: 'Water', toastKey: 'water', icon: Droplets },
  { key: 'sleep_hit', label: 'Sleep', toastKey: 'sleep', icon: Moon },
]

function emptyLog(userId: string): DailyLog {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    log_date: todayISO(),
    workout_completed: false,
    protein_hit: false,
    water_hit: false,
    sleep_hit: false,
  }
}

export function DailyChecklist() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [log, setLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [popKey, setPopKey] = useState<ChecklistKey | null>(null)

  const score = useMemo(() => calcDisciplineScore(log), [log])

  const persistScore = useCallback(
    async (nextLog: DailyLog) => {
      const nextScore = calcDisciplineScore(nextLog)
      if (AUTH_BYPASS) {
        demoSet(`daily_${todayISO()}`, { ...nextLog, discipline_score: nextScore })
        return
      }
      await supabase
        .from('daily_logs')
        .update({
          workout_completed: nextLog.workout_completed,
          protein_hit: nextLog.protein_hit,
          water_hit: nextLog.water_hit,
          sleep_hit: nextLog.sleep_hit,
          discipline_score: nextScore,
        })
        .eq('id', nextLog.id)
    },
    [],
  )

  const ensureToday = useCallback(async () => {
    if (!user?.id) return
    const date = todayISO()

    if (AUTH_BYPASS) {
      const stored = demoGet<DailyLog | null>(`daily_${date}`, null)
      setLog(stored ?? emptyLog(user.id))
      setLoading(false)
      return
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .maybeSingle()

    if (fetchErr) {
      console.error(fetchErr.message)
      setLoading(false)
      return
    }

    if (existing) {
      setLog(existing as DailyLog)
      setLoading(false)
      return
    }

    const { data: created, error: createErr } = await supabase
      .from('daily_logs')
      .insert({ user_id: user.id, log_date: date })
      .select()
      .single()

    if (createErr) console.error(createErr.message)
    else setLog(created as DailyLog)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    ensureToday()
  }, [ensureToday])

  async function toggle(key: ChecklistKey, toastKey: string) {
    if (!log) return
    const next = !log[key]
    const updated = { ...log, [key]: next }
    setLog(updated)

    if (next) {
      setPopKey(key)
      window.setTimeout(() => setPopKey(null), 220)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(10)
      showToast(toastKey)
    }

    if (AUTH_BYPASS) {
      await persistScore(updated)
      return
    }

    const { error } = await supabase
      .from('daily_logs')
      .update({ [key]: next, discipline_score: calcDisciplineScore(updated) })
      .eq('id', log.id)

    if (error) {
      setLog(log)
      console.error(error.message)
    }
  }

  if (loading) {
    return <div className="g-card g-body text-secondaryText">Loading checklist...</div>
  }

  return (
    <div className="space-y-4">
      <DisciplineScoreBar score={score} />

      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(({ key, label, toastKey, icon: Icon }) => {
          const done = Boolean(log?.[key])
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key, toastKey)}
              className={`g-btn g-card g-card-hover !p-4 text-left space-y-3 ${
                done ? 'border-success/30 bg-success/10' : ''
              } ${popKey === key ? 'animate-g-pop' : ''}`}
            >
              <div className="flex items-center justify-between">
                <Icon size={18} className={done ? 'text-success' : 'text-secondaryText'} />
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150 ${
                    done
                      ? 'bg-success/20 border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                      : 'border-white/10 text-transparent'
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              </div>
              <p className={`text-sm font-semibold ${done ? 'text-success' : 'text-white'}`}>
                {label}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
