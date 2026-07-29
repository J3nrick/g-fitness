interface DisciplineScoreBarProps {
  score: number
}

export function DisciplineScoreBar({ score }: DisciplineScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const perfect = clamped >= 100

  return (
    <div className={`g-card space-y-3 ${perfect ? 'animate-success-pulse border-success/30' : ''}`}>
      <div className="flex items-end justify-between">
        <div>
          <p className="g-label">Daily Discipline</p>
          <p className="g-title mt-1">Show-up Index</p>
        </div>
        <p className={`g-value text-xl ${perfect ? 'text-success' : 'text-white'}`}>
          {clamped}%
        </p>
      </div>
      <div className="w-full bg-subcanvas h-3 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            perfect
              ? 'bg-gradient-to-r from-success to-success'
              : 'bg-gradient-to-r from-accent to-success'
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        Workout 40 · Protein 30 · Water 15 · Sleep 15
      </p>
    </div>
  )
}
