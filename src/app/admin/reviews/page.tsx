'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Search, Filter, Trash2, Check, X } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Badge from '@/components/ui/badge';
import Pagination from '@/components/ui/pagination';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  user: { id: string; name: string | null };
  variant: { id: string; name: string; product: { name: string } };
}

const statusOptions = [
  { value: '', label: 'All Reviews' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
];

const ratingOptions = [
  { value: '', label: 'All Ratings' },
  { value: '5', label: '5 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '2', label: '2 Stars' },
  { value: '1', label: '1 Star' },
];

export default function ReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15', approvedOnly: 'false' });
      const res = await fetch(`/api/reviews?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReviews(data.reviews);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateApproval = async (review: Review, approved: boolean) => {
    try {
      await fetch(`/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: approved }),
      });
      toast.success(`Review ${approved ? 'approved' : 'rejected'}`);
      fetchReviews();
    } catch {
      toast.error('Failed to update review');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/reviews/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Review deleted');
      setDeleteTarget(null);
      fetchReviews();
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = reviews.filter((r) => {
    if (statusFilter === 'approved' && !r.isApproved) return false;
    if (statusFilter === 'pending' && r.isApproved) return false;
    if (ratingFilter && r.rating !== parseInt(ratingFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.user.name?.toLowerCase().includes(q) || r.variant.product.name.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q);
    }
    return true;
  });

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Review) => <span className="font-medium text-gray-900">{item.user.name || 'Anonymous'}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      render: (item: Review) => (
        <div>
          <p className="text-sm text-gray-900">{item.variant.product.name}</p>
          <p className="text-xs text-gray-500">{item.variant.name}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (item: Review) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
          ))}
        </div>
      ),
    },
    {
      key: 'review',
      header: 'Review',
      render: (item: Review) => (
        <div className="max-w-xs">
          {item.title && <p className="font-medium text-sm text-gray-900">{item.title}</p>}
          <p className="text-xs text-gray-600 line-clamp-2">{item.comment}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Review) => (
        <Badge variant={item.isApproved ? 'success' : 'warning'}>
          {item.isApproved ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: Review) => (
        <span className="text-xs text-gray-500">{format(new Date(item.createdAt), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Review) => (
        <div className="flex items-center gap-1">
          {!item.isApproved && (
            <Button variant="ghost" size="sm" onClick={() => updateApproval(item, true)} className="text-emerald-600">
              <Check className="h-4 w-4" />
            </Button>
          )}
          {item.isApproved && (
            <Button variant="ghost" size="sm" onClick={() => updateApproval(item, false)} className="text-amber-600">
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500">Manage customer reviews and ratings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconPrefix={<Search className="h-4 w-4" />}
          className="sm:w-64"
        />
        <Select options={statusOptions} value={statusFilter} onChange={setStatusFilter} placeholder="Status" />
        <Select options={ratingOptions} value={ratingFilter} onChange={setRatingFilter} placeholder="Rating" />
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Star} title="No reviews" description="No reviews match your filters." />
      ) : (
        <>
          <Table columns={columns} data={filtered} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Review"
        message="Are you sure you want to permanently delete this review?"
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
