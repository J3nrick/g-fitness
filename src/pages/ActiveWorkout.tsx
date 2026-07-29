import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { demoGet, demoSet, todayISO } from '../lib/demoMode'
import { calcDisciplineScore } from '../lib/discipline'
import { formatDuration } from '../lib/utils'
import { getPlans, uid } from '../lib/store'
import type { DailyLog } from '../types/database.types'

interface LiveSet {
  id: string
  name: string
  weight: number
  reps: number
  done: boolean
}

export function ActiveWorkout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { showToast } = useToast()
  const planId = params.get('plan')
  const [startedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [rows, setRows] = useState<LiveSet[]>([])

  useEffect(() => {
    const plan = planId ? getPlans().find((p) => p.id === planId) : null
    if (plan && plan.items.length > 0) {
      const seeded: LiveSet[] = []
      plan.items.forEach((item) => {
        for (let i = 0; i < Math.max(1, item.sets); i += 1) {
          seeded.push({
            id: uid(),
            name: item.exercise_name,
            weight: item.weight,
            reps: item.reps,
            done: false,
          })
        }
      })
      setRows(seeded)
    } else {
      setRows([
        { id: uid(), name: 'Custom Move', weight: 0, reps: 10, done: false },
      ])
    }
  }, [planId])

  useEffect(() => {
    const t = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(t)
  }, [startedAt])

  const doneCount = useMemo(() => rows.filter((r) => r.done).length, [rows])

  function toggle(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = !r.done
        if (next) showToast('set')
        return { ...r, done: next }
      }),
    )
  }

  function addRow() {
    const last = rows[rows.length - 1]
    setRows((prev) => [
      ...prev,
      {
        id: uid(),
        name: last?.name ?? 'Custom Move',
        weight: last?.weight ?? 0,
        reps: last?.reps ?? 10,
        done: false,
      },
    ])
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    showToast('delete_set')
  }

  function finish() {
    const date = todayISO()
    const daily = demoGet<DailyLog | null>(`daily_${date}`, null) ?? {
      id: crypto.randomUUID(),
      user_id: 'demo',
      log_date: date,
      workout_completed: false,
      protein_hit: false,
      water_hit: false,
      sleep_hit: false,
    }
    const updated = { ...daily, workout_completed: true }
    demoSet(`daily_${date}`, {
      ...updated,
      discipline_score: calcDisciplineScore(updated),
    })

    const completedSets = rows.filter((r) => r.done)
    if (completedSets.length > 0) {
      const historyEntry = {
        id: crypto.randomUUID(),
        date,
        elapsed,
        planId: planId ?? undefined,
        sets: completedSets.map((r) => ({ name: r.name, weight: r.weight, reps: r.reps })),
      }
      const history = demoGet<unknown[]>('workout_history', [])
      demoSet('workout_history', [historyEntry, ...history].slice(0, 100))
    }

    showToast('workout_done')
    navigate('/', { replace: true })
  }

  return (
    <div className="g-page">
      <header className="border-3 border-jet bg-jeepney text-dirty p-4 shadow-hard flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Live Session</p>
          <h1 className="font-display text-4xl mt-1">BAKAL</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold">{formatDuration(elapsed)}</p>
          <p className="text-xs">{doneCount} sets</p>
        </div>
      </header>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`g-card !p-3 space-y-2 ${row.done ? 'bg-malunggay/20' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <input
                className="g-input !py-1.5 font-bold"
                value={row.name}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                  )
                }
              />
              <span className="font-mono text-xs text-asphalt">#{idx + 1}</span>
              {rows.length > 1 && (
                <button type="button" className="g-btn-ghost !p-1" onClick={() => deleteRow(row.id)}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="number"
                className="g-input !py-2 font-mono"
                value={row.weight || ''}
                placeholder="kg"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, weight: Number(e.target.value) || 0 } : r,
                    ),
                  )
                }
              />
              <input
                type="number"
                className="g-input !py-2 font-mono"
                value={row.reps || ''}
                placeholder="reps"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, reps: Number(e.target.value) || 0 } : r,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() => toggle(row.id)}
                className={`g-btn h-12 w-12 flex items-center justify-center ${
                  row.done ? 'bg-malunggay text-dirty shadow-none' : 'bg-dirty shadow-hardSm'
                }`}
              >
                <Check size={18} strokeWidth={3} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="g-btn-ghost w-full" onClick={addRow}>
        <Plus size={16} className="inline mr-2" />
        Add Set
      </button>

      <button type="button" className="g-btn-primary w-full text-xl py-4" onClick={finish}>
        FINISH
      </button>

      <button type="button" className="g-btn-ghost w-full" onClick={() => navigate('/bakal')}>
        Back to Library
      </button>
    </div>
  )
}
