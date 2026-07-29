import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Camera, Flame } from 'lucide-react'
import { AUTH_BYPASS, DEMO_USER_ID, demoGet, demoSet, todayISO } from '../lib/demoMode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { WeightChart } from '../components/progress/WeightChart'
import type { DailyLog, WeightLog } from '../types/database.types'

const PHOTO_PLACEHOLDERS = [
  { label: 'Week 1', date: 'Day 1' },
  { label: 'Week 4', date: 'Day 28' },
]

export function Progress() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [weight, setWeight] = useState('')
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [streak, setStreak] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return

    if (AUTH_BYPASS) {
      setLogs(demoGet<WeightLog[]>('weight_logs', []))
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
      setStreak(count)
      return
    }

    const { data: weightRows } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(60)
    setLogs((weightRows ?? []) as WeightLog[])

    const { data: dailyRows } = await supabase
      .from('daily_logs')
      .select('log_date, workout_completed')
      .eq('user_id', user.id)
      .eq('workout_completed', true)
      .order('log_date', { ascending: false })
      .limit(120)

    const dates = new Set((dailyRows ?? []).map((r) => r.log_date as string))
    let count = 0
    const cursor = new Date()
    if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    setStreak(count)
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  async function saveWeight(e: FormEvent) {
    e.preventDefault()
    if (!user?.id || !weight || saving) return
    setSaving(true)
    const value = Number(weight)

    if (AUTH_BYPASS) {
      const entry: WeightLog = {
        id: crypto.randomUUID(),
        user_id: DEMO_USER_ID,
        weight: value,
        logged_at: new Date().toISOString(),
      }
      const next = [...logs, entry]
      demoSet('weight_logs', next)
      setLogs(next)
      setWeight('')
      setSaving(false)
      showToast('weight')
      return
    }

    const { data, error } = await supabase
      .from('weight_logs')
      .insert({ user_id: user.id, weight: value })
      .select()
      .single()
    setSaving(false)
    if (error) {
      console.error(error.message)
      return
    }
    setLogs((prev) => [...prev, data as WeightLog])
    setWeight('')
    showToast('weight')
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="g-label mb-2">Progress</p>
        <h1 className="g-display">Salmin</h1>
        <p className="mt-2 text-sm text-secondaryText">
          Target: <span className="g-value text-sm">{profile?.target_weight ?? 70}</span> kg
        </p>
      </header>

      <form onSubmit={saveWeight} className="g-card space-y-3">
        <label className="g-label">Quick Weight Log</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1 rounded-xl bg-subcanvas border border-white/10 px-4 py-3 g-value outline-none focus:border-accent"
            placeholder="72.5"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="g-btn rounded-xl bg-white px-4 py-3 font-semibold text-background disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>

      <WeightChart
        data={logs.map((l) => ({ weight: Number(l.weight), logged_at: l.logged_at }))}
      />

      <div className="g-card flex items-center gap-4">
        <div className="rounded-xl bg-white/5 p-3">
          <Flame className="text-warning" size={28} />
        </div>
        <div>
          <p className="g-label">Workout streak</p>
          <p className="g-value text-3xl mt-1">
            {streak}
            <span className="text-base font-sans font-normal text-secondaryText ml-1">days</span>
          </p>
        </div>
      </div>

      <div>
        <p className="g-label mb-3">Progress Photos</p>
        <div className="grid grid-cols-2 gap-3">
          {PHOTO_PLACEHOLDERS.map((photo) => (
            <div
              key={photo.label}
              className="g-card !p-0 overflow-hidden aspect-[3/4] relative bg-subcanvas border-white/5"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                <Camera size={22} />
                <span className="text-xs">{photo.label}</span>
              </div>
              <span className="absolute bottom-2 left-2 rounded-full bg-black/50 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
                {photo.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
