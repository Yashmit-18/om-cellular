import CmsCrudPage from '../../components/admin/CmsCrudPage'

const fields = [
  { name: 'question', label: 'Question', type: 'text' as const, placeholder: 'Question', required: true },
  { name: 'answer', label: 'Answer', type: 'textarea' as const, placeholder: 'Answer', required: true },
  { name: 'category', label: 'Category (optional)', type: 'text' as const, placeholder: 'Payment' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' as const },
  { name: 'isActive', label: 'Enabled', type: 'checkbox' as const },
]

export default function FAQsPage() {
  return (
    <CmsCrudPage
      title="FAQs"
      endpoint="/faqs"
      singular="FAQ"
      fields={fields}
      displayName={(item) => item.question || item.id}
    />
  )
}
