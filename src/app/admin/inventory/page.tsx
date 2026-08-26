'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Search, Save, AlertTriangle } from 'lucide-react';
import Table from '@/components/ui/table';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Pagination from '@/components/ui/pagination';
import StatusBadge from '@/components/ui/status-badge';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

interface InventoryItem {
  id: string;
  variantId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    reservedStock: number;
    soldCount: number;
    product: { id: string; name: string };
  };
}

const stockFilterOptions = [
  { value: '', label: 'All Stock' },
  { value: 'low', label: 'Low Stock' },
];

export default function InventoryPage() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stockFilter, setStockFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [edits, setEdits] = useState<Record<string, { quantity?: number; lowStockThreshold?: number }>>({});
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (stockFilter === 'low') params.set('lowStock', 'true');
      const res = await fetch(`/api/inventory?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.inventory);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, stockFilter]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleEdit = (id: string, field: string, value: number) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async () => {
    const updates = Object.entries(edits).map(([id, changes]) => ({
      variantId: id,
      ...(changes.quantity !== undefined && { quantity: changes.quantity }),
      ...(changes.lowStockThreshold !== undefined && { lowStockThreshold: changes.lowStockThreshold }),
    }));
    if (updates.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      toast.success('Inventory updated');
      setEdits({});
      fetchInventory();
    } catch {
      toast.error('Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const qty = edits[item.variantId]?.quantity ?? item.quantity;
    const threshold = edits[item.variantId]?.lowStockThreshold ?? item.lowStockThreshold;
    if (qty === 0) return 'out-of-stock';
    if (qty <= threshold) return 'low-stock';
    return 'in-stock';
  };

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: InventoryItem) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{item.variant.product.name}</p>
          <p className="text-xs text-gray-500">{item.variant.name}</p>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (item: InventoryItem) => (
        <span className="font-mono text-xs text-gray-600">{item.variant.sku}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (item: InventoryItem) => {
        const edited = edits[item.variantId]?.quantity !== undefined;
        return (
          <input
            type="number"
            min={0}
            value={edited ? edits[item.variantId].quantity! : item.quantity}
            onChange={(e) => handleEdit(item.variantId, 'quantity', parseInt(e.target.value) || 0)}
            className={`w-20 text-center text-sm font-medium rounded-lg border px-2 py-1 ${
              edited ? 'border-[#f97316] bg-[#f97316]/5' : 'border-gray-200'
            } ${getStockStatus(item) === 'out-of-stock' ? 'text-red-600' : getStockStatus(item) === 'low-stock' ? 'text-amber-600' : 'text-gray-900'}`}
          />
        );
      },
    },
    {
      key: 'reserved',
      header: 'Reserved',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-600">{item.reservedQuantity}</span>
      ),
    },
    {
      key: 'sold',
      header: 'Sold',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-600">{item.variant.soldCount}</span>
      ),
    },
    {
      key: 'threshold',
      header: 'Threshold',
      render: (item: InventoryItem) => {
        const edited = edits[item.variantId]?.lowStockThreshold !== undefined;
        return (
          <input
            type="number"
            min={0}
            value={edited ? edits[item.variantId].lowStockThreshold! : item.lowStockThreshold}
            onChange={(e) => handleEdit(item.variantId, 'lowStockThreshold', parseInt(e.target.value) || 0)}
            className={`w-16 text-center text-sm rounded-lg border px-2 py-1 ${
              edited ? 'border-[#f97316] bg-[#f97316]/5' : 'border-gray-200'
            }`}
          />
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryItem) => <StatusBadge status={getStockStatus(item)} />,
    },
  ];

  const filtered = search
    ? items.filter(
        (i) =>
          i.variant.product.name.toLowerCase().includes(search.toLowerCase()) ||
          i.variant.sku.toLowerCase().includes(search.toLowerCase()) ||
          i.variant.name.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Manage stock levels and thresholds</p>
        </div>
        {hasEdits && (
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" /> Save Changes ({Object.keys(edits).length})
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Search by product name or SKU..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setSearch(e.target.value); }}
          iconPrefix={<Search className="h-4 w-4" />}
          className="sm:w-80"
        />
        <Select
          options={stockFilterOptions}
          value={stockFilter}
          onChange={(v) => { setStockFilter(v); setPage(1); }}
          placeholder="Filter by stock status"
        />
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No inventory items" description="No items match your criteria." />
      ) : (
        <>
          <Table columns={columns} data={filtered} keyExtractor={(item) => item.variantId} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
