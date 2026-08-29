import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { cn } from '../../utils'

interface ProductImageProps {
  src?: string
  alt?: string
  fallbackSrc?: string
  className?: string
  imgClassName?: string
}

// Renders a product image that degrades gracefully: if the URL is missing or
// fails to load, a soft placeholder tile with a phone icon is shown instead of
// a broken image icon.
export default function ProductImage({ src, alt = '', fallbackSrc, className, imgClassName }: ProductImageProps) {
  const [failed, setFailed] = useState(false)
  const url = (!src && fallbackSrc) ? fallbackSrc : src
  const showImage = typeof url === 'string' && url.length > 0 && !failed

  return (
    <div className={cn('flex items-center justify-center overflow-hidden bg-gray-100', className)}>
      {showImage ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <Smartphone className="h-1/3 w-1/3 text-gray-300" />
      )}
    </div>
  )
}