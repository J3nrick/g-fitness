import { useMemo } from 'react'
import { Quote } from 'lucide-react'
import { demoGet, todayISO } from '../../lib/demoMode'
import { getMessage, getCoachingStyle, type MessageEvent } from '../../lib/messages'
import type { DailyLog } from '../../types/database.types'

function computeLocalStreak(): number {
  let count = 0
  const cursor = new Date()
  const todayKey = todayISO()
  const todayLog = demoGet<DailyLog | null>(`daily_${todayKey}`, null)
  if (!todayLog?.workout_completed) cursor.setDate(cursor.getDate() - 1)
  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    const day = demoGet<DailyLog | null>(`daily_${key}`, null)
    if (!day?.workout_completed) break
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

function detectTrigger(streak: number): MessageEvent {
  const hour = new Date().getHours()
  if (streak >= 30) return 'streak_30'
  if (streak >= 14) return 'streak_14'
  if (streak >= 7) return 'streak_7'
  if (streak >= 3) return 'streak_3'
  if (hour >= 22 || hour < 4) return 'late_night'
  if (hour < 12) return 'morning'
  return 'afternoon'
}

export function DynamicQuoteCard() {
  const style = getCoachingStyle()
  const streak = useMemo(() => computeLocalStreak(), [])
  const trigger = useMemo(() => detectTrigger(streak), [streak])
  const quote = useMemo(() => getMessage(trigger, style), [trigger, style])

  const styleLabel = style === 'real_talk' ? 'Real Talk' : style === 'chill' ? 'Chill' : 'Tropa'
  const triggerLabel =
    trigger === 'late_night' ? 'Late Night'
    : trigger.startsWith('streak') ? `${trigger.split('_')[1]}-Day`
    : trigger === 'morning' ? 'Morning'
    : 'Today'

  return (
    <div className="g-card">
      <div className="flex items-center justify-between mb-3">
        <Quote className="text-asphalt" size={20} />
        <div className="flex items-center gap-2">
          <span className="border-2 border-jet px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {styleLabel}
          </span>
          <span className="g-label">{triggerLabel}</span>
        </div>
      </div>
      <p className="font-display text-base leading-snug">"{quote}"</p>
    </div>
  )
}
