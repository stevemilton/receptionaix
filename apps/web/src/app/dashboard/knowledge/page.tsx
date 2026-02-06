'use client';

import { useEffect, useState } from 'react';

interface Service {
  name: string;
  description?: string;
  duration?: number;
  price?: number;
}

interface FAQ {
  question: string;
  answer: string;
}

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [openingHours, setOpeningHours] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'services' | 'faqs' | 'hours'>('services');

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  async function loadKnowledgeBase() {
    try {
      const resp = await fetch('/api/knowledge/kb');
      if (!resp.ok) {
        console.error('KB fetch failed:', resp.status);
        setOpeningHours(getDefaultHours());
        setLoading(false);
        return;
      }
      const { data } = await resp.json();

      if (data) {
        setServices(Array.isArray(data.services) ? data.services : []);
        setFaqs(Array.isArray(data.faqs) ? data.faqs : []);
        setOpeningHours(data.opening_hours ? data.opening_hours : getDefaultHours());
      } else {
        setOpeningHours(getDefaultHours());
      }
    } catch (err) {
      console.error('KB load error:', err);
      setOpeningHours(getDefaultHours());
    }
    setLoading(false);
  }

  async function saveKnowledgeBase() {
    setSaving(true);
    try {
      await fetch('/api/knowledge/kb', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services,
          faqs,
          opening_hours: openingHours,
        }),
      });
    } catch (err) {
      console.error('KB save error:', err);
    }
    setSaving(false);
  }

  function addService() {
    setServices([...services, { name: '', description: '', duration: 30, price: 0 }]);
  }

  function updateService(index: number, field: keyof Service, value: string | number) {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  }

  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  function addFaq() {
    setFaqs([...faqs, { question: '', answer: '' }]);
  }

  function updateFaq(index: number, field: 'question' | 'answer', value: string) {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  }

  function removeFaq(index: number) {
    setFaqs(faqs.filter((_, i) => i !== index));
  }

  function updateHours(day: string, value: string) {
    setOpeningHours({ ...openingHours, [day]: value });
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600">Configure what your AI receptionist knows</p>
        </div>
        <button
          onClick={saveKnowledgeBase}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        <TabButton active={activeTab === 'services'} onClick={() => setActiveTab('services')}>
          Services
        </TabButton>
        <TabButton active={activeTab === 'faqs'} onClick={() => setActiveTab('faqs')}>
          FAQs
        </TabButton>
        <TabButton active={activeTab === 'hours'} onClick={() => setActiveTab('hours')}>
          Opening Hours
        </TabButton>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium text-gray-900">Service {index + 1}</h3>
                <button
                  onClick={() => removeService(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateService(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Haircut"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={service.description || ''}
                    onChange={(e) => updateService(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={service.duration || ''}
                    onChange={(e) => updateService(index, 'duration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                  <input
                    type="number"
                    value={service.price || ''}
                    onChange={(e) => updateService(index, 'price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addService}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-500 hover:text-primary-600"
          >
            + Add Service
          </button>
        </div>
      )}

      {/* FAQs Tab */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium text-gray-900">FAQ {index + 1}</h3>
                <button
                  onClick={() => removeFaq(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(index, 'question', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Do you accept walk-ins?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="The answer your AI will give"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addFaq}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-500 hover:text-primary-600"
          >
            + Add FAQ
          </button>
        </div>
      )}

      {/* Hours Tab */}
      {activeTab === 'hours' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="space-y-4">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-28 text-sm font-medium text-gray-700">{day}</span>
                <input
                  type="text"
                  value={openingHours[day] || ''}
                  onChange={(e) => updateHours(day, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 9:00 AM - 5:00 PM or Closed"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDefaultHours(): Record<string, string> {
  return {
    Monday: '9:00 AM - 5:00 PM',
    Tuesday: '9:00 AM - 5:00 PM',
    Wednesday: '9:00 AM - 5:00 PM',
    Thursday: '9:00 AM - 5:00 PM',
    Friday: '9:00 AM - 5:00 PM',
    Saturday: 'Closed',
    Sunday: 'Closed',
  };
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}
