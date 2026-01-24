// Generated types - run `pnpm db:types` to update
export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          email: string;
          business_name: string;
          business_type: string | null;
          address: string | null;
          phone: string | null;
          website: string | null;
          twilio_phone_number: string | null;
          google_calendar_token: Record<string, unknown> | null;
          google_calendar_connected: boolean;
          voice_id: string | null;
          greeting: string | null;
          settings: Record<string, unknown>;
          subscription_status: string;
          subscription_ends_at: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          business_name: string;
          business_type?: string | null;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          twilio_phone_number?: string | null;
          google_calendar_token?: Record<string, unknown> | null;
          google_calendar_connected?: boolean;
          voice_id?: string | null;
          greeting?: string | null;
          settings?: Record<string, unknown>;
          subscription_status?: string;
          subscription_ends_at?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          business_name?: string;
          business_type?: string | null;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          twilio_phone_number?: string | null;
          google_calendar_token?: Record<string, unknown> | null;
          google_calendar_connected?: boolean;
          voice_id?: string | null;
          greeting?: string | null;
          settings?: Record<string, unknown>;
          subscription_status?: string;
          subscription_ends_at?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_bases: {
        Row: {
          id: string;
          merchant_id: string;
          content: string | null;
          opening_hours: Record<string, unknown> | null;
          services: Record<string, unknown> | null;
          faqs: Record<string, unknown> | null;
          google_maps_data: Record<string, unknown> | null;
          scraped_data: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          content?: string | null;
          opening_hours?: Record<string, unknown> | null;
          services?: Record<string, unknown> | null;
          faqs?: Record<string, unknown> | null;
          google_maps_data?: Record<string, unknown> | null;
          scraped_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          content?: string | null;
          opening_hours?: Record<string, unknown> | null;
          services?: Record<string, unknown> | null;
          faqs?: Record<string, unknown> | null;
          google_maps_data?: Record<string, unknown> | null;
          scraped_data?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          merchant_id: string;
          phone: string;
          name: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          phone: string;
          name?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          phone?: string;
          name?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          merchant_id: string;
          customer_id: string | null;
          service_name: string;
          start_time: string;
          end_time: string;
          status: string;
          google_event_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          customer_id?: string | null;
          service_name: string;
          start_time: string;
          end_time: string;
          status?: string;
          google_event_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          customer_id?: string | null;
          service_name?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          google_event_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          merchant_id: string;
          caller_phone: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          transcript: string | null;
          summary: string | null;
          status: string;
          recording_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          caller_phone: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          transcript?: string | null;
          summary?: string | null;
          status?: string;
          recording_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          caller_phone?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          transcript?: string | null;
          summary?: string | null;
          status?: string;
          recording_url?: string | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          merchant_id: string;
          caller_name: string | null;
          caller_phone: string;
          content: string;
          urgency: string;
          read: boolean;
          call_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          caller_name?: string | null;
          caller_phone: string;
          content: string;
          urgency?: string;
          read?: boolean;
          call_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          caller_name?: string | null;
          caller_phone?: string;
          content?: string;
          urgency?: string;
          read?: boolean;
          call_id?: string | null;
          created_at?: string;
        };
      };
      call_errors: {
        Row: {
          id: string;
          call_id: string | null;
          merchant_id: string | null;
          error_type: string;
          error_code: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id?: string | null;
          merchant_id?: string | null;
          error_type: string;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string | null;
          merchant_id?: string | null;
          error_type?: string;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      admin_users: {
        Row: {
          id: string;
          user_id: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          role?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
