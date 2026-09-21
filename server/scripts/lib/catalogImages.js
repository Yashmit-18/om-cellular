// Shared helpers for resolving real, verified phone-model images.
//
// Strategy:
//  1. Build a GSMArena bigpic CDN candidate from the brand + model name
//  2. Verify the URL actually serves an image (HTTP 2xx + image/* content-type)
//  3. Fall back to GSMArena's search page to find the real bigpic URL
//  4. Only return URLs that verified successfully — never invent/broken links
//
// Used by: seedAll.js, seedPhoneCatalog.js, seedCatalogImages.js

const GS_BIGPIC = 'https://fdn2.gsmarena.com/vv/bigpic'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

// GSMArena groups some sub-brands under their parent manufacturer.
const BRAND_KEY = {
  Redmi: 'xiaomi',
  POCO: 'poco',
  iQOO: 'iqoo',
  Honor: 'honor',
  Motorola: 'moto',
}

// Hand-verified GSMArena filenames that differ from our slug guessing,
// used only as a last resort before scraping (each URL is still HTTP-verified).
const MANUAL_MAP = {
  'moto:edge 50 ultra': 'https://fdn2.gsmarena.com/vv/bigpic/moto-edge-50-ultra.jpg',
  'apple:iphone 13 mini': 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-mini.jpg',
  'samsung:galaxy z flip6': 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip6.jpg',
  'samsung:galaxy z fold6': 'https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold6.jpg',
  'nothing:nothing phone 1': 'https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-1.jpg',
  'nokia:nokia 105 4g': 'https://fdn2.gsmarena.com/vv/bigpic/nokia-105-4g.jpg',
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function brandKey(brand) {
  return BRAND_KEY[brand] || slugify(brand)
}

// Build the most likely GSMArena bigpic URLs for a phone.
// GSMArena filenames are `{manufacturerKey}-{full-model-slug}.jpg`, where
// sub-brands keep the manufacturer prefix (e.g. redmi -> xiaomi-redmi-13c.jpg).
// Many SKUs add a `-5g` marker and/or a trailing dash (e.g.
// `samsung-galaxy-s24-ultra-5g-.jpg`), so we try every reasonable variant.
function candidateUrls(brand, model) {
  const full = String(model).trim()
  if (!full) return []
  const brandWord = String(brand).trim()
  const mKey = brandKey(brandWord)
  const fullSlug = slugify(full)
  const urls = []
  const add = (u) => { if (!urls.includes(u)) urls.push(u) }
  if (fullSlug) {
    const base = `${GS_BIGPIC}/${mKey}-${fullSlug}`
    add(`${base}.jpg`)
    add(`${base}-.jpg`)
    add(`${base}-5g.jpg`)
    add(`${base}-5g-.jpg`)
  }
  let stripped = full
  if (brandWord && stripped.toLowerCase().startsWith(brandWord.toLowerCase())) {
    stripped = stripped.slice(brandWord.length).trim()
  }
  const strippedSlug = slugify(stripped)
  if (strippedSlug && strippedSlug !== fullSlug) {
    add(`${GS_BIGPIC}/${mKey}-${strippedSlug}.jpg`)
    add(`${GS_BIGPIC}/${mKey}-${strippedSlug}-.jpg`)
    add(`${GS_BIGPIC}/${mKey}-${strippedSlug}-5g.jpg`)
    add(`${GS_BIGPIC}/${mKey}-${strippedSlug}-5g-.jpg`)
  }
  const literal = `${GS_BIGPIC}/${slugify(brandWord)}-${fullSlug}.jpg`
  add(literal)
  add(`${GS_BIGPIC}/${slugify(brandWord)}-${fullSlug}-.jpg`)
  const manual = MANUAL_MAP[`${slugify(brandWord)}:${fullSlug}`]
  if (manual) add(manual)
  return urls
}

async function verifyImageUrl(url) {
  if (typeof url !== 'string' || !/^https?:\/\/.+\.(jpe?g|png|webp)$/i.test(url)) return false
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'user-agent': UA },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) return false
    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    if (!contentType.startsWith('image/')) return false
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10)
    if (contentLength && contentLength < 2000) return false
    // Read the first chunk(s) of the body: confirm real image bytes arrived and
    // the payload isn't an HTML error page. A 200 with an empty body (some CDN
    // assets serve a 0-byte file with an image/* content-type) must count as
    // broken — that is what produced the storefront's dead OnePlus image.
    const reader = res.body && res.body.getReader ? res.body.getReader() : null
    if (!reader) return false
    let bytes = 0
    let bodyStart = ''
    try {
      for (let i = 0; i < 4; i++) {
        const { value, done } = await reader.read()
        if (done) break
        if (value && value.length) {
          bytes += value.length
          if (bodyStart.length < 4096) bodyStart += Buffer.from(value).toString('utf8').slice(0, 4096 - bodyStart.length)
        }
      }
    } catch { /* network hiccup while reading */ } finally {
      reader.cancel().catch(() => {})
    }
    if (bytes < 2000) return false
    if (/<html|<!\w/i.test(bodyStart)) return false
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

// Ask GSMArena's search page for the real bigpic URL of a phone.
// Retries with exponential backoff when rate-limited (429).
async function scrapeGsmarenaUrl(query) {
  const fetchPage = async (url) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/html', referer: 'https://www.gsmarena.com/' },
        signal: controller.signal,
        redirect: 'follow',
      })
      if (res.status === 429) return { rateLimited: true }
      return { html: await res.text() }
    } catch {
      return { rateLimited: false, html: null }
    } finally {
      clearTimeout(timer)
    }
  }

  // Pull every bigpic URL from the results page along with the surrounding
  // text (anchor labels, image alt/title) so we can tell which phone a given
  // thumbnail actually belongs to. The old "first match wins" pick wrongly
  // assigned e.g. Xiaomi 12's photo to Redmi 12 and Note 13 Pro 5G's photo to
  // Redmi Note 13 5G — the search page lists many phones, and the first bigpic
  // on the page is not necessarily the queried model.
  const matches = (html) => {
    const out = []
    const re = /(?:https?:)?\/\/[a-z0-9.-]*gsmarena\.com\/vv\/bigpic\/[^"'?#\s]+\.(?:jpe?g|png)/gi
    let m
    while ((m = re.exec(html))) {
      const url = m[0].replace(/^\/\//, 'https://')
      const start = Math.max(0, m.index - 160)
      const end = Math.min(html.length, m.index + url.length + 260)
      let block = html.slice(start, end)
      block = block.replace(/<img\b[^>]*\b(?:alt|title)=["']([^"']*)["'][^>]*>/gi, (_, t) => ` ${t}`)
      const context = normalizeForMatch(block.replace(/<[^>]*>/g, ' ').replace(/&[a-z0-9#]+;/g, ' '))
      out.push({ url, context })
    }
    return out
  }

  let wait = 4
  for (let attempt = 0; attempt < 4; attempt++) {
    const page = await fetchPage(`https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(query)}`)
    if (page.rateLimited) {
      await new Promise(r => setTimeout(r, wait * 1000))
      wait *= 2
      continue
    }
    if (!page.html) return []
    return pickBigpicCandidates(query, matches(page.html))
  }
  return []
}

function normalizeForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text) {
  return normalizeForMatch(text).split(' ').filter(Boolean)
}

// Score one result context against the queried phone. All query tokens present
// verbatim => exact match (>= 100). Partial coverage scores lower; extra
// context tokens (other phones listed near the thumbnail) cost points.
function scoreContext(queryTokens, contextTokens, contextSet) {
  if (!queryTokens.length || !contextTokens.length) return 0
  let covered = 0
  let exact = true
  for (const t of queryTokens) {
    if (contextSet.has(t)) covered++
    else exact = false
  }
  if (covered === 0) return 0
  const extra = Math.max(0, contextTokens.length - queryTokens.length)
  return (covered / queryTokens.length) * 100 + (exact ? 100 : 0) - extra * 2
}

// Choose the bigpic URLs most plausibly belonging to the queried phone.
// Returns an ordered list (best first) so callers can verify each URL in turn.
// Returns [] when nothing is a confident match — never risk a wrong phone.
function pickBigpicCandidates(query, candidates) {
  const qTokens = tokenize(query)
  if (!qTokens.length) return []
  const scored = []
  for (const c of candidates) {
    const cTokens = tokenize(c.context)
    const score = scoreContext(qTokens, cTokens, new Set(cTokens))
    if (score > 0) scored.push({ url: c.url, score })
  }
  if (!scored.length) return []
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  if (top.score < 50) return []
  // Ambiguous page (a close runner-up that is not an exact token match for the
  // same phone) => reject rather than guess wrong.
  const runnerUp = scored.find(c => c.url !== top.url && c.score > top.score - 40)
  if (runnerUp && top.score < 100) return []
  return scored.filter(c => c.score >= top.score - 40).slice(0, 3).map(c => c.url)
}

// Resolve a verified image URL for (brand, model). Returns null when none found.
// If `existing` is already a valid image it is returned as-is (no churn).
async function resolveImageUrl(brand, model, existing) {
  if (existing && (await verifyImageUrl(existing))) return existing
  for (const url of candidateUrls(brand, model)) {
    if (await verifyImageUrl(url)) return url
  }
  const scraped = await scrapeGsmarenaUrl(`${brand} ${model}`)
  for (const url of scraped) {
    if (await verifyImageUrl(url)) return url
  }
  return null
}

// Resolve in bulk with a small delay between external requests to be polite.
async function resolveMany(items, onProgress, { concurrency = 3 } = {}) {
  const results = []
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      const { brand, model, existing } = items[i]
      const image = await resolveImageUrl(brand, model, existing)
      results[i] = { brand, model, image }
      if (onProgress) onProgress(i + 1, items.length, brand, model, image)
      await new Promise(r => setTimeout(r, 60))
    }
  }
  const tasks = []
  const n = Math.max(1, Math.min(concurrency, items.length || 1))
  for (let w = 0; w < n; w++) tasks.push(worker())
  await Promise.all(tasks)
  return results
}

module.exports = { resolveImageUrl, resolveMany, verifyImageUrl, candidateUrls, slugify }