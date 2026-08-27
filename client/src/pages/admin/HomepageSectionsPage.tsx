import CmsCrudPage from '../../components/admin/CmsCrudPage'

const fields = [
  { name: 'title', label: 'Title', type: 'text' as const, placeholder: 'Section title', required: true },
  { name: 'subtitle', label: 'Subtitle', type: 'text' as const, placeholder: 'Section subtitle' },
  { name: 'type', label: 'Type', type: 'select' as const, options: ['featured_products', 'new_arrivals', 'best_sellers', 'categories', 'custom'] },
  { name: 'ctaText', label: 'CTA Text', type: 'text' as const, placeholder: 'View All' },
  { name: 'ctaLink', label: 'CTA Link', type: 'text' as const, placeholder: '/products' },
  { name: 'image', label: 'Image URL', type: 'text' as const, placeholder: 'https://...' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' as const },
  { name: 'isActive', label: 'Enabled', type: 'checkbox' as const },
]

export default function HomepageSectionsPage() {
  return (
    <CmsCrudPage
      title="Homepage Sections"
      endpoint="/homepage-sections"
      singular="Section"
      fields={fields}
      displayName={(item) => `${item.title || item.id} (${item.type})`}
    />
  )
}
