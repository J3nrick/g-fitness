interface WeightPoint {
  weight: number
  logged_at: string
}

interface WeightChartProps {
  data: WeightPoint[]
}

export function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="g-card h-48 flex items-center justify-center text-asphalt text-sm">
        Log weight to see your curve.
      </div>
    )
  }

  const weights = data.map((d) => d.weight)
  const min = Math.min(...weights) - 1
  const max = Math.max(...weights) + 1
  const range = max - min || 1
  const width = 320
  const height = 160
  const pad = 12

  const coords = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2)
    const y = pad + (1 - (d.weight - min) / range) * (height - pad * 2)
    return { x, y }
  })

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = [
    `${coords[0].x},${height - pad}`,
    ...coords.map((c) => `${c.x},${c.y}`),
    `${coords[coords.length - 1].x},${height - pad}`,
  ].join(' ')

  return (
    <div className="g-card !p-4 overflow-hidden">
      <p className="g-label mb-3">Weight Trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48" role="img" aria-label="Weight progress chart">
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C62828" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#C62828" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#weightFill)" />
        <polyline fill="none" stroke="#C62828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={line} />
        {coords.map((c, i) => (
          <circle key={data[i].logged_at + i} cx={c.x} cy={c.y} r="4" fill="#111111" stroke="#C62828" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-asphalt px-1 mt-2">
        <span className="font-mono font-bold">{data[0].weight} kg</span>
        <span className="font-mono font-bold">{data[data.length - 1].weight} kg</span>
      </div>
    </div>
  )
}
