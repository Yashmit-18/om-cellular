import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../utils'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay in ms (max ~300ms). Applied as transition-delay. */
  delay?: number
}

/**
 * Quiet scroll-triggered reveal wrapper.
 * Uses a single IntersectionObserver with once:true so sections fade/slide up
 * exactly as they enter the viewport. Under prefers-reduced-motion the element
 * is always visible via CSS (see index.css .reveal rules).
 */
export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}