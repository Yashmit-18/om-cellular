'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Search, Filter, Eye } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Badge from '@/components/ui/badge';
import Pagination from '@/components/ui/pagination';
import Modal from '@/components/ui/modal';
import Textarea from '@/components/ui/textarea';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function ContactRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/contact-requests?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data.requests);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load contact requests');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/contact-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success(`Request marked as ${status.toLowerCase()}`);
      fetchRequests();
      if (selected?.id === id) setSelected(null);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/api/contact-requests/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });
      toast.success('Notes saved');
      fetchRequests();
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (item: ContactRequest) => <span className="font-medium text-gray-900">{item.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (item: ContactRequest) => <span className="text-sm text-gray-600">{item.email}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (item: ContactRequest) => <span className="text-sm text-gray-700">{item.subject || '—'}</span>,
    },
    {
      key: 'message',
      header: 'Message',
      render: (item: ContactRequest) => (
        <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px] block">{item.message}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ContactRequest) => (
        <Badge variant={item.status === 'PENDING' ? 'warning' : item.status === 'REPLIED' ? 'info' : 'success'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: ContactRequest) => (
        <span className="text-xs text-gray-500">{format(new Date(item.createdAt), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: ContactRequest) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSelected(item); setAdminNotes(item.adminNotes || ''); }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Requests</h1>
        <p className="text-sm text-gray-500">Manage customer inquiries</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search by name, email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
          iconPrefix={<Search className="h-4 w-4" />}
          className="sm:w-72"
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
        <EmptyState icon={Mail} title="No contact requests" description="No requests found." />
      ) : (
        <>
          <Table columns={columns} data={requests} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Contact Request Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-gray-500">Email</p><p className="font-medium">{selected.email}</p></div>
              {selected.phone && <div><p className="text-gray-500">Phone</p><p className="font-medium">{selected.phone}</p></div>}
              <div><p className="text-gray-500">Date</p><p className="font-medium">{format(new Date(selected.createdAt), 'dd MMM yyyy, hh:mm a')}</p></div>
            </div>
            {selected.subject && (
              <div><p className="text-gray-500 text-sm">Subject</p><p className="font-medium">{selected.subject}</p></div>
            )}
            <div>
              <p className="text-gray-500 text-sm mb-1">Message</p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{selected.message}</div>
            </div>
            <Textarea label="Admin Notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes" />
            <div className="flex justify-between">
              <div className="flex gap-2">
                {selected.status === 'PENDING' && (
                  <Button variant="success" size="sm" onClick={() => updateStatus(selected.id, 'REPLIED')}>Mark as Replied</Button>
                )}
                <Button variant="outline" size="sm" onClick={() => updateStatus(selected.id, 'CLOSED')}>Close</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
                <Button size="sm" onClick={saveNotes} loading={saving}>Save Notes</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
