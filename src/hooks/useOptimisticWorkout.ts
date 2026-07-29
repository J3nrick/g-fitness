import { useCallback, useEffect, useRef } from 'react'
import { AUTH_BYPASS, demoGet, demoSet } from '../lib/demoMode'
import { supabase } from '../lib/supabase'

export interface PendingSet {
  id: string
  workout_id: string
  exercise_id: string
  weight: number
  reps: number
  is_completed: boolean
  created_at: string
}

const QUEUE_KEY = 'g_pending_sets'

function readQueue(): PendingSet[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingSet[]
  } catch {
    return []
  }
}

function writeQueue(items: PendingSet[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

async function flushQueue() {
  if (AUTH_BYPASS) return
  const queue = readQueue()
  if (queue.length === 0) return

  const remaining: PendingSet[] = []
  for (const item of queue) {
    const { error } = await supabase.from('exercise_sets').insert({
      workout_id: item.workout_id,
      exercise_id: item.exercise_id,
      weight: item.weight,
      reps: item.reps,
      is_completed: item.is_completed,
    })
    if (error) remaining.push(item)
  }
  writeQueue(remaining)
}

export function useOptimisticWorkout() {
  const flushing = useRef(false)

  const retryFlush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    try {
      await flushQueue()
    } finally {
      flushing.current = false
    }
  }, [])

  useEffect(() => {
    void retryFlush()
    const onOnline = () => void retryFlush()
    window.addEventListener('online', onOnline)
    const interval = window.setInterval(() => void retryFlush(), 15000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.clearInterval(interval)
    }
  }, [retryFlush])

  const queueSet = useCallback(
    async (payload: Omit<PendingSet, 'id' | 'created_at'> & { id?: string }) => {
      const item: PendingSet = {
        id: payload.id ?? crypto.randomUUID(),
        workout_id: payload.workout_id,
        exercise_id: payload.exercise_id,
        weight: payload.weight,
        reps: payload.reps,
        is_completed: payload.is_completed,
        created_at: new Date().toISOString(),
      }

      const local = demoGet<PendingSet[]>(`sets_${payload.workout_id}`, [])
      demoSet(`sets_${payload.workout_id}`, [...local, item])

      if (AUTH_BYPASS) return { ok: true as const }

      const { error } = await supabase.from('exercise_sets').insert({
        workout_id: item.workout_id,
        exercise_id: item.exercise_id,
        weight: item.weight,
        reps: item.reps,
        is_completed: item.is_completed,
      })

      if (error) {
        writeQueue([...readQueue(), item])
        return { ok: false as const, queued: true as const }
      }

      return { ok: true as const }
    },
    [],
  )

  return { queueSet, retryFlush, pendingCount: () => readQueue().length }
}
