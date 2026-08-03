type BrandLogoProps = {
  className?: string
  alt?: string
}

/** Official G! mark from brand board — kept compact so it doesn't dominate the screen. */
export function BrandLogo({ className = 'w-full max-h-24 object-cover', alt = 'G!' }: BrandLogoProps) {
  return (
    <img
      src="/g-logo.png"
      alt={alt}
      className={`block border-2 border-jet shadow-hardSm ${className}`}
      decoding="async"
    />
  )
}

export function BrandMark({ className = 'h-8 w-8', alt = 'G!' }: BrandLogoProps) {
  return (
    <img
      src="/favicon.png"
      alt={alt}
      className={`block border border-jet object-cover ${className}`}
      decoding="async"
    />
  )
}
