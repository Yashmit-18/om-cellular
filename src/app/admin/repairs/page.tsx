'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Search, Eye, UserPlus, Filter } from 'lucide-react';
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

interface RepairBooking {
  id: string;
  bookingNumber: string;
  brand: string | null;
  model: string | null;
  problemDescription: string | null;
  status: string;
  technicianName: string | null;
  estimatedCost: number | null;
  finalCost: number | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'BOOKING_RECEIVED', label: 'Booking Received' },
  { value: 'IN_DIAGNOSIS', label: 'In Diagnosis' },
  { value: 'DIAGNOSIS_COMPLETE', label: 'Diagnosis Complete' },
  { value: 'IN_REPAIR', label: 'In Repair' },
  { value: 'REPAIR_COMPLETE', label: 'Repair Complete' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function RepairsPage() {
  const router = useRouter();
  const toast = useToast();
  const [repairs, setRepairs] = useState<RepairBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/repairs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRepairs(data.repairs);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load repair bookings');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchRepairs(); }, [fetchRepairs]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const columns = [
    {
      key: 'bookingNumber',
      header: 'Booking ID',
      render: (item: RepairBooking) => (
        <span className="font-mono text-[#2563eb] font-medium text-xs">{item.bookingNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: RepairBooking) => (
        <div>
          <p className="font-medium text-gray-900">{item.user.name || 'N/A'}</p>
          <p className="text-xs text-gray-500">{item.user.phone || item.user.email}</p>
        </div>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      render: (item: RepairBooking) => (
        <span className="text-gray-700">{item.brand || 'N/A'} {item.model || ''}</span>
      ),
    },
    {
      key: 'problem',
      header: 'Problem',
      render: (item: RepairBooking) => (
        <span className="text-gray-600 text-xs line-clamp-1 max-w-[180px] block">{item.problemDescription || 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: RepairBooking) => <StatusBadge status={item.status} />,
    },
    {
      key: 'technician',
      header: 'Technician',
      render: (item: RepairBooking) => (
        <span className="text-gray-700">{item.technicianName || 'Unassigned'}</span>
      ),
    },
    {
      key: 'estimatedCost',
      header: 'Est. Cost',
      render: (item: RepairBooking) => (
        <span className="font-medium text-gray-900">
          {item.estimatedCost != null ? `₹${item.estimatedCost.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: RepairBooking) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          }
          items={[
            { label: 'View Details', onClick: () => router.push(`/admin/repairs/${item.id}`), icon: <Eye className="h-4 w-4" /> },
            { label: 'Assign Technician', onClick: () => handleAssignTech(item.id), icon: <UserPlus className="h-4 w-4" /> },
          ]}
        />
      ),
    },
  ];

  const handleAssignTech = async (id: string) => {
    const name = prompt('Enter technician name:');
    if (!name) return;
    try {
      const res = await fetch(`/api/repairs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianName: name }),
      });
      if (!res.ok) throw new Error();
      toast.success('Technician assigned successfully');
      fetchRepairs();
    } catch {
      toast.error('Failed to assign technician');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Repair Bookings</h1>
        <p className="text-sm text-gray-500">Manage repair service bookings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search by booking number, device, customer..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : repairs.length === 0 ? (
        <EmptyState icon={Wrench} title="No repair bookings" description="No bookings match your filters." />
      ) : (
        <>
          <Table columns={columns} data={repairs} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
