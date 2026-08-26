'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Textarea from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';

const typeOptions = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'FLAT', label: 'Flat Amount' },
];

const applicableToOptions = [
  { value: 'ALL', label: 'All Products' },
  { value: 'PRODUCTS', label: 'Specific Products' },
  { value: 'CATEGORIES', label: 'Specific Categories' },
];

export default function NewCouponPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !value) {
      toast.error('Code and value are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          description: description || undefined,
          type,
          value: parseFloat(value),
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
          usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
          applicableTo,
          expiresAt: expiresAt || undefined,
          isActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      toast.success('Coupon created successfully');
      router.push('/admin/coupons');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/coupons')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create Coupon</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card padding="lg">
          <div className="space-y-5">
            <Input
              label="Coupon Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER20"
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this coupon"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type"
                options={typeOptions}
                value={type}
                onChange={setType}
              />
              <Input
                label={type === 'PERCENTAGE' ? 'Percentage Off' : 'Flat Amount (₹)'}
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Order Amount (₹)"
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="No minimum"
              />
              {type === 'PERCENTAGE' && (
                <Input
                  label="Max Discount (₹)"
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="No cap"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Usage Limit"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
              />
              <Input
                label="Expiry Date"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <Select
              label="Applicable To"
              options={applicableToOptions}
              value={applicableTo}
              onChange={setApplicableTo}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Active</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isActive ? 'bg-[#2563eb]' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => router.push('/admin/coupons')}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" /> Create Coupon
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
