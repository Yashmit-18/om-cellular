import CmsCrudPage from '../../components/admin/CmsCrudPage'

const fields = [
  { name: 'title', label: 'Title', type: 'text' as const, placeholder: 'Banner title', required: true },
  { name: 'subtitle', label: 'Subtitle', type: 'text' as const, placeholder: 'Banner subtitle' },
  { name: 'image', label: 'Image URL', type: 'text' as const, placeholder: 'https://...', required: true },
  { name: 'ctaText', label: 'CTA Text', type: 'text' as const, placeholder: 'Shop Now' },
  { name: 'ctaLink', label: 'CTA Link', type: 'text' as const, placeholder: '/buy-phones' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' as const },
  { name: 'isActive', label: 'Enabled', type: 'checkbox' as const },
]

export default function BannersPage() {
  return (
    <CmsCrudPage
      title="Banners"
      endpoint="/banners"
      singular="Banner"
      fields={fields}
      displayName={(item) => item.title || item.id}
    />
  )
}
