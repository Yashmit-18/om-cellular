import CmsCrudPage from '../../components/admin/CmsCrudPage'

const fields = [
  { name: 'title', label: 'Title', type: 'text' as const, placeholder: 'Card title', required: true },
  { name: 'description', label: 'Description', type: 'textarea' as const, placeholder: 'Card description' },
  { name: 'icon', label: 'Icon (name or class)', type: 'text' as const, placeholder: 'e.g. Shield' },
  { name: 'image', label: 'Image URL', type: 'text' as const, placeholder: 'https://...' },
  { name: 'ctaText', label: 'CTA Text', type: 'text' as const, placeholder: 'Learn More' },
  { name: 'ctaLink', label: 'CTA Link', type: 'text' as const, placeholder: '/buy-phones' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' as const },
  { name: 'isActive', label: 'Enabled', type: 'checkbox' as const },
]

export default function InformationCardsPage() {
  return (
    <CmsCrudPage
      title="Information Cards"
      endpoint="/information-cards"
      singular="Card"
      fields={fields}
      displayName={(item) => item.title || item.id}
    />
  )
}
