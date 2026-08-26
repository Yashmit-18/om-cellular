'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, Filter, PackageCheck } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Pagination from '@/components/ui/pagination';
import StatusBadge from '@/components/ui/status-badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import Dropdown from '@/components/ui/dropdown';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface SellRequest {
  id: string;
  requestNumber: string;
  brand: string;
  model: string;
  condition: string;
  estimatedPrice: number | null;
  finalOfferedPrice: number | null;
  status: string;
  pickupDate: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'OFFER_MADE', label: 'Offer Made' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'PAYMENT_DONE', label: 'Payment Done' },
];

export default function SellRequestsPage() {
  const router = useRouter();
  const toast = useToast();
  const [requests, setRequests] = useState<SellRequest[]>([]);
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
      const res = await fetch(`/api/sell-requests?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data.requests);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load sell requests');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const columns = [
    {
      key: 'requestNumber',
      header: 'Request ID',
      render: (item: SellRequest) => (
        <span className="font-mono text-[#2563eb] font-medium text-xs">{item.requestNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: SellRequest) => (
        <div>
          <p className="font-medium text-gray-900">{item.user.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{item.user.phone || item.user.email}</p>
        </div>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      render: (item: SellRequest) => (
        <span className="text-gray-700">{item.brand} {item.model}</span>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (item: SellRequest) => (
        <span className="text-gray-600 text-xs capitalize">{item.condition}</span>
      ),
    },
    {
      key: 'estimatedPrice',
      header: 'Est. Price',
      render: (item: SellRequest) => (
        <span className="font-medium text-gray-900">
          {item.estimatedPrice != null ? `₹${item.estimatedPrice.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'finalOfferedPrice',
      header: 'Final Offer',
      render: (item: SellRequest) => (
        <span className="font-medium text-emerald-600">
          {item.finalOfferedPrice != null ? `₹${item.finalOfferedPrice.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SellRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'pickup',
      header: 'Pickup',
      render: (item: SellRequest) => (
        <span className="text-xs text-gray-600">
          {item.pickupDate ? format(new Date(item.pickupDate), 'dd MMM') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: SellRequest) => (
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/sell-requests/${item.id}`)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sell Requests</h1>
        <p className="text-sm text-gray-500">Manage device sell requests from customers</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search by request ID, device, customer..."
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
        <EmptyState icon={PackageCheck} title="No sell requests" description="No requests match your filters." />
      ) : (
        <>
          <Table columns={columns} data={requests} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
