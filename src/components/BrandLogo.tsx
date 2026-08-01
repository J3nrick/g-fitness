type BrandLogoProps = {
  className?: string
  alt?: string
}

/** Official G! mark from brand board. */
export function BrandLogo({ className = 'w-full max-w-sm mx-auto', alt = 'G!' }: BrandLogoProps) {
  return (
    <img
      src="/g-logo.png"
      alt={alt}
      className={`block border-3 border-jet shadow-hard object-cover ${className}`}
      decoding="async"
    />
  )
}

export function BrandMark({ className = 'h-10 w-10', alt = 'G!' }: BrandLogoProps) {
  return (
    <img
      src="/favicon.png"
      alt={alt}
      className={`block border-2 border-jet object-cover ${className}`}
      decoding="async"
    />
  )
}
