import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Camera, Flame, Trash2 } from 'lucide-react'
import { AUTH_BYPASS, DEMO_USER_ID, demoGet, demoSet, todayISO } from '../lib/demoMode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { WeightChart } from '../components/progress/WeightChart'
import { getExtProfile } from '../lib/store'
import type { DailyLog, WeightLog } from '../types/database.types'

export function Progress() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const ext = getExtProfile()
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

  function deleteWeightLog(id: string) {
    const next = logs.filter((l) => l.id !== id)
    setLogs(next)
    if (AUTH_BYPASS) demoSet('weight_logs', next)
    showToast('deleted')
  }

  return (
    <div className="g-page">
      <header className="border-3 border-jet bg-malunggay text-dirty p-4 shadow-hard">
        <h1 className="font-display text-5xl">PROGRESS</h1>
        <p className="mt-2 text-sm font-medium">
          Target: {ext.target_weight} kg · Current: {ext.current_weight} kg
        </p>
      </header>

      <form onSubmit={saveWeight} className="g-card space-y-3">
        <p className="g-label">Quick Weight Log</p>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="g-input flex-1"
            placeholder="72.5"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="g-btn-primary !py-2 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>

      <WeightChart
        data={logs.map((l) => ({ weight: Number(l.weight), logged_at: l.logged_at }))}
      />

      <div className="g-card flex items-center gap-4">
        <Flame size={28} className="text-traffic" />
        <div>
          <p className="g-label">Workout Streak</p>
          <p className="font-mono text-3xl font-bold">
            {streak}
            <span className="text-sm font-sans text-asphalt ml-1">days</span>
          </p>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="g-card space-y-2">
          <p className="g-label">Recent Entries</p>
          {logs.slice(-10).reverse().map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b-3 border-jet pb-2 last:border-b-0 last:pb-0">
              <div>
                <p className="font-mono font-bold">{Number(l.weight).toFixed(1)} kg</p>
                <p className="text-xs text-asphalt">{new Date(l.logged_at).toLocaleDateString()}</p>
              </div>
              <button type="button" className="g-btn-ghost !p-1" onClick={() => deleteWeightLog(l.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 && (
        <div className="g-card text-center py-8">
          <p className="font-display text-lg">WALANG DATA PA</p>
          <p className="text-xs text-asphalt mt-1">Log your first weight above.</p>
        </div>
      )}

      <div>
        <p className="g-label mb-3">Progress Photos</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Week 1', date: 'Day 1' },
            { label: 'Week 4', date: 'Day 28' },
          ].map((photo) => (
            <label
              key={photo.label}
              className="g-card !p-0 overflow-hidden aspect-[3/4] relative bg-concrete cursor-pointer"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-asphalt">
                <Camera size={22} />
                <span className="text-xs font-bold">{photo.label}</span>
              </div>
              <span className="absolute bottom-2 left-2 bg-jet text-dirty px-2 py-0.5 text-[10px] font-bold">
                {photo.date}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={() => {}} />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
