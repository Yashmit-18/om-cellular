'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

const typeOptions = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'FLAT', label: 'Flat Amount' },
];

const applicableToOptions = [
  { value: 'ALL', label: 'All Products' },
  { value: 'PRODUCTS', label: 'Specific Products' },
  { value: 'CATEGORIES', label: 'Specific Categories' },
];

export default function EditCouponPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [applicableTo, setApplicableTo] = useState('ALL');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchCoupon = useCallback(async () => {
    try {
      const res = await fetch(`/api/coupons/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const c = data.coupon;
      setCode(c.code);
      setDescription(c.description || '');
      setType(c.type);
      setValue(c.value.toString());
      setMinOrderAmount(c.minOrderAmount?.toString() || '');
      setMaxDiscount(c.maxDiscount?.toString() || '');
      setUsageLimit(c.usageLimit?.toString() || '');
      setApplicableTo(c.applicableTo || 'ALL');
      setExpiresAt(c.expiresAt ? format(new Date(c.expiresAt), 'yyyy-MM-dd') : '');
      setIsActive(c.isActive);
    } catch {
      toast.error('Failed to load coupon');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCoupon(); }, [fetchCoupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description: description || undefined,
          type,
          value: parseFloat(value),
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null,
          applicableTo,
          expiresAt: expiresAt || null,
          isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Coupon updated');
      router.push('/admin/coupons');
    } catch {
      toast.error('Failed to update coupon');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={8} />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/coupons')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Coupon</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input label="Coupon Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Type" options={typeOptions} value={type} onChange={setType} />
              <Input
                label={type === 'PERCENTAGE' ? 'Percentage Off' : 'Flat Amount (₹)'}
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Order Amount (₹)" type="number" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
              {type === 'PERCENTAGE' && (
                <Input label="Max Discount (₹)" type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Usage Limit" type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
              <Input label="Expiry Date" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <Select label="Applicable To" options={applicableToOptions} value={applicableTo} onChange={setApplicableTo} />
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Active</label>
              <button type="button" onClick={() => setIsActive(!isActive)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isActive ? 'bg-[#2563eb]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/coupons')}>Cancel</Button>
              <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
