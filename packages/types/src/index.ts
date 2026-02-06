export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.js';

// Row type aliases for common tables
type DbTables = import('./database.js').Database['public']['Tables'];
export type MerchantRow = DbTables['merchants']['Row'];
export type MerchantInsert = DbTables['merchants']['Insert'];
export type MerchantUpdate = DbTables['merchants']['Update'];
export type CallRow = DbTables['calls']['Row'];
export type CustomerRow = DbTables['customers']['Row'];
export type AppointmentRow = DbTables['appointments']['Row'];
export type KnowledgeBaseRow = DbTables['knowledge_bases']['Row'];
export type ServiceRow = DbTables['services']['Row'];
export type FaqRow = DbTables['faqs']['Row'];
export type OnboardingSessionRow = DbTables['onboarding_sessions']['Row'];
