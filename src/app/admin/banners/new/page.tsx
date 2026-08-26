'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import ImageUpload from '@/components/ui/image-upload';
import { useToast } from '@/components/ui/toast';

export default function NewBannerPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle || undefined,
          image: '/images/banner-placeholder.jpg',
          ctaText: ctaText || undefined,
          ctaLink: ctaLink || undefined,
          sortOrder: parseInt(sortOrder) || 0,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Banner created');
      router.push('/admin/banners');
    } catch {
      toast.error('Failed to create banner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/banners')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add Banner</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Banner title" />
            <Textarea label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} placeholder="Optional subtitle" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Banner Image</p>
              <ImageUpload />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="CTA Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Shop Now" />
              <Input label="CTA Link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/shop" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Active</label>
              <button type="button" onClick={() => setIsActive(!isActive)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isActive ? 'bg-[#2563eb]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/banners')}>Cancel</Button>
              <Button type="submit" loading={loading}><Save className="h-4 w-4" /> Create Banner</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
