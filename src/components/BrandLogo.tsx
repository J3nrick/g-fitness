type BrandProps = {
  className?: string
  title?: string
}

/**
 * G! mark — vector, so it stays crisp at any size.
 * Jeepney-red tile with a hard shadow, a heavy "G" and a mango "!" that doubles as a rep bar.
 */
export function BrandMark({ className = 'h-8 w-8', title = 'G!' }: BrandProps) {
  return (
    <svg viewBox="0 0 64 64" className={`block shrink-0 ${className}`} role="img" aria-label={title}>
      <rect x="7" y="7" width="55" height="55" fill="#111111" />
      <rect x="2" y="2" width="55" height="55" fill="#C62828" stroke="#111111" strokeWidth="3" />
      <path
        d="M33.5 19.5 A13 13 0 1 0 37 30 L25.5 30"
        fill="none"
        stroke="#F5F1E8"
        strokeWidth="7.5"
        strokeLinejoin="miter"
      />
      <rect x="42.5" y="12" width="8" height="23" fill="#F4B400" stroke="#111111" strokeWidth="2" />
      <rect x="42.5" y="39" width="8" height="8" fill="#F4B400" stroke="#111111" strokeWidth="2" />
    </svg>
  )
}

/** Full lockup: mark + wordmark + tagline, for auth and splash screens. */
export function BrandLogo({ className = '', title = 'G!' }: BrandProps) {
  return (
    <div className={`flex items-center gap-3 border-2 border-jet bg-dirty p-3 shadow-hard ${className}`}>
      <BrandMark className="h-16 w-16" title={title} />
      <div className="min-w-0">
        <p className="font-display text-4xl leading-none tracking-tight text-jet">
          G<span className="text-jeepney">!</span>
        </p>
        <p className="mt-1 font-poster text-lg leading-none tracking-wider text-asphalt">
          TARA. TRAIN. FUEL. GROW.
        </p>
      </div>
    </div>
  )
}
