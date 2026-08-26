'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save } from 'lucide-react';
import Tabs from '@/components/ui/tabs';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        (data.settings || []).forEach((s: { key: string; value: string }) => { map[s.key] = s.value || ''; });
        setSettings(map);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  const saveGroup = async (group: string, keys: string[]) => {
    setSaving(true);
    try {
      const payload = keys.map((key) => ({ key, value: settings[key] || '', group }));
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) throw new Error();
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="text" count={10} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure your store settings</p>
      </div>

      <Tabs defaultTab="business">
        <Tabs.List>
          <Tabs.Trigger id="business">Business</Tabs.Trigger>
          <Tabs.Trigger id="website">Website</Tabs.Trigger>
          <Tabs.Trigger id="seo">SEO</Tabs.Trigger>
          <Tabs.Trigger id="commerce">Commerce</Tabs.Trigger>
          <Tabs.Trigger id="notifications">Notifications</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel id="business">
          <Card padding="lg">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Business Name" value={settings['business_name'] || ''} onChange={(e) => update('business_name', e.target.value)} placeholder="OM Cellular" />
                <Input label="Phone" value={settings['business_phone'] || ''} onChange={(e) => update('business_phone', e.target.value)} />
                <Input label="WhatsApp" value={settings['business_whatsapp'] || ''} onChange={(e) => update('business_whatsapp', e.target.value)} />
                <Input label="Email" type="email" value={settings['business_email'] || ''} onChange={(e) => update('business_email', e.target.value)} />
              </div>
              <Textarea label="Address" value={settings['business_address'] || ''} onChange={(e) => update('business_address', e.target.value)} rows={2} />
              <Input label="Business Hours" value={settings['business_hours'] || ''} onChange={(e) => update('business_hours', e.target.value)} placeholder="Mon-Sat: 10AM - 8PM" />
              <Input label="Google Maps Link" value={settings['business_maps'] || ''} onChange={(e) => update('business_maps', e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={() => saveGroup('business', ['business_name', 'business_phone', 'business_whatsapp', 'business_email', 'business_address', 'business_hours', 'business_maps'])} loading={saving}>
                  <Save className="h-4 w-4" /> Save Business Settings
                </Button>
              </div>
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="website">
          <Card padding="lg">
            <div className="space-y-5">
              <Input label="Logo URL" value={settings['website_logo'] || ''} onChange={(e) => update('website_logo', e.target.value)} />
              <Input label="Favicon URL" value={settings['website_favicon'] || ''} onChange={(e) => update('website_favicon', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Primary Color" value={settings['website_primary_color'] || '#2563eb'} onChange={(e) => update('website_primary_color', e.target.value)} />
                <Input label="Accent Color" value={settings['website_accent_color'] || '#f97316'} onChange={(e) => update('website_accent_color', e.target.value)} />
              </div>
              <Input label="Facebook URL" value={settings['social_facebook'] || ''} onChange={(e) => update('social_facebook', e.target.value)} />
              <Input label="Instagram URL" value={settings['social_instagram'] || ''} onChange={(e) => update('social_instagram', e.target.value)} />
              <Input label="Twitter URL" value={settings['social_twitter'] || ''} onChange={(e) => update('social_twitter', e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={() => saveGroup('website', ['website_logo', 'website_favicon', 'website_primary_color', 'website_accent_color', 'social_facebook', 'social_instagram', 'social_twitter'])} loading={saving}>
                  <Save className="h-4 w-4" /> Save Website Settings
                </Button>
              </div>
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="seo">
          <Card padding="lg">
            <div className="space-y-5">
              <Input label="Default Title" value={settings['seo_title'] || ''} onChange={(e) => update('seo_title', e.target.value)} />
              <Textarea label="Default Description" value={settings['seo_description'] || ''} onChange={(e) => update('seo_description', e.target.value)} rows={3} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Google Analytics ID" value={settings['seo_analytics_id'] || ''} onChange={(e) => update('seo_analytics_id', e.target.value)} />
                <Input label="Verification Code" value={settings['seo_verification'] || ''} onChange={(e) => update('seo_verification', e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveGroup('seo', ['seo_title', 'seo_description', 'seo_analytics_id', 'seo_verification'])} loading={saving}>
                  <Save className="h-4 w-4" /> Save SEO Settings
                </Button>
              </div>
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="commerce">
          <Card padding="lg">
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input label="Tax Rate (%)" type="number" value={settings['commerce_tax_rate'] || '18'} onChange={(e) => update('commerce_tax_rate', e.target.value)} />
                <Input label="Shipping Cost (₹)" type="number" value={settings['commerce_shipping_cost'] || '0'} onChange={(e) => update('commerce_shipping_cost', e.target.value)} />
                <Input label="Return Period (days)" type="number" value={settings['commerce_return_period'] || '7'} onChange={(e) => update('commerce_return_period', e.target.value)} />
                <Input label="Minimum Order (₹)" type="number" value={settings['commerce_min_order'] || '0'} onChange={(e) => update('commerce_min_order', e.target.value)} />
                <Input label="Currency" value={settings['commerce_currency'] || 'INR'} onChange={(e) => update('commerce_currency', e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveGroup('commerce', ['commerce_tax_rate', 'commerce_shipping_cost', 'commerce_return_period', 'commerce_min_order', 'commerce_currency'])} loading={saving}>
                  <Save className="h-4 w-4" /> Save Commerce Settings
                </Button>
              </div>
            </div>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel id="notifications">
          <Card padding="lg">
            <div className="space-y-5">
              {[
                { key: 'notif_email', label: 'Email Notifications' },
                { key: 'notif_sms', label: 'SMS Notifications' },
                { key: 'notif_whatsapp', label: 'WhatsApp Notifications' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <button
                    onClick={() => update(item.key, settings[item.key] === 'true' ? 'false' : 'true')}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${settings[item.key] === 'true' ? 'bg-[#2563eb]' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[item.key] === 'true' ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => saveGroup('notifications', ['notif_email', 'notif_sms', 'notif_whatsapp'])} loading={saving}>
                  <Save className="h-4 w-4" /> Save Notification Settings
                </Button>
              </div>
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
