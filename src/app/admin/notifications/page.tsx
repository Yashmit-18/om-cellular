'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Check, Filter, Send } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import Modal from '@/components/ui/modal';
import Badge from '@/components/ui/badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'ORDER', label: 'Order' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'SYSTEM', label: 'System' },
];

const typeBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'purple'> = {
  ORDER: 'info',
  REPAIR: 'warning',
  PROMOTION: 'purple',
  SYSTEM: 'success',
};

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState('SYSTEM');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: 'admin', limit: '50' });
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      fetchNotifications();
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) { toast.error('Title and message required'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'admin', type: newType, title: newTitle, message: newMessage }),
      });
      if (!res.ok) throw new Error();
      toast.success('Notification created');
      setShowCreate(false);
      setNewTitle('');
      setNewMessage('');
      setNewType('SYSTEM');
      fetchNotifications();
    } catch {
      toast.error('Failed to create notification');
    } finally {
      setCreating(false);
    }
  };

  const filtered = typeFilter ? notifications.filter((n) => n.type === typeFilter) : notifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">View and manage notifications</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Notification
        </Button>
      </div>

      <div className="flex gap-3">
        <Select options={typeOptions} value={typeFilter} onChange={setTypeFilter} placeholder="Filter by type" iconPrefix={<Filter className="h-4 w-4" />} />
      </div>

      {loading ? (
        <LoadingSkeleton variant="text" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="No notifications found." />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card
              key={n.id}
              padding="md"
              className={`flex items-start gap-4 ${!n.isRead ? 'border-l-4 border-l-[#2563eb] bg-blue-50/30' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={typeBadgeVariant[n.type] || 'default'} size="sm">{n.type}</Badge>
                  <h3 className="font-medium text-sm text-gray-900">{n.title}</h3>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#2563eb]" />}
                </div>
                <p className="text-sm text-gray-600">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
              {!n.isRead && (
                <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Notification" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Type"
            options={typeOptions.slice(1)}
            value={newType}
            onChange={setNewType}
          />
          <Input
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            placeholder="Notification title"
          />
          <Textarea
            label="Message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            required
            rows={3}
            placeholder="Notification message"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating}><Send className="h-4 w-4" /> Send</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
