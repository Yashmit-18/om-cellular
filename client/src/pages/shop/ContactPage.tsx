import { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { contactRequestService } from '../../services/contactRequest.service'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      await contactRequestService.createContactRequest(form)
      toast.success('Message sent! We will get back to you soon.')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch {
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-center">Contact Us</h1>
      <p className="mt-2 text-center text-gray-500">We&apos;d love to hear from you</p>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="card p-6 text-center">
          <Phone className="mx-auto h-8 w-8 text-brand-500" />
          <h3 className="mt-3 font-semibold">Call Us</h3>
          <p className="mt-1 text-sm text-gray-500">+91 98765 43210</p>
        </div>
        <div className="card p-6 text-center">
          <Mail className="mx-auto h-8 w-8 text-brand-500" />
          <h3 className="mt-3 font-semibold">Email Us</h3>
          <p className="mt-1 text-sm text-gray-500">support@omcellular.com</p>
        </div>
        <div className="card p-6 text-center">
          <MapPin className="mx-auto h-8 w-8 text-brand-500" />
          <h3 className="mt-3 font-semibold">Visit Us</h3>
          <p className="mt-1 text-sm text-gray-500">OM Cellular Store</p>
        </div>
      </div>
      <div className="mt-12 card p-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold">Send a Message</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="block text-sm font-medium text-gray-700">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input mt-1" required /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="block text-sm font-medium text-gray-700">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input mt-1" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Subject</label><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input mt-1" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Message *</label><textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="input mt-1" rows={5} required /></div>
          <button type="submit" disabled={loading} className="btn-primary">
            <Send className="mr-2 h-4 w-4" /> {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  )
}
