export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_bookings: {
        Row: {
          biggest_challenge: string
          business_name: string
          created_at: string
          duration_minutes: number
          email: string
          full_name: string
          gift_card_status: Database["public"]["Enums"]["gift_card_status"]
          id: string
          industry: Database["public"]["Enums"]["industry_vertical"]
          industry_other: string | null
          phone: string | null
          revenue_band: Database["public"]["Enums"]["revenue_band"]
          scheduled_at: string
          source: string | null
          status: Database["public"]["Enums"]["audit_status"]
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          biggest_challenge: string
          business_name: string
          created_at?: string
          duration_minutes?: number
          email: string
          full_name: string
          gift_card_status: Database["public"]["Enums"]["gift_card_status"]
          id?: string
          industry: Database["public"]["Enums"]["industry_vertical"]
          industry_other?: string | null
          phone?: string | null
          revenue_band: Database["public"]["Enums"]["revenue_band"]
          scheduled_at: string
          source?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          biggest_challenge?: string
          business_name?: string
          created_at?: string
          duration_minutes?: number
          email?: string
          full_name?: string
          gift_card_status?: Database["public"]["Enums"]["gift_card_status"]
          id?: string
          industry?: Database["public"]["Enums"]["industry_vertical"]
          industry_other?: string | null
          phone?: string | null
          revenue_band?: Database["public"]["Enums"]["revenue_band"]
          scheduled_at?: string
          source?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      availability_windows: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          slot_duration_minutes: number
          start_time: string
          timezone: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          start_time: string
          timezone?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          start_time?: string
          timezone?: string
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          industry: Database["public"]["Enums"]["industry_vertical"] | null
          is_active: boolean
          name: string
          notes: string | null
          points_per_giftcard: number
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: Database["public"]["Enums"]["industry_vertical"] | null
          is_active?: boolean
          name: string
          notes?: string | null
          points_per_giftcard?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: Database["public"]["Enums"]["industry_vertical"] | null
          is_active?: boolean
          name?: string
          notes?: string | null
          points_per_giftcard?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          client_id: string
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_contact_at: string | null
          last_name: string | null
          last_purchase_at: string | null
          loyalty_points: number
          phone: string | null
          purchase_count: number
          source: string | null
          tags: string[] | null
          total_spent_cents: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_contact_at?: string | null
          last_name?: string | null
          last_purchase_at?: string | null
          loyalty_points?: number
          phone?: string | null
          purchase_count?: number
          source?: string | null
          tags?: string[] | null
          total_spent_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_contact_at?: string | null
          last_name?: string | null
          last_purchase_at?: string | null
          loyalty_points?: number
          phone?: string | null
          purchase_count?: number
          source?: string | null
          tags?: string[] | null
          total_spent_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          approval_status: Database["public"]["Enums"]["email_approval_status"]
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          created_by: string
          html_sanitized: string
          id: string
          notes: string | null
          preheader: string | null
          recipient_customer_ids: string[] | null
          send_at: string | null
          send_to_all: boolean
          status: Database["public"]["Enums"]["email_draft_status"]
          subject: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["email_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          created_by: string
          html_sanitized: string
          id?: string
          notes?: string | null
          preheader?: string | null
          recipient_customer_ids?: string[] | null
          send_at?: string | null
          send_to_all?: boolean
          status?: Database["public"]["Enums"]["email_draft_status"]
          subject: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["email_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          html_sanitized?: string
          id?: string
          notes?: string | null
          preheader?: string | null
          recipient_customer_ids?: string[] | null
          send_at?: string | null
          send_to_all?: boolean
          status?: Database["public"]["Enums"]["email_draft_status"]
          subject?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_sales: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          buyer_name: string | null
          card_code: string | null
          client_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          product_name: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_cents: number
          sold_at: string
          source: string | null
          status: Database["public"]["Enums"]["gift_card_sale_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_email?: string | null
          buyer_name?: string | null
          card_code?: string | null
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          product_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_cents?: number
          sold_at: string
          source?: string | null
          status?: Database["public"]["Enums"]["gift_card_sale_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          buyer_name?: string | null
          card_code?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          product_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_cents?: number
          sold_at?: string
          source?: string | null
          status?: Database["public"]["Enums"]["gift_card_sale_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          client_id: string
          created_at: string
          customer_id: string
          gift_card_sale_id: string | null
          id: string
          note: string | null
          points: number
          type: Database["public"]["Enums"]["loyalty_txn_type"]
        }
        Insert: {
          balance_after: number
          client_id: string
          created_at?: string
          customer_id: string
          gift_card_sale_id?: string | null
          id?: string
          note?: string | null
          points: number
          type: Database["public"]["Enums"]["loyalty_txn_type"]
        }
        Update: {
          balance_after?: number
          client_id?: string
          created_at?: string
          customer_id?: string
          gift_card_sale_id?: string | null
          id?: string
          note?: string | null
          points?: number
          type?: Database["public"]["Enums"]["loyalty_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_gift_card_sale_id_fkey"
            columns: ["gift_card_sale_id"]
            isOneToOne: false
            referencedRelation: "gift_card_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_ids_for_user: { Args: { _user_id: string }; Returns: string[] }
      get_booked_slots: {
        Args: { range_end: string; range_start: string }
        Returns: {
          scheduled_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_belongs_to_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      audit_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      email_approval_status:
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "cancelled"
      email_draft_status:
        | "draft"
        | "submitted"
        | "scheduled"
        | "sent"
        | "archived"
      gift_card_sale_status:
        | "sold"
        | "partially_redeemed"
        | "redeemed"
        | "refunded"
        | "expired"
      gift_card_status: "have_program" | "considering" | "none"
      industry_vertical:
        | "spa"
        | "salon"
        | "restaurant"
        | "golf_club"
        | "specialty_retail"
        | "gun_shop"
        | "other"
      loyalty_txn_type: "earned" | "redeemed" | "adjustment" | "expired"
      revenue_band: "under_150k" | "150k_500k" | "500k_1m" | "1m_2m" | "over_2m"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      audit_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      email_approval_status: [
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "cancelled",
      ],
      email_draft_status: [
        "draft",
        "submitted",
        "scheduled",
        "sent",
        "archived",
      ],
      gift_card_sale_status: [
        "sold",
        "partially_redeemed",
        "redeemed",
        "refunded",
        "expired",
      ],
      gift_card_status: ["have_program", "considering", "none"],
      industry_vertical: [
        "spa",
        "salon",
        "restaurant",
        "golf_club",
        "specialty_retail",
        "gun_shop",
        "other",
      ],
      loyalty_txn_type: ["earned", "redeemed", "adjustment", "expired"],
      revenue_band: ["under_150k", "150k_500k", "500k_1m", "1m_2m", "over_2m"],
    },
  },
} as const
