// Deterministic, realistic product profiles (specs, colors, highlights) for the
// premium phone catalog. Hero models get hand-written specs; the long tail gets
// sensible tiered defaults so every product looks finished and consistent.

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

function tierOf(modelName) {
  const m = norm(modelName)
  if (/pro max|ultra|fold|rog|find x|200 pro|magic6 pro|x200 pro|x100 pro|14 ultra|z flip6/.test(m)) return 3
  if (/ pro$| pro\+| pro 5g|plus|max|oneplus 1[23]|pixel 9|pixel 8 pro|13 pro|12 pro|gt 5 pro|gt 6 pro|edge 50 (pro|ultra)|xfinity/i.test(m)) return 3
  if (/s24|s23|iphone 1[1-6]/.test(m)) return 3
  if (/z flip5|z fold5|phone 2|pixel 8|pixel 7 pro|v30 pro|v40|reno 12|x200|x100|iqoo 1[23]|neo 9|note 13 pro|13 pro|12 pro|gt 6|gt 5/.test(m)) return 2
  if (/a5[45]|m5[45]|f5[45]|oneplus 12r|oneplus 11r|nord 4|edge 50|note 1[23]|13 5g|12 5g|g84|g74|poco (x6|f6|m6 pro)|phone 2a|camon 30|blaze curve|agni|magic6|8a|7a|redmi 13|redmi 12|redmi 13c|moto g6[4-7]|z9/i.test(m)) return 2
  if (/a3[45]|a25|a15|m35|m15|f35|f15|note 4[0]|nord ce|c6[5-7]|c5[135]|y28|y27|t3|a3|a3x|a78|a58|g5[4-9]|g34|hot 40|spark|pova|camon|poco (m6|c65|c55|x5)|narzo|12 5g|13 5g|infinity|g8x|blaze|z7|105|y18|t2x/.test(m)) return 1
  return 0
}

const CHIPSET_OVERRIDES = {
  'apple:iphone 11': 'A13 Bionic', 'apple:iphone 11 pro': 'A13 Bionic', 'apple:iphone 11 pro max': 'A13 Bionic',
  'apple:iphone 12': 'A14 Bionic', 'apple:iphone 12 mini': 'A14 Bionic', 'apple:iphone 12 pro': 'A14 Bionic', 'apple:iphone 12 pro max': 'A14 Bionic',
  'apple:iphone 13': 'A15 Bionic', 'apple:iphone 13 mini': 'A15 Bionic', 'apple:iphone 13 pro': 'A15 Bionic', 'apple:iphone 13 pro max': 'A15 Bionic',
  'apple:iphone 14': 'A15 Bionic', 'apple:iphone 14 plus': 'A15 Bionic', 'apple:iphone 14 pro': 'A16 Bionic', 'apple:iphone 14 pro max': 'A16 Bionic',
  'apple:iphone 15': 'A16 Bionic', 'apple:iphone 15 plus': 'A16 Bionic', 'apple:iphone 15 pro': 'A17 Pro', 'apple:iphone 15 pro max': 'A17 Pro',
  'apple:iphone 16': 'A18', 'apple:iphone 16 plus': 'A18', 'apple:iphone 16 pro': 'A18 Pro', 'apple:iphone 16 pro max': 'A18 Pro',
  'samsung:galaxy s24 ultra': 'Snapdragon 8 Gen 3', 'samsung:galaxy s24+': 'Exynos 2400', 'samsung:galaxy s24': 'Exynos 2400',
  'samsung:galaxy s23 ultra': 'Snapdragon 8 Gen 2', 'samsung:galaxy s23+': 'Snapdragon 8 Gen 2', 'samsung:galaxy s23': 'Snapdragon 8 Gen 2',
  'samsung:galaxy z fold6': 'Snapdragon 8 Gen 3', 'samsung:galaxy z flip6': 'Snapdragon 8 Gen 3',
  'oneplus:oneplus 13': 'Snapdragon 8 Elite', 'oneplus:oneplus 12': 'Snapdragon 8 Gen 3', 'oneplus:oneplus 12r': 'Snapdragon 8 Gen 2',
  'google:pixel 9 pro': 'Google Tensor G4', 'google:pixel 9': 'Google Tensor G4', 'google:pixel 8 pro': 'Google Tensor G3',
  'vivo:vivo x200 pro': 'Dimensity 9400', 'xiaomi:xiaomi 14': 'Snapdragon 8 Gen 3',
  'xiaomi:redmi note 13 pro 5g': 'Dimensity 6080', 'poco:poco f6': 'Snapdragon 8s Gen 3',
}

const CHIPSET_TIER = {
  apple: ['Apple A15 Bionic', 'Apple A16 Bionic', 'Apple A17 Pro', 'Apple A18 Pro'],
  samsung: ['Exynos 1330', 'Exynos 1380', 'Snapdragon 7 Gen 3', 'Snapdragon 8 Gen 3'],
  oneplus: ['Dimensity 6100+', 'Dimensity 7200 Pro', 'Snapdragon 7+ Gen 3', 'Snapdragon 8 Gen 3'],
  xiaomi: ['Dimensity 6100+', 'Dimensity 7200 Ultra', 'Snapdragon 7s Gen 2', 'Snapdragon 8 Gen 3'],
  redmi: ['Helio G81 Ultra', 'Dimensity 6080', 'Dimensity 7200 Ultra', 'Dimensity 7300 Ultra'],
  poco: ['Helio G36', 'Dimensity 6080', 'Snapdragon 7s Gen 2', 'Snapdragon 8s Gen 3'],
  realme: ['Helio G85', 'Dimensity 6100+', 'Dimensity 7200 Pro', 'Snapdragon 8s Gen 3'],
  vivo: ['Dimensity 6100+', 'Dimensity 7020', 'Dimensity 8300 Ultra', 'Dimensity 9400'],
  oppo: ['Dimensity 6100+', 'Dimensity 7020', 'Dimensity 8200', 'Dimensity 9400'],
  motorola: ['Snapdragon 4 Gen 2', 'Snapdragon 6 Gen 1', 'Snapdragon 7 Gen 3', 'Snapdragon 8s Gen 3'],
  nothing: ['Dimensity 7200 Pro', 'Dimensity 7200 Pro', 'Snapdragon 8+ Gen 1', 'Snapdragon 8s Gen 3'],
  google: ['Google Tensor G2', 'Google Tensor G2', 'Google Tensor G3', 'Google Tensor G4'],
  iqoo: ['Dimensity 6100+', 'Dimensity 7200', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3'],
  infinix: ['Helio G36', 'Helio G99', 'Dimensity 8020', 'Dimensity 8200 Ultimate'],
  tecno: ['Helio G36', 'Helio G88', 'Dimensity 7200', 'Dimensity 8200'],
  lava: ['Unisoc T606', 'Dimensity 6020', 'Dimensity 7050', 'Dimensity 7200'],
  nokia: ['Unisoc SC9863A', 'Unisoc T606', 'Snapdragon 480+', 'Snapdragon 4 Gen 2'],
  honor: ['Snapdragon 4 Gen 2', 'Snapdragon 6 Gen 1', 'Snapdragon 7 Gen 3', 'Snapdragon 8 Gen 3'],
  asus: ['Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'Snapdragon 8 Gen 3'],
}

const DISPLAY_TIER = [
  '6.50" HD+ LCD, 90Hz',
  '6.60" FHD+ AMOLED, 120Hz',
  '6.70" FHD+ AMOLED, 120Hz',
  '6.70" LTPO AMOLED QHD+, 120Hz',
]

const CAMERA_TIER = [
  '50MP Main Camera',
  '50MP Main + 8MP Ultra-wide',
  '50MP Main + 8MP Ultra-wide + 2MP Macro',
  '50MP Triple AI Camera System',
]

const BATTERY_TIER = ['5000mAh', '5000mAh', '5000mAh', '5000mAh']

const OS_APPLE_BY_GEN = { 11: 'iOS 17', 12: 'iOS 17', 13: 'iOS 17', 14: 'iOS 17', 15: 'iOS 18', 16: 'iOS 18' }

const DISCOUNT_EMI_THRESHOLD = 10000

function chipsetFor(brand, model) {
  const key = `${norm(brand)}:${norm(model)}`
  if (CHIPSET_OVERRIDES[key]) return CHIPSET_OVERRIDES[key]
  const arr = CHIPSET_TIER[norm(brand)] || CHIPSET_TIER.redmi
  return arr[tierOf(model)]
}

function osFor(brand, model) {
  const m = norm(model)
  const iphone = m.match(/iphone\s*(\d+)/)
  if (iphone) return OS_APPLE_BY_GEN[parseInt(iphone[1], 10)] || 'iOS 17'
  if (/pixel 9|s24|oneplus 13|13 pro|13 5g|v40|x200|reno 12|find x8|edge 50|phone 2a|iqoo 13|14 ultra|14 5g/.test(m)) return 'Android 15'
  return 'Android 14'
}

function networkFor(model, tier) {
  const m = norm(model)
  if (tier === 0 && /hot|spark|a3|a1|c2|c3|105|g2/.test(m)) return '4G LTE'
  return '5G'
}

function displayFor(model, tier) {
  const m = norm(model)
  if (/iphone|fold|flip|ultra/.test(m) && tier === 3) return '6.70" LTPO Super AMOLED QHD+, 120Hz'
  return DISPLAY_TIER[tier]
}

function cameraFor(brand, model, tier) {
  const m = norm(model)
  if (norm(brand) === 'apple' && /pro max|pro/.test(m) && !/mini|plus/.test(m)) return 'Pro-level Triple Camera System (48MP Main)'
  if (/200mp|108mp|200 m/.test(m) || /note 13 pro|gt 6 pro|x200 pro|s2[34] ultra|find x8 pro/.test(m)) return '200MP Triple AI Camera System'
  return CAMERA_TIER[tier]
}

function batteryFor(model, tier) {
  const m = norm(model)
  if (/max|pro max|ultra|rog/.test(m)) return '5000mAh'
  if (norm(m).includes('iphone')) return 'All-day battery'
  return BATTERY_TIER[tier]
}

const COLORS_BY_BRAND = {
  apple: ['Black', 'Midnight Blue', 'Starlight'],
  samsung: ['Midnight Black', 'Titanium Gray', 'Arctic Blue'],
  oneplus: ['Black', 'Silver', 'Emerald'],
  xiaomi: ['Black', 'Blue', 'White'],
  redmi: ['Black', 'Ocean Blue', 'Lime Green'],
  poco: ['Black', 'Yellow', 'Blue'],
  realme: ['Black', 'Gold', 'Purple'],
  vivo: ['Black', 'Teal', 'Coral'],
  oppo: ['Black', 'White', 'Green'],
  motorola: ['Black', 'Blue', 'Silver'],
  nothing: ['White', 'Black', 'Milk'],
  google: ['Obsidian', 'Porcelain', 'Mint'],
  iqoo: ['Black', 'White', 'Blue'],
  infinix: ['Black', 'Purple', 'Titanium'],
  tecno: ['Black', 'Blue', 'Green'],
  lava: ['Midnight Black', 'Blue', 'Gold'],
  nokia: ['Blue', 'Black', 'Green'],
  honor: ['Black', 'Green', 'Silver'],
  asus: ['Storm White', 'Phantom Black'],
}

function colorsFor(brand) {
  return COLORS_BY_BRAND[norm(brand)] || ['Black', 'Blue', 'White']
}

function whatsIncluded() {
  return [
    '1x Smartphone',
    'Charger & USB Cable',
    'SIM Ejector Tool',
    'User Manual',
    'Original Box',
    '1 Year OM Cellular Warranty',
  ]
}

function buildDescription(brand, model, chipset, display) {
  const brandName = brand || ''
  const modelName = model || ''
  return [
    `The ${brandName} ${modelName} is a ${chipset}-powered smartphone with a ${display} display, delivering a smooth experience for everyday use, gaming, photography and entertainment.`,
    `Every unit is quality-checked and covered by a 1 Year OM Cellular Warranty with genuine accessories. Buy from OM Cellular, Kota for the best price, guaranteed quality and dedicated after-sales support.`,
  ].join('\n\n')
}

function highlightsFor(model, tier) {
  return [
    tier >= 2 ? 'Premium build & display' : 'Long battery back-up',
    '5G ready',
    'Studio-grade camera',
    '1 Year OM Cellular Warranty',
    'EMI options available',
  ]
}

module.exports = {
  tierOf, chipsetFor, osFor, networkFor, displayFor, cameraFor, batteryFor,
  colorsFor, whatsIncluded, buildDescription, highlightsFor, DISCOUNT_EMI_THRESHOLD,
}