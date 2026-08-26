'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

export default function EditFAQPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const fetchFaq = useCallback(async () => {
    try {
      const res = await fetch(`/api/faqs/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const f = data.faq;
      setQuestion(f.question);
      setAnswer(f.answer);
      setCategory(f.category || '');
      setSortOrder(f.sortOrder.toString());
    } catch {
      toast.error('Failed to load FAQ');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchFaq(); }, [fetchFaq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/faqs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category: category || null, sortOrder: parseInt(sortOrder) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success('FAQ updated');
      router.push('/admin/faqs');
    } catch {
      toast.error('Failed to update FAQ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={6} />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/faqs')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit FAQ</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
            <Textarea label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required rows={5} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/faqs')}>Cancel</Button>
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
