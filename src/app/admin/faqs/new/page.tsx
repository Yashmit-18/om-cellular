'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

export default function NewFAQPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) { toast.error('Question and answer are required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, category: category || undefined, sortOrder: parseInt(sortOrder) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success('FAQ created');
      router.push('/admin/faqs');
    } catch {
      toast.error('Failed to create FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/faqs')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add FAQ</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} required placeholder="What do customers frequently ask?" />
            <Textarea label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required rows={5} placeholder="Provide a detailed answer" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Shipping, Returns" />
              <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/faqs')}>Cancel</Button>
              <Button type="submit" loading={loading}><Save className="h-4 w-4" /> Create FAQ</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
