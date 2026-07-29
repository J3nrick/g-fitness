export function calcDisciplineScore(log: {
  workout_completed?: boolean
  protein_hit?: boolean
  water_hit?: boolean
  sleep_hit?: boolean
} | null): number {
  if (!log) return 0
  let score = 0
  if (log.workout_completed) score += 40
  if (log.protein_hit) score += 30
  if (log.water_hit) score += 15
  if (log.sleep_hit) score += 15
  return score
}
