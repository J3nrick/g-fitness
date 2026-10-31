import { useEffect, useState } from 'react'

const WORDS = ['TARA.', 'TRAIN.', 'FUEL.', 'GROW.']
const HOLD_MS = 2600
const EXIT_MS = 450

/** Once-per-session brand intro. Tap anywhere to skip. */
export function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'exit' | 'done'>(() => {
    try {
      return sessionStorage.getItem('g_splash_seen') ? 'done' : 'show'
    } catch {
      return 'show'
    }
  })

  useEffect(() => {
    if (phase === 'show') {
      const t = setTimeout(() => setPhase('exit'), HOLD_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'exit') {
      try {
        sessionStorage.setItem('g_splash_seen', '1')
      } catch {
        // private mode: splash just shows again next load
      }
      const t = setTimeout(() => setPhase('done'), EXIT_MS)
      return () => clearTimeout(t)
    }
  }, [phase])

  if (phase === 'done') return null

  return (
    <div
      className={`g-splash fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-dirty ${
        phase === 'exit' ? 'g-splash-exit' : ''
      }`}
      onClick={() => setPhase('exit')}
      role="status"
      aria-label="G! loading"
    >
      {/* jeepney livery stripes */}
      <div className="pointer-events-none absolute inset-x-0 top-[14%] space-y-2">
        <div className="g-stripe h-3 bg-jeepney" style={{ animationDelay: '0ms' }} />
        <div className="g-stripe h-2 bg-mango" style={{ animationDelay: '90ms' }} />
        <div className="g-stripe h-1 bg-jet" style={{ animationDelay: '180ms' }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[14%] space-y-2">
        <div className="g-stripe g-stripe-rev h-1 bg-jet" style={{ animationDelay: '180ms' }} />
        <div className="g-stripe g-stripe-rev h-2 bg-mango" style={{ animationDelay: '90ms' }} />
        <div className="g-stripe g-stripe-rev h-3 bg-jeepney" style={{ animationDelay: '0ms' }} />
      </div>

      <svg viewBox="0 0 64 64" className="g-splash-mark h-40 w-40" aria-hidden="true">
        <rect className="g-splash-shadow" x="7" y="7" width="55" height="55" fill="#111111" />
        <rect x="2" y="2" width="55" height="55" fill="#C62828" stroke="#111111" strokeWidth="3" />
        <path
          className="g-splash-g"
          d="M33.5 19.5 A13 13 0 1 0 37 30 L25.5 30"
          pathLength={1}
          fill="none"
          stroke="#F5F1E8"
          strokeWidth="7.5"
        />
        <rect className="g-splash-bang" x="42.5" y="12" width="8" height="23" fill="#F4B400" stroke="#111111" strokeWidth="2" />
        <rect className="g-splash-dot" x="42.5" y="39" width="8" height="8" fill="#F4B400" stroke="#111111" strokeWidth="2" />
      </svg>

      <div className="mt-8 flex gap-2 font-poster text-3xl tracking-wider text-jet">
        {WORDS.map((w, i) => (
          <span
            key={w}
            className={`g-splash-word ${i === WORDS.length - 1 ? 'text-jeepney' : ''}`}
            style={{ animationDelay: `${1150 + i * 140}ms` }}
          >
            {w}
          </span>
        ))}
      </div>

      <div className="mt-6 h-3 w-48 border-2 border-jet bg-dirty shadow-hardSm">
        <div className="g-splash-bar h-full bg-mango" />
      </div>
      <p className="g-splash-word mt-3 g-label" style={{ animationDelay: '1800ms' }}>
        Walang guesswork. Sundan mo lang.
      </p>
    </div>
  )
}
