'use client';

import { useEffect, useState } from 'react';
import {
  formatPhone,
  timeAgo,
  UrgencyBadge,
  PageHeader,
  EmptyState,
  MessageIcon,
} from '../_components/shared';

interface Message {
  id: string;
  caller_name: string | null;
  caller_phone: string;
  content: string;
  urgency: string | null;
  read: boolean;
  created_at: string | null;
  call_id: string | null;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const resp = await fetch('/api/messages');
      if (resp.ok) {
        const { data } = await resp.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoading(false);
  }

  async function markAsRead(messageId: string) {
    try {
      await fetch(`/api/messages/${messageId}/read`, { method: 'PUT' });
      setMessages(messages.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/messages/mark-all-read', { method: 'PUT' });
      setMessages(messages.map(m => ({ ...m, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.read;
    if (filter === 'read') return m.read;
    return true;
  });

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <PageHeader title="Messages" subtitle="Messages left by callers through your AI receptionist" />
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap mt-1"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? `All (${messages.length})` : f === 'unread' ? `Unread (${unreadCount})` : `Read (${messages.length - unreadCount})`}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-xl border p-5 transition-colors ${
                !msg.read ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  !msg.read ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <MessageIcon className={`w-5 h-5 ${!msg.read ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {msg.caller_name || formatPhone(msg.caller_phone)}
                    </span>
                    <UrgencyBadge urgency={msg.urgency || 'medium'} />
                    {!msg.read && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                  </div>
                  {msg.caller_name && (
                    <div className="text-xs text-gray-400 mb-1">{formatPhone(msg.caller_phone)}</div>
                  )}
                  <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-400">{timeAgo(msg.created_at || '')}</span>
                    {!msg.read && (
                      <button
                        onClick={() => markAsRead(msg.id)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        Mark as read
                      </button>
                    )}
                    {msg.call_id && (
                      <a
                        href={`/dashboard/calls/${msg.call_id}`}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        View call →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageIcon}
          title={filter === 'unread' ? 'No unread messages' : 'No messages yet'}
          description="When callers leave messages through your AI receptionist, they will appear here."
        />
      )}
    </div>
  );
}
