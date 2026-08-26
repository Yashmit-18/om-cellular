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

interface SellRequestDetail {
  id: string;
  requestNumber: string;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  age: string | null;
  condition: string;
  displayCondition: string | null;
  batteryCondition: string | null;
  cameraCondition: string | null;
  bodyCondition: string | null;
  accessoriesAvailable: boolean;
  originalBill: boolean;
  originalBox: boolean;
  estimatedPrice: number | null;
  finalOfferedPrice: number | null;
  status: string;
  pickupAddress: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  adminNotes: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
}

const statusOptions = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'OFFER_MADE', label: 'Offer Made' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'PAYMENT_DONE', label: 'Payment Done' },
];

export default function SellRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [request, setRequest] = useState<SellRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [finalOffer, setFinalOffer] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/sell-requests/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequest(data.sellRequest);
      setStatus(data.sellRequest.status);
      setFinalOffer(data.sellRequest.finalOfferedPrice?.toString() || '');
      setAdminNotes(data.sellRequest.adminNotes || '');
    } catch {
      toast.error('Failed to load sell request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/sell-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          finalOfferedPrice: finalOffer ? parseFloat(finalOffer) : undefined,
          adminNotes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Sell request updated');
      fetchRequest();
    } catch {
      toast.error('Failed to update sell request');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={8} />;
  if (!request) return <div className="text-center py-20 text-gray-500">Request not found</div>;

  const conditionItem = (label: string, value: string | null) =>
    value ? (
      <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium capitalize">{value}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/sell-requests')}>
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
            <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium">{request.user.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{request.user.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{request.user.email || 'N/A'}</p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Device Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Brand</p><p className="font-medium">{request.brand}</p></div>
              <div><p className="text-gray-500">Model</p><p className="font-medium">{request.model}</p></div>
              <div><p className="text-gray-500">Storage</p><p className="font-medium">{request.storage || 'N/A'}</p></div>
              <div><p className="text-gray-500">RAM</p><p className="font-medium">{request.ram || 'N/A'}</p></div>
              <div><p className="text-gray-500">Age</p><p className="font-medium">{request.age || 'N/A'}</p></div>
              <div><p className="text-gray-500">Condition</p><p className="font-medium capitalize">{request.condition}</p></div>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Condition Details</h3>
            <div className="space-y-0">
              {conditionItem('Display', request.displayCondition)}
              {conditionItem('Battery', request.batteryCondition)}
              {conditionItem('Camera', request.cameraCondition)}
              {conditionItem('Body', request.bodyCondition)}
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${request.accessoriesAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {request.accessoriesAvailable ? '✓' : '✗'}
                </span>
                <span>Accessories</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${request.originalBill ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {request.originalBill ? '✓' : '✗'}
                </span>
                <span>Original Bill</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${request.originalBox ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {request.originalBox ? '✓' : '✗'}
                </span>
                <span>Original Box</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Pricing & Status</h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Estimated Price</p>
                <p className="text-3xl font-bold text-[#2563eb]">
                  {request.estimatedPrice != null ? `₹${request.estimatedPrice.toLocaleString()}` : 'N/A'}
                </p>
              </div>
              <Input
                label="Final Offer (₹)"
                type="number"
                value={finalOffer}
                onChange={(e) => setFinalOffer(e.target.value)}
                placeholder="Enter final offer amount"
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
                placeholder="Internal notes about this request"
                rows={3}
              />
              <Button onClick={handleUpdate} loading={updating} className="w-full">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </Card>

          {request.pickupAddress && (
            <Card padding="md">
              <h3 className="font-semibold text-gray-900 mb-4">Pickup Details</h3>
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-gray-500">Address</p>
                  <p className="font-medium">{request.pickupAddress}</p>
                </div>
                {request.pickupDate && (
                  <div>
                    <p className="text-gray-500">Scheduled</p>
                    <p className="font-medium">{format(new Date(request.pickupDate), 'dd MMM yyyy')} {request.pickupTime || ''}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
