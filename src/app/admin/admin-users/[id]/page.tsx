'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export default function EditAdminUserPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');

  const fetchAdmin = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin-users/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const a = data.admin;
      setName(a.name || '');
      setEmail(a.email || '');
      setPhone(a.phone || '');
      setRole(a.role);
    } catch {
      toast.error('Failed to load admin user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAdmin(); }, [fetchAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = { name, email, role };
      if (phone) body.phone = phone;
      if (password) body.password = password;
      const res = await fetch(`/api/admin-users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      toast.success('Admin user updated');
      router.push('/admin/admin-users');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update admin user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={6} />;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/admin-users')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Admin User</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" minLength={8} />
            <Select label="Role" options={roleOptions} value={role} onChange={setRole} iconPrefix={<Shield className="h-4 w-4" />} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/admin-users')}>Cancel</Button>
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
