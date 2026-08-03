import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { AUTH_BYPASS, demoGet, demoSet, todayISO } from '../../lib/demoMode'
import { calcDisciplineScore } from '../../lib/discipline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import type { DailyLog } from '../../types/database.types'

type ChecklistKey = 'workout_completed' | 'protein_hit' | 'water_hit' | 'sleep_hit'

const ITEMS: { key: ChecklistKey; label: string; toastKey: string }[] = [
  { key: 'workout_completed', label: 'Workout', toastKey: 'workout_done' },
  { key: 'protein_hit', label: 'Protein Goal', toastKey: 'protein' },
  { key: 'water_hit', label: 'Water Goal', toastKey: 'water' },
  { key: 'sleep_hit', label: 'Sleep', toastKey: 'sleep' },
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

interface MissionChecklistProps {
  onChange?: (log: DailyLog) => void
}

export function MissionChecklist({ onChange }: MissionChecklistProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [log, setLog] = useState<DailyLog | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    if (AUTH_BYPASS) {
      const stored = demoGet<DailyLog | null>(`daily_${todayISO()}`, null) ?? emptyLog(user.id)
      setLog(stored)
      onChange?.(stored)
      return
    }
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', todayISO())
      .maybeSingle()
    if (data) {
      setLog(data as DailyLog)
      onChange?.(data as DailyLog)
    } else {
      const { data: created } = await supabase
        .from('daily_logs')
        .insert({ user_id: user.id, log_date: todayISO() })
        .select()
        .single()
      if (created) {
        setLog(created as DailyLog)
        onChange?.(created as DailyLog)
      }
    }
  }, [user?.id, onChange])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(key: ChecklistKey, toastKey: string) {
    if (!log) return
    const next = !log[key]
    const updated = { ...log, [key]: next }
    setLog(updated)
    onChange?.(updated)
    if (next) showToast(toastKey)

    if (AUTH_BYPASS) {
      demoSet(`daily_${todayISO()}`, {
        ...updated,
        discipline_score: calcDisciplineScore(updated),
      })
      return
    }
    await supabase
      .from('daily_logs')
      .update({ [key]: next, discipline_score: calcDisciplineScore(updated) })
      .eq('id', log.id)
  }

  if (!log) return <div className="g-card text-asphalt text-sm">Loading mission...</div>

  return (
    <div className="g-card space-y-0 !p-0 overflow-hidden">
      <div className="bg-jet text-dirty px-4 py-2">
        <p className="font-display text-lg tracking-wide">TODAY&apos;S MISSION</p>
      </div>
      <ul>
        {ITEMS.map(({ key, label, toastKey }) => {
          const done = Boolean(log[key])
          return (
            <li key={key} className="border-t-3 border-jet">
              <button
                type="button"
                onClick={() => toggle(key, toastKey)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${
                  done ? 'bg-malunggay/20' : 'bg-dirty'
                }`}
              >
                <span className={`g-check ${done ? 'g-check-on' : ''}`}>
                  {done ? <Check size={16} strokeWidth={3} /> : null}
                </span>
                <span className={`font-bold text-base ${done ? 'line-through text-asphalt' : 'text-jet'}`}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function useStreak(): number {
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    let count = 0
    const cursor = new Date()
    const today = todayISO()
    const todayLog = demoGet<DailyLog | null>(`daily_${today}`, null)
    if (!todayLog?.workout_completed) cursor.setDate(cursor.getDate() - 1)
    while (true) {
      const key = cursor.toISOString().slice(0, 10)
      const day = demoGet<DailyLog | null>(`daily_${key}`, null)
      if (!day?.workout_completed) break
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    setStreak(count)
  }, [])
  return streak
}
