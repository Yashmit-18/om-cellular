'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Plus, Edit, Trash2, Power, PowerOff, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function FAQsPage() {
  const router = useRouter();
  const toast = useToast();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/faqs');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const toggleActive = async (faq: FAQ) => {
    try {
      await fetch(`/api/faqs/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !faq.isActive }),
      });
      toast.success(`FAQ ${faq.isActive ? 'deactivated' : 'activated'}`);
      fetchFaqs();
    } catch {
      toast.error('Failed to update FAQ');
    }
  };

  const reorder = async (faq: FAQ, direction: 'up' | 'down') => {
    const idx = faqs.findIndex((f) => f.id === faq.id);
    const swap = direction === 'up' ? faqs[idx - 1] : faqs[idx + 1];
    if (!swap) return;
    try {
      await Promise.all([
        fetch(`/api/faqs/${faq.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: swap.sortOrder }) }),
        fetch(`/api/faqs/${swap.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: faq.sortOrder }) }),
      ]);
      fetchFaqs();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/faqs/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('FAQ deleted');
      setDeleteTarget(null);
      fetchFaqs();
    } catch {
      toast.error('Failed to delete FAQ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500">Manage frequently asked questions</p>
        </div>
        <Button onClick={() => router.push('/admin/faqs/new')}>
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="text" count={5} />
      ) : faqs.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQs" description="Create your first FAQ." actionLabel="Add FAQ" onAction={() => router.push('/admin/faqs/new')} />
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <Card key={faq.id} padding="md" className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex flex-col gap-0.5 mt-1">
                  <button onClick={() => reorder(faq, 'up')} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-pointer">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => reorder(faq, 'down')} disabled={idx === faqs.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 cursor-pointer">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 text-sm">{faq.question}</h3>
                    <Badge variant={faq.isActive ? 'success' : 'default'} size="sm">
                      {faq.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {faq.category && <Badge variant="info" size="sm">{faq.category}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{faq.answer}</p>
                  <p className="text-xs text-gray-400 mt-1">Sort: {faq.sortOrder}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/faqs/${faq.id}`)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(faq)}>
                  {faq.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(faq)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ?"
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
