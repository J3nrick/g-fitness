import { useMemo, useState } from 'react'
import { Check, Dices } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { DEFAULT_COACH, generateKatamad } from '../lib/coach'
import { demoGet, demoSet, todayISO } from '../lib/demoMode'
import { calcDisciplineScore } from '../lib/discipline'
import { getCoachProfile } from '../lib/store'
import { ExerciseGuide } from '../components/workout/ExerciseGuide'
import type { DailyLog } from '../types/database.types'

export function Katamad() {
  const { showToast } = useToast()
  const coach = getCoachProfile() ?? DEFAULT_COACH
  const [challenge, setChallenge] = useState(() => generateKatamad(coach))
  const [done, setDone] = useState<Record<number, boolean>>({})
  const [started, setStarted] = useState(false)
  const [guideId, setGuideId] = useState<string | null>(null)

  const allDone = useMemo(
    () => challenge.moves.every((_, i) => done[i]),
    [challenge, done],
  )

  function roll() {
    setChallenge(generateKatamad(coach))
    setDone({})
    setStarted(false)
    setGuideId(null)
  }

  function completeDay() {
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
    demoSet(`daily_${date}`, { ...updated, discipline_score: calcDisciplineScore(updated) })
    showToast('katamad_done')
  }

  return (
    <div className="g-page">
      <header className="border-3 border-jet bg-traffic text-dirty p-4 shadow-hard">
        <div className="flex items-center gap-2">
          <Dices size={28} />
          <h1 className="font-display text-4xl">KATAMAD</h1>
        </div>
        <p className="mt-2 text-sm font-medium">
          Built for you: {coach.experience} · {coach.location} · defeats excuses
        </p>
      </header>

      <button type="button" className="g-btn-accent w-full" onClick={roll}>
        <Dices size={16} className="inline mr-2" />
        Roll Again (same level OK)
      </button>

      <div className="g-card !p-0 overflow-hidden">
        <div className="bg-jet text-dirty px-4 py-3 flex items-center justify-between">
          <p className="font-display text-xl">TODAY&apos;S CHALLENGE</p>
          <span className="font-mono text-sm bg-mango text-jet px-2 py-1 border-2 border-dirty">
            ~{challenge.minutes} MIN
          </span>
        </div>
        <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-concrete border-b-3 border-jet">
          {challenge.difficulty}
        </p>
        <ul>
          {challenge.moves.map((move, i) => (
            <li key={`${move.name}-${i}`} className="border-b-3 border-jet last:border-b-0">
              <div className="flex">
                <button
                  type="button"
                  disabled={!started}
                  onClick={() => setDone((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className={`flex-1 flex items-center gap-3 px-4 py-4 text-left disabled:opacity-50 ${
                    done[i] ? 'bg-malunggay/25' : 'bg-dirty'
                  }`}
                >
                  <span className={`g-check ${done[i] ? 'g-check-on' : ''}`}>
                    {done[i] ? <Check size={14} strokeWidth={3} /> : null}
                  </span>
                  <div>
                    <p className={`font-bold ${done[i] ? 'line-through text-asphalt' : ''}`}>{move.name}</p>
                    <p className="font-mono text-sm text-asphalt">{move.reps}</p>
                  </div>
                </button>
                {move.exercise_id && (
                  <button
                    type="button"
                    className="border-l-3 border-jet px-3 text-xs font-bold uppercase bg-concrete"
                    onClick={() => setGuideId(move.exercise_id!)}
                  >
                    How
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {guideId && <ExerciseGuide exerciseId={guideId} onClose={() => setGuideId(null)} />}

      {!started ? (
        <button type="button" className="g-btn-primary w-full text-xl py-4" onClick={() => setStarted(true)}>
          START
        </button>
      ) : (
        <button
          type="button"
          className="g-btn-primary w-full text-xl py-4"
          disabled={!allDone}
          onClick={completeDay}
        >
          {allDone ? 'DONE — MARK WORKOUT' : 'FINISH ALL MOVES'}
        </button>
      )}
    </div>
  )
}
