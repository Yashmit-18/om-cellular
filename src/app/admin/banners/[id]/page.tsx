'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import ImageUpload from '@/components/ui/image-upload';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchBanner = useCallback(async () => {
    try {
      const res = await fetch(`/api/banners/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const b = data.banner;
      setTitle(b.title);
      setSubtitle(b.subtitle || '');
      setCtaText(b.ctaText || '');
      setCtaLink(b.ctaLink || '');
      setSortOrder(b.sortOrder.toString());
      setStartDate(b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '');
      setEndDate(b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '');
      setIsActive(b.isActive);
    } catch {
      toast.error('Failed to load banner');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBanner(); }, [fetchBanner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle || null,
          ctaText: ctaText || null,
          ctaLink: ctaLink || null,
          sortOrder: parseInt(sortOrder) || 0,
          startDate: startDate || null,
          endDate: endDate || null,
          isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Banner updated');
      router.push('/admin/banners');
    } catch {
      toast.error('Failed to update banner');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={8} />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/banners')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Banner</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Banner Image</p>
              <ImageUpload />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="CTA Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              <Input label="CTA Link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
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
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
