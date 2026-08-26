'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, Filter, ArrowLeftRight } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Pagination from '@/components/ui/pagination';
import StatusBadge from '@/components/ui/status-badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

interface ExchangeRequest {
  id: string;
  requestNumber: string;
  oldBrand: string;
  oldModel: string;
  estimatedExchangeValue: number | null;
  finalExchangeValue: number | null;
  difference: number | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  newVariant: { id: string; name: string; price: number } | null;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'OFFER_MADE', label: 'Offer Made' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ExchangeRequestsPage() {
  const router = useRouter();
  const toast = useToast();
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/exchange-requests?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data.requests);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load exchange requests');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const columns = [
    {
      key: 'requestNumber',
      header: 'Request ID',
      render: (item: ExchangeRequest) => (
        <span className="font-mono text-[#2563eb] font-medium text-xs">{item.requestNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: ExchangeRequest) => (
        <span className="font-medium text-gray-900">{item.user.name || 'N/A'}</span>
      ),
    },
    {
      key: 'oldDevice',
      header: 'Old Device',
      render: (item: ExchangeRequest) => (
        <span className="text-gray-700">{item.oldBrand} {item.oldModel}</span>
      ),
    },
    {
      key: 'newDevice',
      header: 'New Device',
      render: (item: ExchangeRequest) => (
        <span className="text-gray-700">{item.newVariant?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'estimatedExchangeValue',
      header: 'Exchange Value',
      render: (item: ExchangeRequest) => (
        <span className="font-medium text-[#2563eb]">
          {item.estimatedExchangeValue != null ? `₹${item.estimatedExchangeValue.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'difference',
      header: 'Difference',
      render: (item: ExchangeRequest) => (
        <span className={`font-medium ${item.difference && item.difference > 0 ? 'text-emerald-600' : item.difference && item.difference < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {item.difference != null ? `${item.difference > 0 ? '+' : ''}₹${item.difference.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ExchangeRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: ExchangeRequest) => (
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/exchange-requests/${item.id}`)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exchange Requests</h1>
        <p className="text-sm text-gray-500">Manage device exchange requests</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
          iconPrefix={<Search className="h-4 w-4" />}
          className="sm:w-80"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          placeholder="Filter by status"
          iconPrefix={<Filter className="h-4 w-4" />}
        />
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : requests.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No exchange requests" description="No requests match your filters." />
      ) : (
        <>
          <Table columns={columns} data={requests} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
