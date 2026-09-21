import { useState, useEffect } from 'react'
import { Smartphone, Tablet, Watch, Headphones } from 'lucide-react'
import { cn } from '../../utils'

export type ProductImageKind = 'smartphone' | 'tablet' | 'watch' | 'headphones'

interface ProductImageProps {
  src?: string
  alt?: string
  fallbackSrc?: string
  className?: string
  imgClassName?: string
  // When true the image is fitted inside its box (object-contain) on a
  // transparent stage instead of cropping to cover. Used by premium product
  // cards so phones are shown whole with breathing room around them.
  contain?: boolean
  // Category-aware placeholder icon shown when the image is missing/broken.
  kind?: ProductImageKind
}

const FALLBACK_ICON = {
  smartphone: Smartphone,
  tablet: Tablet,
  watch: Watch,
  headphones: Headphones,
}

// Renders a product image that degrades gracefully: if the URL is missing or
// fails to load, a soft placeholder tile with a phone icon is shown instead of
// a broken image icon.
export default function ProductImage({ src, alt = '', fallbackSrc, className, imgClassName, contain = false, kind = 'smartphone' }: ProductImageProps) {
  const [failed, setFailed] = useState(false)
  const FallbackIcon = FALLBACK_ICON[kind] || Smartphone
  const url = (!src && fallbackSrc) ? fallbackSrc : src
  const showImage = typeof url === 'string' && url.length > 0 && !failed

  useEffect(() => {
    setFailed(false)
  }, [url])

  return (
    <div className={cn(
      'flex items-center justify-center overflow-hidden',
      contain ? 'bg-transparent' : 'bg-gray-100',
      className
    )}>
      {showImage ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className={cn('h-full w-full', contain ? 'object-contain' : 'object-cover', imgClassName)}
        />
      ) : (
        <FallbackIcon className="h-1/3 w-1/3 text-gray-400" />
      )}
    </div>
  )
}