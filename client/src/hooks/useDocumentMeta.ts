import { useEffect } from 'react'

// Client-side SEO: updates <title>, meta description, canonical link and
// optionally injects JSON-LD structured data. This is best-effort for a
// client-rendered SPA; full crawler coverage should be added with
// prerendering/SSR when available.
export function useDocumentMeta(opts: { title?: string; description?: string; canonical?: string; jsonLd?: Record<string, unknown> }) {
  const jsonLdKey = JSON.stringify(opts.jsonLd)

  useEffect(() => {
    if (opts.title) document.title = opts.title

    if (opts.description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = opts.description
    }

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (opts.canonical) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = opts.canonical
    }

    let ldScript = document.getElementById('page-jsonld')
    if (opts.jsonLd) {
      if (!ldScript) {
        ldScript = document.createElement('script')
        ldScript.id = 'page-jsonld'
        ldScript.setAttribute('type', 'application/ld+json')
        document.head.appendChild(ldScript)
      }
      ldScript.textContent = JSON.stringify(opts.jsonLd)
    } else if (ldScript) {
      ldScript.remove()
    }
  }, [opts.title, opts.description, opts.canonical, jsonLdKey])
}