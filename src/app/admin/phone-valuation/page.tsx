"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Smartphone,
} from "lucide-react";

interface PhoneValuation {
  id: string;
  brand: string;
  model: string;
  baseValue: number;
  storageAdjustment: string;
  ramAdjustment: string;
  ageDepreciation: string;
  conditionMultiplier: string;
  displayDeduction: number;
  batteryDeduction: number;
  bodyDeduction: number;
  cameraDeduction: number;
  accessoryDeduction: number;
  billDeduction: number;
  boxDeduction: number;
  isActive: boolean;
}

const defaultForm: Partial<PhoneValuation> = {
  brand: "",
  model: "",
  baseValue: 0,
  storageAdjustment: "{}",
  ramAdjustment: "{}",
  ageDepreciation: "{}",
  conditionMultiplier: "{}",
  displayDeduction: 0,
  batteryDeduction: 0,
  bodyDeduction: 0,
  cameraDeduction: 0,
  accessoryDeduction: 0,
  billDeduction: 0,
  boxDeduction: 0,
};

export default function PhoneValuationPage() {
  const [valuations, setValuations] = useState<PhoneValuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PhoneValuation>>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [storageInputs, setStorageInputs] = useState<{ key: string; value: number }[]>([{ key: "64GB", value: 0 }]);
  const [ramInputs, setRamInputs] = useState<{ key: string; value: number }[]>([{ key: "4GB", value: 0 }]);
  const [ageInputs, setAgeInputs] = useState<{ key: string; value: number }[]>([{ key: "1_year", value: 0 }]);
  const [conditionInputs, setConditionInputs] = useState<{ key: string; value: number }[]>([
    { key: "NEW", value: 1.0 },
    { key: "LIKE_NEW", value: 0.9 },
    { key: "EXCELLENT", value: 0.8 },
    { key: "GOOD", value: 0.7 },
    { key: "FAIR", value: 0.5 },
  ]);

  const fetchValuations = useCallback(async () => {
    try {
      const url = search ? `/api/phone-valuations?search=${encodeURIComponent(search)}` : "/api/phone-valuations";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setValuations(data.valuations || []);
      }
    } catch (err) {
      console.error("Failed to fetch valuations:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchValuations();
  }, [fetchValuations]);

  function openCreate() {
    setForm(defaultForm);
    setEditingId(null);
    setStorageInputs([{ key: "64GB", value: 0 }]);
    setRamInputs([{ key: "4GB", value: 0 }]);
    setAgeInputs([{ key: "1_year", value: 0 }]);
    setConditionInputs([
      { key: "NEW", value: 1.0 },
      { key: "LIKE_NEW", value: 0.9 },
      { key: "EXCELLENT", value: 0.8 },
      { key: "GOOD", value: 0.7 },
      { key: "FAIR", value: 0.5 },
    ]);
    setShowForm(true);
  }

  function openEdit(v: PhoneValuation) {
    setForm(v);
    setEditingId(v.id);
    setStorageInputs(
      Object.entries(JSON.parse(v.storageAdjustment)).map(([key, value]) => ({ key, value: value as number }))
    );
    setRamInputs(
      Object.entries(JSON.parse(v.ramAdjustment)).map(([key, value]) => ({ key, value: value as number }))
    );
    setAgeInputs(
      Object.entries(JSON.parse(v.ageDepreciation)).map(([key, value]) => ({ key, value: value as number }))
    );
    setConditionInputs(
      Object.entries(JSON.parse(v.conditionMultiplier)).map(([key, value]) => ({ key, value: value as number }))
    );
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.brand || !form.model || !form.baseValue) return;
    setSaving(true);

    const storageAdj: Record<string, number> = {};
    storageInputs.forEach((i) => { if (i.key) storageAdj[i.key] = i.value; });
    const ramAdj: Record<string, number> = {};
    ramInputs.forEach((i) => { if (i.key) ramAdj[i.key] = i.value; });
    const ageDepr: Record<string, number> = {};
    ageInputs.forEach((i) => { if (i.key) ageDepr[i.key] = i.value; });
    const condMult: Record<string, number> = {};
    conditionInputs.forEach((i) => { if (i.key) condMult[i.key] = i.value; });

    const payload = {
      ...form,
      storageAdjustment: storageAdj,
      ramAdjustment: ramAdj,
      ageDepreciation: ageDepr,
      conditionMultiplier: condMult,
    };

    try {
      const url = editingId ? `/api/phone-valuations/${editingId}` : "/api/phone-valuations";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        fetchValuations();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save valuation");
      }
    } catch {
      alert("Failed to save valuation");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this valuation?")) return;
    const res = await fetch(`/api/phone-valuations/${id}`, { method: "DELETE" });
    if (res.ok) fetchValuations();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/phone-valuations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchValuations();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Valuation</h1>
          <p className="mt-1 text-sm text-gray-500">Manage phone valuation rules for sell and exchange features.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]">
          <Plus className="h-4 w-4" /> Add Valuation
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by brand or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
          />
        </div>
      </div>

      {valuations.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Smartphone className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No valuations yet</h3>
          <p className="mt-2 text-sm text-gray-500">Add phone valuations to enable the sell and exchange calculator.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Model</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Base Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Display</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Battery</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {valuations.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.brand}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.model}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">₹{v.baseValue.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">₹{v.displayDeduction.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">₹{v.batteryDeduction.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(v.id, v.isActive)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        v.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {v.isActive ? <><Check className="h-3 w-3" /> Active</> : <><X className="h-3 w-3" /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(v)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-6 text-lg font-bold text-gray-900">
              {editingId ? "Edit Valuation" : "Add Valuation"}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
                  <input
                    type="text"
                    value={form.brand || ""}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
                    placeholder="e.g. Apple"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
                  <input
                    type="text"
                    value={form.model || ""}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
                    placeholder="e.g. iPhone 14"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Base Value (₹)</label>
                <input
                  type="number"
                  value={form.baseValue || 0}
                  onChange={(e) => setForm({ ...form, baseValue: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Storage Adjustments (add to base)</h3>
                {storageInputs.map((item, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => {
                        const next = [...storageInputs];
                        next[idx] = { ...next[idx], key: e.target.value };
                        setStorageInputs(next);
                      }}
                      placeholder="e.g. 128GB"
                      className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      value={item.value}
                      onChange={(e) => {
                        const next = [...storageInputs];
                        next[idx] = { ...next[idx], value: Number(e.target.value) };
                        setStorageInputs(next);
                      }}
                      placeholder="Adjustment ₹"
                      className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <button onClick={() => setStorageInputs([...storageInputs, { key: "", value: 0 }])} className="text-xs text-[#2563eb] hover:underline">+ Add row</button>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Condition Multipliers</h3>
                {conditionInputs.map((item, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => {
                        const next = [...conditionInputs];
                        next[idx] = { ...next[idx], key: e.target.value };
                        setConditionInputs(next);
                      }}
                      className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={item.value}
                      onChange={(e) => {
                        const next = [...conditionInputs];
                        next[idx] = { ...next[idx], value: Number(e.target.value) };
                        setConditionInputs(next);
                      }}
                      className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Deductions (₹)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Display Deduction", key: "displayDeduction" },
                    { label: "Battery Deduction", key: "batteryDeduction" },
                    { label: "Body Deduction", key: "bodyDeduction" },
                    { label: "Camera Deduction", key: "cameraDeduction" },
                    { label: "Accessories Deduction", key: "accessoryDeduction" },
                    { label: "Bill Deduction", key: "billDeduction" },
                    { label: "Box Deduction", key: "boxDeduction" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs text-gray-500">{field.label}</label>
                      <input
                        type="number"
                        value={(form as Record<string, number>)[field.key] || 0}
                        onChange={(e) => setForm({ ...form, [field.key]: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.brand || !form.model}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
