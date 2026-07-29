import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'
import { AUTH_BYPASS, demoGet, todayISO } from '../../lib/demoMode'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { CoachingStyle, DailyLog, MotivationQuote, QuoteTrigger } from '../../types/database.types'

const DEMO_QUOTES: Record<QuoteTrigger, Record<CoachingStyle, string>> = {
  morning: {
    chill: 'Good morning. Let us build consistency today.',
    tropa: 'Uy gising na! Tara, baka kalawangin ka na naman.',
    real_talk: 'Gago, bangon! Hindi gagalaw ang timbang mo sa pag-escroll.',
  },
  late_night: {
    chill: 'Late night session. Get it done and get good rest.',
    tropa: 'Gabi na ah! Huli man daw at magaling, nakakapag-buhat pa rin.',
    real_talk: 'Gabi na, gago. Mag-workout ka na para makatulog ka na, wag puro scroll.',
  },
  streak_7: {
    chill: '7 days of solid consistency. Outstanding effort.',
    tropa: '7-day streak! Solid bro, ginagalingan mo na masyado ah.',
    real_talk: '7-day streak! Tangina, sinisipag ka ah. Patunayan mong hindi ito chamba.',
  },
  rest_day: {
    chill: 'Recovery is part of progress. Rest up today.',
    tropa: 'Rest day muna. Pahinga ang muscles para mas malakas bukas.',
    real_talk: 'Pahinga muna. Hindi bakal katawan mo, pero siguraduhin mong babawi ka bukas.',
  },
  water_log: {
    chill: 'Hydration target updated. Keep drinking water.',
    tropa: 'Lakas uminom ng tubig! Wag lang puro kape ha.',
    real_talk: 'Inom pa ng tubig. Masyado nang tuyo ang utak mo.',
  },
  missed_workout: {
    chill: 'Rest is okay, but make sure to show up tomorrow.',
    tropa: 'Hoy! Bakit walang buhat kahapon? Bawi ka ngayon.',
    real_talk: 'Wala kang galaw kahapon. Ang hina. Babawi ka ba o magpapatatas na lang?',
  },
  workout_complete: {
    chill: 'Great session. Progress takes time.',
    tropa: 'Solid! Isa na namang araw na pinili mong umusad.',
    real_talk: 'Tangina, lakas! Ganyan dapat, huwag kang tatamad-tamad.',
  },
  pr_hit: {
    chill: 'New personal record. Quiet strength.',
    tropa: 'PR! Ang lakas mo today, pre.',
    real_talk: 'PR yan. Huwag mong sayangin — ulitin mo bukas.',
  },
}

function detectTrigger(streak: number): QuoteTrigger {
  const hour = new Date().getHours()
  if (streak === 7) return 'streak_7'
  if (hour >= 22 || hour < 4) return 'late_night'
  return 'morning'
}

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

export function DynamicQuoteCard() {
  const { profile, user } = useAuth()
  const [quote, setQuote] = useState('Tara. Simulan natin.')
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState<QuoteTrigger>('morning')

  useEffect(() => {
    let cancelled = false
    const style = (profile?.coaching_style ?? 'tropa') as CoachingStyle

    async function load() {
      let streak = 0
      if (AUTH_BYPASS) streak = computeLocalStreak()
      else if (user?.id) {
        const { data: dailyRows } = await supabase
          .from('daily_logs')
          .select('log_date, workout_completed')
          .eq('user_id', user.id)
          .eq('workout_completed', true)
          .order('log_date', { ascending: false })
          .limit(40)
        const dates = new Set((dailyRows ?? []).map((r) => r.log_date as string))
        const cursor = new Date()
        if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
        while (dates.has(cursor.toISOString().slice(0, 10))) {
          streak += 1
          cursor.setDate(cursor.getDate() - 1)
        }
      }

      const event = detectTrigger(streak)
      if (cancelled) return
      setTrigger(event)

      if (AUTH_BYPASS) {
        setQuote(DEMO_QUOTES[event][style])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('motivation_quotes')
        .select('*')
        .eq('style', style)
        .eq('trigger_event', event)

      if (cancelled) return
      if (error || !data || data.length === 0) {
        setQuote(DEMO_QUOTES[event]?.[style] ?? DEMO_QUOTES.morning[style])
      } else {
        const picked = data[Math.floor(Math.random() * data.length)] as MotivationQuote
        setQuote(picked.message)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [profile?.coaching_style, user?.id])

  const styleLabel =
    profile?.coaching_style === 'real_talk'
      ? 'Real Talk'
      : profile?.coaching_style === 'chill'
        ? 'Chill'
        : 'Tropa'

  return (
    <div className="g-card border-white/10 bg-gradient-to-br from-card to-card/50">
      <div className="flex items-center justify-between mb-4">
        <Quote className="text-secondaryText" size={22} />
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-secondaryText">
            {styleLabel}
          </span>
          <span className="g-label">
            {trigger === 'late_night' ? 'Late Night' : trigger === 'streak_7' ? '7-Day' : 'Today'}
          </span>
        </div>
      </div>
      <p className={`text-2xl font-extrabold tracking-tight leading-snug text-white ${loading ? 'opacity-50' : ''}`}>
        “{quote}”
      </p>
    </div>
  )
}
