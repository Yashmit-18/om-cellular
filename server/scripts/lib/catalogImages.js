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
function candidateUrls(brand, model) {
  const full = String(model).trim()
  if (!full) return []
  const brandWord = String(brand).trim()
  const mKey = brandKey(brandWord)
  const fullSlug = slugify(full)
  const urls = []
  if (fullSlug) {
    urls.push(`${GS_BIGPIC}/${mKey}-${fullSlug}.jpg`)
    // Some SKUs split into 4G/5G files.
    urls.push(`${GS_BIGPIC}/${mKey}-${fullSlug}-5g.jpg`)
  }
  let stripped = full
  if (brandWord && stripped.toLowerCase().startsWith(brandWord.toLowerCase())) {
    stripped = stripped.slice(brandWord.length).trim()
  }
  const strippedSlug = slugify(stripped)
  if (strippedSlug && strippedSlug !== fullSlug) {
    const u = `${GS_BIGPIC}/${mKey}-${strippedSlug}.jpg`
    if (!urls.includes(u)) urls.push(u)
  }
  const literal = `${GS_BIGPIC}/${slugify(brandWord)}-${fullSlug}.jpg`
  if (!urls.includes(literal)) urls.push(literal)
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
    // Read only the first chunk(s) of the body to make sure it isn't an HTML error page.
    const reader = res.body && res.body.getReader ? res.body.getReader() : null
    let bodyStart = ''
    if (reader) {
      try {
        const first = await reader.read()
        const second = first.done ? null : await reader.read()
        if (first.value) bodyStart += Buffer.from(first.value).toString('utf8')
        if (second && second.value) bodyStart += Buffer.from(second.value).toString('utf8')
      } catch { /* ignore */ } finally {
        reader.cancel().catch(() => {})
      }
    }
    if (bodyStart.length > 0 && /<html|<!\w/i.test(bodyStart)) return false
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

// Ask GSMArena's search page for the real bigpic URL of a phone.
async function scrapeGsmarenaUrl(query) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(
      `https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(query)}`,
      { headers: { 'user-agent': UA, accept: 'text/html' }, signal: controller.signal, redirect: 'follow' }
    )
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/https?:\/\/fdn2\.gsmarena\.com\/vv\/bigpic\/[^"'?#]+\.(?:jpe?g|png)/i)
    if (match) return match[0]
    const relative = html.match(/\/\/fdn2\.gsmarena\.com\/vv\/bigpic\/[^"'?#]+\.(?:jpe?g|png)/i)
    if (relative) return 'https:' + relative[0]
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Resolve a verified image URL for (brand, model). Returns null when none found.
// If `existing` is already a valid image it is returned as-is (no churn).
async function resolveImageUrl(brand, model, existing) {
  if (existing && (await verifyImageUrl(existing))) return existing
  for (const url of candidateUrls(brand, model)) {
    if (await verifyImageUrl(url)) return url
  }
  const scraped = await scrapeGsmarenaUrl(`${brand} ${model}`)
  if (scraped && (await verifyImageUrl(scraped))) return scraped
  return null
}

// Resolve in bulk with a small delay between external requests to be polite.
async function resolveMany(items, onProgress) {
  const results = []
  for (let i = 0; i < items.length; i++) {
    const { brand, model, existing } = items[i]
    const image = await resolveImageUrl(brand, model, existing)
    results.push({ brand, model, image })
    if (onProgress) onProgress(i + 1, items.length, brand, model, image)
    await new Promise(r => setTimeout(r, 120))
  }
  return results
}

module.exports = { resolveImageUrl, resolveMany, verifyImageUrl, candidateUrls, slugify }