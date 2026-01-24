// Business domain types

export interface Merchant {
  id: string;
  email: string;
  businessName: string;
  businessType: string | null;
  phone: string | null;
  website: string | null;
  twilioPhoneNumber: string | null;
  googleCalendarToken: GoogleCalendarToken | null;
  settings: MerchantSettings;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantSettings {
  greeting?: string;
  services?: Service[];
  voiceId?: string;
  voiceSpeed?: number;
  slotDuration?: number;
}

export interface Service {
  name: string;
  duration: number; // minutes
  price: number;
  description?: string;
}

export interface GoogleCalendarToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface KnowledgeBase {
  id: string;
  merchantId: string;
  content: string | null;
  openingHours: OpeningHours | null;
  services: Service[] | null;
  faqs: FAQ[] | null;
  googleMapsData: GoogleMapsData | null;
  scrapedData: ScrapedData | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface GoogleMapsData {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  types: string[];
}

export interface ScrapedData {
  url: string;
  title: string | null;
  content: string | null;
  scrapedAt: Date;
}

export interface Customer {
  id: string;
  merchantId: string;
  phone: string;
  name: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  merchantId: string;
  customerId: string | null;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  googleEventId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Call {
  id: string;
  merchantId: string;
  callerPhone: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  transcript: string | null;
  summary: string | null;
  status: CallStatus;
  recordingUrl: string | null;
  createdAt: Date;
}

export type CallStatus = 'in_progress' | 'completed' | 'failed';

export interface Message {
  id: string;
  merchantId: string;
  callerName: string | null;
  callerPhone: string;
  content: string;
  urgency: MessageUrgency;
  read: boolean;
  callId: string | null;
  createdAt: Date;
}

export type MessageUrgency = 'low' | 'medium' | 'high';

export interface CallError {
  id: string;
  callId: string | null;
  merchantId: string | null;
  errorType: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
}
