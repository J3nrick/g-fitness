import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface RestTimerPillProps {
  active: boolean
  defaultSeconds?: number
  energetic?: boolean
  onDismiss?: () => void
}

function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02 + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + i * 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + 0.4 + i * 0.08)
    })
    window.setTimeout(() => void ctx.close(), 800)
  } catch {
    // silent
  }
}

export function RestTimerPill({
  active,
  defaultSeconds = 90,
  energetic = false,
  onDismiss,
}: RestTimerPillProps) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds)
  const [total, setTotal] = useState(defaultSeconds)
  const [running, setRunning] = useState(false)
  const chimed = useRef(false)
  const stroke = energetic ? '#00F2FE' : '#4F8CFF'

  const restart = useCallback((secs: number) => {
    setTotal(secs)
    setSecondsLeft(secs)
    setRunning(true)
    chimed.current = false
  }, [])

  useEffect(() => {
    if (active) restart(defaultSeconds)
  }, [active, defaultSeconds, restart])

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running, secondsLeft])

  useEffect(() => {
    if (secondsLeft === 0 && running && !chimed.current) {
      chimed.current = true
      setRunning(false)
      playChime()
    }
  }, [secondsLeft, running])

  if (!active) return null

  const progress = total > 0 ? secondsLeft / total : 0
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress
  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  const barPct = total > 0 ? (secondsLeft / total) * 100 : 0

  return (
    <div className="fixed bottom-28 right-4 z-[60] max-w-md pointer-events-none">
      <div className="pointer-events-auto ml-auto w-fit space-y-2">
        <div className="g-float rounded-full px-3 py-2 flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
            <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="transition-[stroke-dasharray] duration-1000 linear"
            />
          </svg>
          <div className="pr-1 min-w-[52px]">
            <p className="g-label !text-[10px]">Rest</p>
            <p className={`g-value text-lg leading-none ${energetic ? 'text-energy' : 'text-white'}`}>
              {m}:{String(s).padStart(2, '0')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => restart(secondsLeft + 30)}
            className="g-btn h-8 px-2.5 rounded-full bg-white/5 text-xs font-semibold text-white/90"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(0)
              setRunning(false)
            }}
            className="g-btn h-8 px-2.5 rounded-full bg-white/5 text-xs font-semibold text-secondaryText"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="g-btn flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-secondaryText"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 linear ${energetic ? 'bg-energy' : 'bg-accent'}`}
            style={{ width: `${barPct}%` }}
          />
        </div>

        <div className="flex gap-1.5 justify-end">
          {[90, 60, 30].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => restart(preset)}
              className={`g-btn px-2.5 py-1 text-[10px] font-semibold rounded-full border ${
                total === preset && running
                  ? energetic
                    ? 'border-energy/40 bg-energy/20 text-energy'
                    : 'border-accent/40 bg-accent/20 text-accent'
                  : 'border-white/10 bg-card/80 text-secondaryText'
              }`}
            >
              {preset}s
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
