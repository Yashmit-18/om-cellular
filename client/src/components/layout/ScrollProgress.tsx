import { useEffect, useRef } from 'react'

/**
 * Quiet 2px scroll progress hairline at the very top of the viewport.
 * Reads scroll progress inside requestAnimationFrame and mutates the bar's
 * width directly (no React re-renders). Purely decorative (aria-hidden).
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const docEl = document.documentElement
      const total = docEl.scrollHeight - docEl.clientHeight
      const pct = total > 0 ? Math.min(Math.max(docEl.scrollTop / total, 0), 1) : 0
      if (barRef.current) barRef.current.style.width = `${(pct * 100).toFixed(2)}%`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5">
      <div
        ref={barRef}
        className="h-full w-0 bg-gradient-to-r from-navy-900 via-gold-500 to-gold-400"
        style={{ transition: 'width 120ms ease-out' }}
      />
    </div>
  )
}