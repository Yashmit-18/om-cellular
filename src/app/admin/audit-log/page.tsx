'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Search, Filter } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Pagination from '@/components/ui/pagination';
import Badge from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { id: string; name: string | null; email: string | null } | null;
}

const entityOptions = [
  { value: '', label: 'All Entities' },
  { value: 'Order', label: 'Order' },
  { value: 'Product', label: 'Product' },
  { value: 'RepairBooking', label: 'Repair' },
  { value: 'SellRequest', label: 'Sell Request' },
  { value: 'Coupon', label: 'Coupon' },
  { value: 'Setting', label: 'Setting' },
  { value: 'User', label: 'User' },
];

const actionColors: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
};

export default function AuditLogPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      const res = await fetch(`/api/audit-log?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((l) => {
    if (entityFilter && l.entity !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.admin?.name?.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.action.toLowerCase().includes(q);
    }
    return true;
  });

  const columns = [
    {
      key: 'admin',
      header: 'Admin',
      render: (item: AuditLog) => (
        <span className="text-sm font-medium text-gray-900">{item.admin?.name || 'System'}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (item: AuditLog) => (
        <Badge variant={(actionColors[item.action] || 'default') as 'success' | 'info' | 'danger' | 'default'}>
          {item.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (item: AuditLog) => (
        <span className="text-sm text-gray-700">{item.entity}</span>
      ),
    },
    {
      key: 'entityId',
      header: 'Entity ID',
      render: (item: AuditLog) => (
        <span className="text-xs text-gray-500 font-mono">{item.entityId?.slice(0, 8) || '—'}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date/Time',
      render: (item: AuditLog) => (
        <span className="text-xs text-gray-500">{format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
      ),
    },
    {
      key: 'expand',
      header: '',
      render: (item: AuditLog) => (
        <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
          {expanded === item.id ? 'Hide' : 'Details'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">Track all admin actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search logs..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
          iconPrefix={<Search className="h-4 w-4" />}
          className="sm:w-64"
        />
        <Select
          options={entityOptions}
          value={entityFilter}
          onChange={setEntityFilter}
          placeholder="Filter by entity"
          iconPrefix={<Filter className="h-4 w-4" />}
        />
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={History} title="No audit logs" description="No logs match your filters." />
      ) : (
        <>
          <Table columns={columns} data={filtered} keyExtractor={(item) => item.id} />
          {expanded && filtered.find((l) => l.id === expanded) && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm">
              <h4 className="font-medium text-gray-900 mb-3">Change Details</h4>
              {(() => {
                const log = filtered.find((l) => l.id === expanded)!;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 mb-1">Old Value</p>
                      <pre className="bg-white rounded-lg p-3 text-xs overflow-auto max-h-40 border border-gray-200">
                        {log.oldValue ? JSON.stringify(JSON.parse(log.oldValue), null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">New Value</p>
                      <pre className="bg-white rounded-lg p-3 text-xs overflow-auto max-h-40 border border-gray-200">
                        {log.newValue ? JSON.stringify(JSON.parse(log.newValue), null, 2) : '—'}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
