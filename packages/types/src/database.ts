export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          call_id: string | null
          created_at: string | null
          customer_id: string
          end_time: string
          google_event_id: string | null
          id: string
          merchant_id: string
          reminder_sent: boolean | null
          service_name: string
          start_time: string
          status: string | null
        }
        Insert: {
          call_id?: string | null
          created_at?: string | null
          customer_id: string
          end_time: string
          google_event_id?: string | null
          id?: string
          merchant_id: string
          reminder_sent?: boolean | null
          service_name: string
          start_time: string
          status?: string | null
        }
        Update: {
          call_id?: string | null
          created_at?: string | null
          customer_id?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          merchant_id?: string
          reminder_sent?: boolean | null
          service_name?: string
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          ai_confidence: number | null
          caller_phone: string
          created_at: string | null
          customer_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          merchant_id: string
          outcome: string | null
          recording_url: string | null
          started_at: string | null
          summary: string | null
          transcript: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          ai_confidence?: number | null
          caller_phone: string
          created_at?: string | null
          customer_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          merchant_id: string
          outcome?: string | null
          recording_url?: string | null
          started_at?: string | null
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          ai_confidence?: number | null
          caller_phone?: string
          created_at?: string | null
          customer_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          merchant_id?: string
          outcome?: string | null
          recording_url?: string | null
          started_at?: string | null
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          email: string | null
          id: string
          last_contact_at: string | null
          merchant_id: string
          name: string | null
          notes: string | null
          phone: string
          postcode: string | null
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          merchant_id: string
          name?: string | null
          notes?: string | null
          phone: string
          postcode?: string | null
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          merchant_id?: string
          name?: string | null
          notes?: string | null
          phone?: string
          postcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          merchant_id: string
          question: string
          service_id: string | null
          sort_order: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id: string
          question: string
          service_id?: string | null
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string
          question?: string
          service_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          content: string | null
          created_at: string | null
          faqs: Json | null
          google_maps_data: Json | null
          id: string
          merchant_id: string
          opening_hours: Json | null
          scraped_data: Json | null
          services: Json | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          faqs?: Json | null
          google_maps_data?: Json | null
          id?: string
          merchant_id: string
          opening_hours?: Json | null
          scraped_data?: Json | null
          services?: Json | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          faqs?: Json | null
          google_maps_data?: Json | null
          id?: string
          merchant_id?: string
          opening_hours?: Json | null
          scraped_data?: Json | null
          services?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          billing_period_start: string | null
          business_name: string
          business_type: string | null
          consent_updated_at: string | null
          created_at: string | null
          data_sharing_consent: boolean | null
          email: string
          forward_phone: string | null
          google_calendar_connected: boolean | null
          google_calendar_token: Json | null
          greeting: string | null
          id: string
          last_active_at: string | null
          marketing_consent: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          plan_status: string | null
          plan_tier: string | null
          settings: Json | null
          stripe_customer_id: string | null
          stripe_overage_item_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          twilio_number: string | null
          twilio_phone_number: string | null
          updated_at: string | null
          voice_config: Json | null
          voice_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_period_start?: string | null
          business_name: string
          business_type?: string | null
          consent_updated_at?: string | null
          created_at?: string | null
          data_sharing_consent?: boolean | null
          email: string
          forward_phone?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_token?: Json | null
          greeting?: string | null
          id?: string
          last_active_at?: string | null
          marketing_consent?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan_status?: string | null
          plan_tier?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_overage_item_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          twilio_number?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          voice_config?: Json | null
          voice_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_period_start?: string | null
          business_name?: string
          business_type?: string | null
          consent_updated_at?: string | null
          created_at?: string | null
          data_sharing_consent?: boolean | null
          email?: string
          forward_phone?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_token?: Json | null
          greeting?: string | null
          id?: string
          last_active_at?: string | null
          marketing_consent?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan_status?: string | null
          plan_tier?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_overage_item_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          twilio_number?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          voice_config?: Json | null
          voice_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      onboarding_sessions: {
        Row: {
          collected_data: Json | null
          completed_at: string | null
          created_at: string | null
          current_step: string | null
          id: string
          merchant_id: string
          session_type: string
          started_at: string | null
          status: string | null
          transcript: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          collected_data?: Json | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          id?: string
          merchant_id: string
          session_type: string
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          collected_data?: Json | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          id?: string
          merchant_id?: string
          session_type?: string
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          insurance_info: string | null
          is_active: boolean | null
          merchant_id: string
          name: string
          preparation_instructions: string | null
          price_pence: number | null
          sort_order: number | null
          updated_at: string | null
          what_to_bring: string | null
          what_to_wear: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          insurance_info?: string | null
          is_active?: boolean | null
          merchant_id: string
          name: string
          preparation_instructions?: string | null
          price_pence?: number | null
          sort_order?: number | null
          updated_at?: string | null
          what_to_bring?: string | null
          what_to_wear?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          insurance_info?: string | null
          is_active?: boolean | null
          merchant_id?: string
          name?: string
          preparation_instructions?: string | null
          price_pence?: number | null
          sort_order?: number | null
          updated_at?: string | null
          what_to_bring?: string | null
          what_to_wear?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_merchant_call_count: {
        Args: {
          p_merchant_id: string
          p_period_start: string
        }
        Returns: {
          call_count: number
          total_minutes: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
