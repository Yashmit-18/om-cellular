'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import ImageUpload from '@/components/ui/image-upload';
import { useToast } from '@/components/ui/toast';

const typeOptions = [
  { value: 'TRENDING', label: 'Trending' },
  { value: 'BEST_DEALS', label: 'Best Deals' },
  { value: 'LATEST', label: 'Latest Arrivals' },
  { value: 'REFURBISHED', label: 'Refurbished' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function NewHomepageSectionPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState('TRENDING');
  const [productIds, setProductIds] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [background, setBackground] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/homepage-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle || undefined,
          type,
          productIds: productIds ? productIds.split(',').map((s) => s.trim()) : [],
          ctaText: ctaText || undefined,
          ctaLink: ctaLink || undefined,
          sortOrder: parseInt(sortOrder) || 0,
          background: background || undefined,
          isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Section created');
      router.push('/admin/homepage');
    } catch {
      toast.error('Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/homepage')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add Homepage Section</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Trending Now" />
            <Textarea label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} placeholder="Optional subtitle" />
            <Select label="Section Type" options={typeOptions} value={type} onChange={setType} />
            <Textarea
              label="Product IDs"
              value={productIds}
              onChange={(e) => setProductIds(e.target.value)}
              placeholder="Comma-separated product IDs (leave empty for auto)"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="CTA Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Shop Now" />
              <Input label="CTA Link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/category/..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              <Input label="Background Color" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="#ffffff" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Section Image</p>
              <ImageUpload />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Active</label>
              <button type="button" onClick={() => setIsActive(!isActive)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isActive ? 'bg-[#2563eb]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/homepage')}>Cancel</Button>
              <Button type="submit" loading={loading}><Save className="h-4 w-4" /> Create Section</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
