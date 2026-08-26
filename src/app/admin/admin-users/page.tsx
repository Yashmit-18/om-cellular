'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Edit, Trash2, Shield } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Pagination from '@/components/ui/pagination';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-users?page=${page}&limit=15`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdmins(data.admins);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin-users/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Admin user deleted');
      setDeleteTarget(null);
      fetchAdmins();
    } catch {
      toast.error('Failed to delete admin user');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (item: AdminUser) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] font-medium text-sm">
            {(item.name || '?')[0].toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{item.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (item: AdminUser) => <span className="text-sm text-gray-600">{item.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (item: AdminUser) => (
        <Badge variant={item.role === 'SUPER_ADMIN' ? 'purple' : 'info'}>
          <Shield className="h-3 w-3 mr-1" /> {item.role}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Created',
      render: (item: AdminUser) => (
        <span className="text-xs text-gray-500">{format(new Date(item.createdAt), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: AdminUser) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/admin-users/${item.id}`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-sm text-gray-500">Manage admin accounts</p>
        </div>
        <Button onClick={() => router.push('/admin/admin-users/new')}>
          <Plus className="h-4 w-4" /> Add Admin
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : admins.length === 0 ? (
        <EmptyState icon={Users} title="No admin users" description="Add your first admin user." actionLabel="Add Admin" onAction={() => router.push('/admin/admin-users/new')} />
      ) : (
        <>
          <Table columns={columns} data={admins} keyExtractor={(item) => item.id} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Admin User"
        message={`Are you sure you want to delete "${deleteTarget?.name || deleteTarget?.email}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
