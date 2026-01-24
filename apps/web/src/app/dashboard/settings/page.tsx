'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MerchantSettings {
  business_name: string;
  business_type: string | null;
  address: string | null;
  phone: string | null;
  twilio_phone_number: string | null;
  greeting: string | null;
  voice_id: string | null;
  google_calendar_connected: boolean;
}

const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging' },
  { id: 'fable', name: 'Fable', description: 'British accent' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and pleasant' },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('merchants')
      .select('business_name, business_type, address, phone, twilio_phone_number, greeting, voice_id, google_calendar_connected')
      .eq('id', user.id)
      .single();

    if (data) {
      setSettings(data as MerchantSettings);
    }
    setLoading(false);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('merchants')
      .update({
        business_name: settings.business_name,
        business_type: settings.business_type,
        address: settings.address,
        phone: settings.phone,
        greeting: settings.greeting,
        voice_id: settings.voice_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);
  }

  function updateSetting<K extends keyof MerchantSettings>(key: K, value: MerchantSettings[K]) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your AI receptionist</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* Business Information */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={settings.business_name}
                onChange={(e) => updateSetting('business_name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <input
                type="text"
                value={settings.business_type || ''}
                onChange={(e) => updateSetting('business_type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Hair Salon, Dental Practice"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => updateSetting('address', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => updateSetting('phone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </section>

        {/* AI Configuration */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">AI Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
              <textarea
                value={settings.greeting || ''}
                onChange={(e) => updateSetting('greeting', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Good morning, thank you for calling [Business Name]. How can I help you today?"
              />
              <p className="text-sm text-gray-500 mt-1">
                This is what callers will hear when they first connect.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
              <div className="grid grid-cols-2 gap-3">
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => updateSetting('voice_id', voice.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      settings.voice_id === voice.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{voice.name}</div>
                    <div className="text-sm text-gray-500">{voice.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Phone Number */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Phone Number</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {settings.twilio_phone_number || 'No number assigned'}
              </p>
              <p className="text-sm text-gray-500">
                Callers dial this number to reach your AI receptionist
              </p>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${
              settings.twilio_phone_number
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {settings.twilio_phone_number ? 'Active' : 'Not configured'}
            </span>
          </div>
        </section>

        {/* Google Calendar */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Calendar Integration</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Google Calendar</p>
              <p className="text-sm text-gray-500">
                {settings.google_calendar_connected
                  ? 'Your calendar is connected for availability checks'
                  : 'Connect your calendar to enable real-time availability'}
              </p>
            </div>
            <button
              className={`px-4 py-2 rounded-lg font-medium ${
                settings.google_calendar_connected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {settings.google_calendar_connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
