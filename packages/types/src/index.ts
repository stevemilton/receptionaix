export type { Database } from './database.js';

// Row type aliases for common tables
type Tables = import('./database.js').Database['public']['Tables'];
export type MerchantRow = Tables['merchants']['Row'];
export type MerchantInsert = Tables['merchants']['Insert'];
export type MerchantUpdate = Tables['merchants']['Update'];
export type CallRow = Tables['calls']['Row'];
export type CustomerRow = Tables['customers']['Row'];
export type AppointmentRow = Tables['appointments']['Row'];
export type MessageRow = Tables['messages']['Row'];
export type KnowledgeBaseRow = Tables['knowledge_bases']['Row'];
export type AdminUserRow = Tables['admin_users']['Row'];
