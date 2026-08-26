'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Save, Upload, FileText } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import StatusBadge from '@/components/ui/status-badge';
import ImageUpload from '@/components/ui/image-upload';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

interface RepairDetail {
  id: string;
  bookingNumber: string;
  brand: string | null;
  model: string | null;
  problemDescription: string | null;
  estimatedCost: number | null;
  finalCost: number | null;
  status: string;
  technicianName: string | null;
  technicianNotes: string | null;
  pickupRequired: boolean;
  pickupAddress: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  service: { id: string; name: string; startingPrice: number } | null;
  statusHistory: { id: string; status: string; note: string | null; createdAt: string }[];
}

const statusOptions = [
  { value: 'BOOKING_RECEIVED', label: 'Booking Received' },
  { value: 'IN_DIAGNOSIS', label: 'In Diagnosis' },
  { value: 'DIAGNOSIS_COMPLETE', label: 'Diagnosis Complete' },
  { value: 'IN_REPAIR', label: 'In Repair' },
  { value: 'REPAIR_COMPLETE', label: 'Repair Complete' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function RepairDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [technician, setTechnician] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchRepair = useCallback(async () => {
    try {
      const res = await fetch(`/api/repairs/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRepair(data.repair);
      setNewStatus(data.repair.status);
      setTechnician(data.repair.technicianName || '');
      setTechnicianNotes(data.repair.technicianNotes || '');
      setEstimatedCost(data.repair.estimatedCost?.toString() || '');
      setFinalCost(data.repair.finalCost?.toString() || '');
    } catch {
      toast.error('Failed to load repair details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRepair(); }, [fetchRepair]);

  const handleStatusUpdate = async () => {
    if (newStatus === repair?.status && !statusNote) {
      toast.warning('No changes to update');
      return;
    }
    setUpdating(true);
    try {
      if (newStatus !== repair?.status) {
        const res = await fetch(`/api/repairs/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
        });
        if (!res.ok) throw new Error();
      }
      await fetch(`/api/repairs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianName: technician || null,
          technicianNotes: technicianNotes || null,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
          finalCost: finalCost ? parseFloat(finalCost) : null,
        }),
      });
      toast.success('Repair updated successfully');
      setStatusNote('');
      fetchRepair();
    } catch {
      toast.error('Failed to update repair');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={8} />;
  if (!repair) return <div className="text-center py-20 text-gray-500">Repair not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/repairs')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{repair.bookingNumber}</h1>
          <p className="text-sm text-gray-500">Created {format(new Date(repair.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Booking Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-medium">{repair.user.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{repair.user.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{repair.user.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Service</p>
                <p className="font-medium">{repair.service?.name || 'N/A'}</p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Device Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Brand</p>
                <p className="font-medium">{repair.brand || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Model</p>
                <p className="font-medium">{repair.model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Pickup Required</p>
                <p className="font-medium">{repair.pickupRequired ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-500">Appointment</p>
                <p className="font-medium">
                  {repair.appointmentDate
                    ? `${format(new Date(repair.appointmentDate), 'dd MMM yyyy')} ${repair.appointmentTime || ''}`
                    : 'N/A'}
                </p>
              </div>
            </div>
            {repair.pickupAddress && (
              <div className="mt-3 text-sm">
                <p className="text-gray-500">Pickup Address</p>
                <p className="font-medium">{repair.pickupAddress}</p>
              </div>
            )}
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Problem Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{repair.problemDescription || 'No description provided.'}</p>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Status Timeline</h3>
            <div className="space-y-4">
              {repair.statusHistory.map((entry, idx) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-[#2563eb]' : 'bg-gray-300'}`} />
                    {idx < repair.statusHistory.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      <span className="text-xs text-gray-500">{format(new Date(entry.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                    </div>
                    {entry.note && <p className="text-sm text-gray-600 mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Repair Images</h3>
            <ImageUpload />
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="space-y-4">
              <Select
                label="Status"
                options={statusOptions}
                value={newStatus}
                onChange={setNewStatus}
              />
              <Input
                label="Technician"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Technician name"
                iconPrefix={<UserPlus className="h-4 w-4" />}
              />
              <Input
                label="Estimated Cost (₹)"
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Final Cost (₹)"
                type="number"
                value={finalCost}
                onChange={(e) => setFinalCost(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Status Note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Optional note for status change"
              />
              <Textarea
                label="Technician Notes"
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="Internal diagnosis / repair notes"
                rows={4}
              />
              <Button onClick={handleStatusUpdate} loading={updating} className="w-full">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => toast.info('Invoice generation coming soon')}>
                <FileText className="h-4 w-4" /> Generate Invoice
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
