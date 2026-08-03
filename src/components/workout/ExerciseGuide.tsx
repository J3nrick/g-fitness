import { getLibraryExercise, getLibraryByName, type LibraryExercise } from '../../data/exercises'

interface ExerciseGuideProps {
  exerciseId?: string
  exerciseName?: string
  onClose?: () => void
}

function resolve(exerciseId?: string, exerciseName?: string): LibraryExercise | undefined {
  if (exerciseId) return getLibraryExercise(exerciseId) ?? getLibraryByName(exerciseId)
  if (exerciseName) return getLibraryByName(exerciseName)
  return undefined
}

export function ExerciseGuide({ exerciseId, exerciseName, onClose }: ExerciseGuideProps) {
  const ex = resolve(exerciseId, exerciseName)
  if (!ex) {
    return (
      <div className="g-card">
        <p className="font-bold">No guide yet for this move.</p>
        <p className="text-sm text-asphalt mt-1">You can still log it — custom exercises are allowed.</p>
        {onClose && (
          <button type="button" className="g-btn-ghost mt-3 w-full" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    )
  }

  const stars = ex.difficulty === 'beginner' ? '★☆☆' : ex.difficulty === 'intermediate' ? '★★☆' : '★★★'

  return (
    <div className="g-card space-y-4 !p-0 overflow-hidden">
      <div className="bg-jet text-dirty px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg leading-none">{ex.name.toUpperCase()}</p>
          <p className="text-xs mt-2 uppercase tracking-widest opacity-80">
            {ex.primary}
            {ex.secondary.length ? ` · ${ex.secondary.join(', ')}` : ''}
          </p>
        </div>
        {onClose && (
          <button type="button" className="border-2 border-dirty px-2 py-1 text-xs font-bold" onClick={onClose}>
            CLOSE
          </button>
        )}
      </div>

      <div className="px-4 grid grid-cols-3 gap-2 text-center">
        <div className="border-3 border-jet p-2">
          <p className="g-label">Sets</p>
          <p className="font-mono font-bold">{ex.default_sets}</p>
        </div>
        <div className="border-3 border-jet p-2">
          <p className="g-label">Reps</p>
          <p className="font-mono font-bold text-sm">{ex.default_reps}</p>
        </div>
        <div className="border-3 border-jet p-2">
          <p className="g-label">Rest</p>
          <p className="font-mono font-bold">{ex.rest_seconds}s</p>
        </div>
      </div>

      <div className="px-4">
        <p className="g-label mb-1">Difficulty</p>
        <p className="font-display text-lg text-jeepney">{stars}</p>
      </div>

      <div className="px-4">
        <p className="g-label mb-2">Form Sketch</p>
        <pre className="border-3 border-jet bg-concrete p-3 font-mono text-xs leading-4 whitespace-pre">
          {ex.illustration}
        </pre>
      </div>

      <div className="px-4">
        <p className="font-display text-lg mb-2">HOW TO PERFORM</p>
        <ol className="space-y-2">
          {ex.instructions.map((step: string, i: number) => (
            <li key={step} className="flex gap-3 text-sm font-medium">
              <span className="font-mono font-bold text-jeepney">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="px-4">
        <p className="font-display text-lg mb-2">COMMON MISTAKES</p>
        <ul className="space-y-1">
          {ex.mistakes.map((m: string) => (
            <li key={m} className="text-sm font-bold text-traffic">
              • {m}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 pb-4">
        <p className="font-display text-lg mb-2">TIPS</p>
        <ul className="space-y-1">
          {ex.tips.map((t: string) => (
            <li key={t} className="text-sm font-medium">
              • {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
