import CmsCrudPage from '../../components/admin/CmsCrudPage'

const fields = [
  { name: 'customerName', label: 'Customer Name', type: 'text' as const, placeholder: 'John Doe', required: true },
  { name: 'customerImage', label: 'Customer Image URL', type: 'text' as const, placeholder: 'https://...' },
  { name: 'rating', label: 'Rating (1-5)', type: 'number' as const },
  { name: 'comment', label: 'Comment', type: 'textarea' as const, placeholder: 'Customer review', required: true },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' as const },
  { name: 'isActive', label: 'Enabled', type: 'checkbox' as const },
]

export default function TestimonialsPage() {
  return (
    <CmsCrudPage
      title="Testimonials"
      endpoint="/testimonials"
      singular="Testimonial"
      fields={fields}
      displayName={(item) => item.customerName || item.id}
    />
  )
}
