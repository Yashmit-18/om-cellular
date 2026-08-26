'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import StatusBadge from '@/components/ui/status-badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface ExchangeRequestDetail {
  id: string;
  requestNumber: string;
  oldBrand: string;
  oldModel: string;
  oldStorage: string | null;
  oldRam: string | null;
  oldCondition: string;
  oldDeviceDetails: string;
  estimatedExchangeValue: number | null;
  finalExchangeValue: number | null;
  difference: number | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  newVariant: { id: string; name: string; price: number; images: string } | null;
}

const statusOptions = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'OFFER_MADE', label: 'Offer Made' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ExchangeRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [request, setRequest] = useState<ExchangeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/exchange-requests/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequest(data.exchangeRequest);
      setStatus(data.exchangeRequest.status);
      setFinalValue(data.exchangeRequest.finalExchangeValue?.toString() || '');
      setAdminNotes(data.exchangeRequest.adminNotes || '');
    } catch {
      toast.error('Failed to load exchange request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/exchange-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          finalExchangeValue: finalValue ? parseFloat(finalValue) : undefined,
          adminNotes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Exchange request updated');
      fetchRequest();
    } catch {
      toast.error('Failed to update exchange request');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={8} />;
  if (!request) return <div className="text-center py-20 text-gray-500">Request not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/exchange-requests')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.requestNumber}</h1>
          <p className="text-sm text-gray-500">Created {format(new Date(request.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Customer</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Name</p><p className="font-medium">{request.user.name || 'N/A'}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{request.user.phone || 'N/A'}</p></div>
              <div><p className="text-gray-500">Email</p><p className="font-medium">{request.user.email || 'N/A'}</p></div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">Old Device</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Brand</span><span className="font-medium">{request.oldBrand}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Model</span><span className="font-medium">{request.oldModel}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Storage</span><span className="font-medium">{request.oldStorage || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">RAM</span><span className="font-medium">{request.oldRam || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Condition</span><StatusBadge status={request.oldCondition} /></div>
              </div>
            </Card>

            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">New Device</h3>
              {request.newVariant ? (
                <div className="text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-medium">{request.newVariant.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-medium text-[#2563eb]">₹{request.newVariant.price.toLocaleString()}</span></div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No new device selected</p>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Exchange Value</h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl space-y-2">
                <p className="text-sm text-gray-500">Estimated Value</p>
                <p className="text-2xl font-bold text-[#2563eb]">
                  {request.estimatedExchangeValue != null ? `₹${request.estimatedExchangeValue.toLocaleString()}` : 'N/A'}
                </p>
                {request.difference != null && (
                  <p className={`text-sm font-medium ${request.difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Difference: {request.difference > 0 ? '+' : ''}₹{request.difference.toLocaleString()}
                  </p>
                )}
              </div>
              <Input
                label="Final Exchange Value (₹)"
                type="number"
                value={finalValue}
                onChange={(e) => setFinalValue(e.target.value)}
              />
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={setStatus}
              />
              <Textarea
                label="Admin Notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes about this exchange"
                rows={3}
              />
              <Button onClick={handleUpdate} loading={updating} className="w-full">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
