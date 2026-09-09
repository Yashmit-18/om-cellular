import { useEffect } from 'react'

// Client-side SEO: updates <title>, meta description, canonical link and
// optionally injects JSON-LD structured data. This is best-effort for a
// client-rendered SPA; full crawler coverage should be added with
// prerendering/SSR when available.
export function useDocumentMeta(opts: { title?: string; description?: string; canonical?: string; jsonLd?: Record<string, unknown> }) {
  const { title, description, canonical: canonicalUrl, jsonLd } = opts
  const jsonLdKey = JSON.stringify(jsonLd)
  const hasJsonLd = Boolean(jsonLd)

  useEffect(() => {
    if (title) document.title = title

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description
    }

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = canonicalUrl
    }

    let ldScript = document.getElementById('page-jsonld')
    if (hasJsonLd) {
      if (!ldScript) {
        ldScript = document.createElement('script')
        ldScript.id = 'page-jsonld'
        ldScript.setAttribute('type', 'application/ld+json')
        document.head.appendChild(ldScript)
      }
      ldScript.textContent = jsonLdKey
    } else if (ldScript) {
      ldScript.remove()
    }
  }, [title, description, canonicalUrl, hasJsonLd, jsonLdKey])
}
