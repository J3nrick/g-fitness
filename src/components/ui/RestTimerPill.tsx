import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface RestTimerPillProps {
  active: boolean
  defaultSeconds?: number
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
  onDismiss,
}: RestTimerPillProps) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds)
  const [total, setTotal] = useState(defaultSeconds)
  const [running, setRunning] = useState(false)
  const chimed = useRef(false)

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

  const barPct = total > 0 ? (secondsLeft / total) * 100 : 0
  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60

  return (
    <div className="fixed bottom-28 right-4 z-[60] max-w-md pointer-events-none">
      <div className="pointer-events-auto ml-auto w-fit space-y-2">
        <div className="border-3 border-jet bg-dirty shadow-hard px-3 py-2 flex items-center gap-3">
          <div className="min-w-[52px]">
            <p className="g-label !text-[10px]">Rest</p>
            <p className="font-mono text-lg font-bold leading-none">
              {m}:{String(s).padStart(2, '0')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => restart(secondsLeft + 30)}
            className="g-btn-ghost !py-1 !px-2 text-xs"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(0)
              setRunning(false)
            }}
            className="g-btn-ghost !py-1 !px-2 text-xs"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="g-btn-ghost !p-1"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        <div className="h-2 w-full border-2 border-jet bg-dirty overflow-hidden">
          <div
            className="h-full bg-jeepney transition-all duration-1000 linear"
            style={{ width: `${barPct}%` }}
          />
        </div>

        <div className="flex gap-1.5 justify-end">
          {[90, 60, 30].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => restart(preset)}
              className={`g-btn text-[10px] font-bold px-2 py-1 ${
                total === preset && running
                  ? 'bg-jeepney text-dirty shadow-hardSm'
                  : 'bg-dirty shadow-hardSm'
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
