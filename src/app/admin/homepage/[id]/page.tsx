'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import ImageUpload from '@/components/ui/image-upload';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

const typeOptions = [
  { value: 'TRENDING', label: 'Trending' },
  { value: 'BEST_DEALS', label: 'Best Deals' },
  { value: 'LATEST', label: 'Latest Arrivals' },
  { value: 'REFURBISHED', label: 'Refurbished' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function EditHomepageSectionPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState('TRENDING');
  const [productIds, setProductIds] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [background, setBackground] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchSection = useCallback(async () => {
    try {
      const res = await fetch(`/api/homepage-sections/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const s = data.section;
      setTitle(s.title);
      setSubtitle(s.subtitle || '');
      setType(s.type);
      setProductIds(JSON.parse(s.productIds || '[]').join(', '));
      setCtaText(s.ctaText || '');
      setCtaLink(s.ctaLink || '');
      setSortOrder(s.sortOrder.toString());
      setBackground(s.background || '');
      setIsActive(s.isActive);
    } catch {
      toast.error('Failed to load section');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSection(); }, [fetchSection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/homepage-sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle || null,
          type,
          productIds: productIds ? productIds.split(',').map((s) => s.trim()) : [],
          ctaText: ctaText || null,
          ctaLink: ctaLink || null,
          sortOrder: parseInt(sortOrder) || 0,
          background: background || null,
          isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Section updated');
      router.push('/admin/homepage');
    } catch {
      toast.error('Failed to update section');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={8} />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/homepage')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Section</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} />
            <Select label="Section Type" options={typeOptions} value={type} onChange={setType} />
            <Textarea label="Product IDs" value={productIds} onChange={(e) => setProductIds(e.target.value)} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="CTA Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              <Input label="CTA Link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              <Input label="Background Color" value={background} onChange={(e) => setBackground(e.target.value)} />
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
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
