import { useState } from 'react'
import { ChevronDown, Search, Check, RotateCcw } from 'lucide-react'
import { cn, formatPrice } from '../../utils'
import type { ProductFacets } from '../../types'

export type MultiFilterKey = 'brandIds' | 'conditions' | 'storages' | 'rams' | 'colors'
export type FlagFilterKey = 'inStock' | 'discount'

export interface ProductFilterSelection {
  categoryIds: string[]
  brandIds: string[]
  conditions: string[]
  storages: string[]
  rams: string[]
  colors: string[]
  priceMin: string
  priceMax: string
  inStock: boolean
  discount: boolean
}

interface ProductFiltersProps {
  facets: ProductFacets | null
  facetsLoading: boolean
  selection: ProductFilterSelection
  onToggle: (key: MultiFilterKey, value: string) => void
  onSelectCategory: (id: string) => void
  onToggleFlag: (key: FlagFilterKey) => void
  onPriceChange: (min: string, max: string) => void
  onClear: () => void
  idPrefix: string
}

const PRICE_PRESETS = [
  { label: 'Under ₹10,000', min: '', max: '10000' },
  { label: '₹10k – ₹20k', min: '10000', max: '20000' },
  { label: '₹20k – ₹40k', min: '20000', max: '40000' },
  { label: '₹40k – ₹60k', min: '40000', max: '60000' },
  { label: 'Over ₹60,000', min: '60000', max: '' },
]

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 py-1 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

function CheckRow({ checked, label, count, onToggle }: { checked: boolean; label: string; count?: number; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-ivory-50">
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        'border-gray-300 bg-white peer-checked:border-navy-900 peer-checked:bg-navy-900',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-gold-400/60 peer-focus-visible:ring-offset-1'
      )}>
        <Check className={cn('h-3 w-3 text-white transition-opacity', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
      </span>
      <span className={cn('flex-1 text-sm', checked ? 'font-medium text-navy-900' : 'text-gray-600')}>{label}</span>
      {typeof count === 'number' && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', checked ? 'bg-navy-100 text-navy-800' : 'bg-gray-100 text-gray-500')}>{count}</span>
      )}
    </label>
  )
}

function ToggleSwitch({ checked, title, description, onToggle }: { checked: boolean; title: string; description: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-ivory-50"
    >
      <span className="min-w-0">
        <span className={cn('block text-sm', checked ? 'font-medium text-navy-900' : 'text-gray-600')}>{title}</span>
        <span className="block text-[11px] text-gray-400">{description}</span>
      </span>
      <span className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-navy-900' : 'bg-gray-200')}>
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </span>
    </button>
  )
}

function FacetSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full rounded" />
      ))}
    </div>
  )
}

export default function ProductFilters({
  facets,
  facetsLoading,
  selection,
  onToggle,
  onSelectCategory,
  onToggleFlag,
  onPriceChange,
  onClear,
  idPrefix,
}: ProductFiltersProps) {
  const [brandSearch, setBrandSearch] = useState('')

  const visibleBrands = (facets?.brands || []).filter(b => b.name.toLowerCase().includes(brandSearch.trim().toLowerCase()))
  const activePricePreset = PRICE_PRESETS.findIndex(p => p.min === selection.priceMin && p.max === selection.priceMax)

  const selectedCount =
    selection.categoryIds.length +
    selection.brandIds.length +
    selection.conditions.length +
    selection.storages.length +
    selection.rams.length +
    selection.colors.length +
    (selection.priceMin || selection.priceMax ? 1 : 0) +
    (selection.inStock ? 1 : 0) +
    (selection.discount ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          {selectedCount > 0 ? `${selectedCount} applied` : 'Refine'}
        </span>
        {selectedCount > 0 && (
          <button type="button" onClick={onClear} className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900">
            <RotateCcw className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      <FilterSection title="Category">
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectCategory('')}
            className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors', selection.categoryIds.length === 0 ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-ivory-50')}
          >
            <span>All Categories</span>
          </button>
          {(facets?.categories || []).map(cat => {
            const active = selection.categoryIds.includes(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={cn('flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors', active ? 'bg-navy-50 font-medium text-navy-800' : 'text-gray-600 hover:bg-ivory-50')}
              >
                <span>{cat.name}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', active ? 'bg-navy-100 text-navy-800' : 'bg-gray-100 text-gray-500')}>{cat.count}</span>
              </button>
            )
          })}
        </div>
      </FilterSection>

      <FilterSection title="Price">
        {facetsLoading && !facets ? (
          <FacetSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={selection.priceMin}
                  onChange={e => onPriceChange(e.target.value, selection.priceMax)}
                  placeholder={facets ? String(facets.price.min) : 'Min'}
                  aria-label="Minimum price"
                  className="input !py-2 !pl-6 text-sm"
                />
              </div>
              <span className="text-gray-300">–</span>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={selection.priceMax}
                  onChange={e => onPriceChange(selection.priceMin, e.target.value)}
                  placeholder={facets ? String(facets.price.max) : 'Max'}
                  aria-label="Maximum price"
                  className="input !py-2 !pl-6 text-sm"
                />
              </div>
            </div>
            {facets && facets.price.max > 0 && (
              <p className="mt-2 text-[11px] text-gray-400">
                Catalog range {formatPrice(facets.price.min)} – {formatPrice(facets.price.max)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((preset, i) => {
                const active = i === activePricePreset
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onPriceChange(active ? '' : preset.min, active ? '' : preset.max)}
                    className={cn(
                      'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      active ? 'border-navy-900 bg-navy-900 text-white' : 'border-gray-200 text-gray-600 hover:border-navy-300 hover:text-navy-800'
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </FilterSection>

      <FilterSection title="Brand">
        {facetsLoading && !facets ? (
          <FacetSkeleton />
        ) : (
          <>
            {(facets?.brands.length || 0) > 6 && (
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={brandSearch}
                  onChange={e => setBrandSearch(e.target.value)}
                  placeholder="Find a brand"
                  aria-label="Search brands"
                  className="input !py-2 !pl-8 text-sm"
                />
              </div>
            )}
            <div className="max-h-64 space-y-0.5 overflow-y-auto pr-0.5">
              {visibleBrands.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-gray-400">No brands match “{brandSearch}”.</p>
              ) : (
                visibleBrands.map(brand => (
                  <CheckRow
                    key={brand.id}
                    checked={selection.brandIds.includes(brand.id)}
                    label={brand.name}
                    count={brand.count}
                    onToggle={() => onToggle('brandIds', brand.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </FilterSection>

      <FilterSection title="Availability">
        <div className="space-y-0.5">
          <ToggleSwitch
            checked={selection.inStock}
            title="In stock only"
            description="Hide sold-out models"
            onToggle={() => onToggleFlag('inStock')}
          />
          <ToggleSwitch
            checked={selection.discount}
            title="On sale"
            description="Only discounted listings"
            onToggle={() => onToggleFlag('discount')}
          />
        </div>
      </FilterSection>

      {facets && facets.conditions.length > 0 && (
        <FilterSection title="Condition" defaultOpen={false}>
          <div className="space-y-0.5">
            {facets.conditions.map(c => (
              <CheckRow
                key={c.value}
                checked={selection.conditions.includes(c.value)}
                label={c.label}
                count={c.count}
                onToggle={() => onToggle('conditions', c.value)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {facets && facets.storages.length > 0 && (
        <FilterSection title="Storage" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {facets.storages.map(s => {
              const active = selection.storages.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggle('storages', s)}
                  aria-pressed={active}
                  className={cn('cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors', active ? 'border-navy-900 bg-navy-900 text-white' : 'border-gray-200 text-gray-600 hover:border-navy-300 hover:text-navy-800')}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </FilterSection>
      )}

      {facets && facets.rams.length > 0 && (
        <FilterSection title="RAM" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {facets.rams.map(r => {
              const active = selection.rams.includes(r)
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onToggle('rams', r)}
                  aria-pressed={active}
                  className={cn('cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors', active ? 'border-navy-900 bg-navy-900 text-white' : 'border-gray-200 text-gray-600 hover:border-navy-300 hover:text-navy-800')}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </FilterSection>
      )}

      {facets && facets.colors.length > 0 && (
        <FilterSection title="Colour" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {facets.colors.map(c => {
              const active = selection.colors.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onToggle('colors', c)}
                  aria-pressed={active}
                  className={cn('cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors', active ? 'border-navy-900 bg-navy-900 text-white' : 'border-gray-200 text-gray-600 hover:border-navy-300 hover:text-navy-800')}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </FilterSection>
      )}

      <span id={`${idPrefix}-end`} className="sr-only">End of filters</span>
    </div>
  )
}
