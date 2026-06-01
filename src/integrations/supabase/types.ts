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
      accounts: {
        Row: {
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_system: boolean
          kind: string
          name: string
          parent_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string
          id: string
          is_system?: boolean
          kind: string
          name: string
          parent_id?: string | null
          type: string
          user_id?: string
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          kind?: string
          name?: string
          parent_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: string | null
          id: string
          target: string
          type: string
          user_id: string
          value: number | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id: string
          target: string
          type: string
          user_id?: string
          value?: number | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          target?: string
          type?: string
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_name: string | null
          company_id: string | null
          currency: string
          default_vat_percentage: number
          email: string | null
          id: string
          logo: string | null
          name: string | null
          phone: string | null
          signature: string | null
          tax_number: string | null
          theme: string | null
          updated_at: string
          user_id: string
          vat_enabled: boolean
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          company_id?: string | null
          currency?: string
          default_vat_percentage?: number
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          phone?: string | null
          signature?: string | null
          tax_number?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          vat_enabled?: boolean
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          company_id?: string | null
          currency?: string
          default_vat_percentage?: number
          email?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          phone?: string | null
          signature?: string | null
          tax_number?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          vat_enabled?: boolean
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          payment_terms_days: number | null
          phone: string | null
          tax_registration_number: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id: string
          name: string
          payment_terms_days?: number | null
          phone?: string | null
          tax_registration_number?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          payment_terms_days?: number | null
          phone?: string | null
          tax_registration_number?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          approval_status: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          due_date: string | null
          id: string
          invoice_type: string | null
          items: Json
          lpo_number: string | null
          net_total: number
          notes: string | null
          number: string
          project_id: string | null
          project_name: string | null
          project_summary: Json | null
          project_total_value: number | null
          quotation_id: string | null
          salesman_id: string | null
          status: string
          subtotal: number | null
          terms: string | null
          total_percentage: number | null
          updated_at: string
          user_id: string
          vat_total: number | null
        }
        Insert: {
          approval_status?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string | null
          id: string
          invoice_type?: string | null
          items?: Json
          lpo_number?: string | null
          net_total?: number
          notes?: string | null
          number: string
          project_id?: string | null
          project_name?: string | null
          project_summary?: Json | null
          project_total_value?: number | null
          quotation_id?: string | null
          salesman_id?: string | null
          status?: string
          subtotal?: number | null
          terms?: string | null
          total_percentage?: number | null
          updated_at?: string
          user_id?: string
          vat_total?: number | null
        }
        Update: {
          approval_status?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string | null
          id?: string
          invoice_type?: string | null
          items?: Json
          lpo_number?: string | null
          net_total?: number
          notes?: string | null
          number?: string
          project_id?: string | null
          project_name?: string | null
          project_summary?: Json | null
          project_total_value?: number | null
          quotation_id?: string | null
          salesman_id?: string | null
          status?: string
          subtotal?: number | null
          terms?: string | null
          total_percentage?: number | null
          updated_at?: string
          user_id?: string
          vat_total?: number | null
        }
        Relationships: []
      }
      items: {
        Row: {
          company_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          rate: number
          reorder_level: number | null
          stock: number
          unit: string | null
          updated_at: string
          user_id: string
          vat_applicable: boolean
          vat_percentage: number
        }
        Insert: {
          company_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id: string
          name: string
          rate?: number
          reorder_level?: number | null
          stock?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
          vat_applicable?: boolean
          vat_percentage?: number
        }
        Update: {
          company_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rate?: number
          reorder_level?: number | null
          stock?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
          vat_applicable?: boolean
          vat_percentage?: number
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          company_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          idempotency_key: string | null
          lines: Json
          reference: string | null
          reference_id: string | null
          reference_type: string | null
          reversal_of: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id: string
          idempotency_key?: string | null
          lines?: Json
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversal_of?: string | null
          user_id?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          lines?: Json
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversal_of?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          date: string
          id: string
          invoice_id: string | null
          invoice_type: string
          method: string
          notes: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          date?: string
          id: string
          invoice_id?: string | null
          invoice_type?: string
          method?: string
          notes?: string | null
          reference?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          date?: string
          id?: string
          invoice_id?: string | null
          invoice_type?: string
          method?: string
          notes?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          activities: Json
          company_id: string | null
          created_at: string
          end_date: string | null
          id: string
          linked_invoice_ids: Json
          lpo_number: string | null
          name: string
          remaining_amount: number
          remaining_percentage: number
          start_date: string | null
          status: string
          total_invoiced_amount: number
          total_invoiced_percentage: number
          total_payment_received: number
          total_value: number
          updated_at: string
          user_id: string
          valuation_completed: boolean
          vendor_id: string | null
        }
        Insert: {
          activities?: Json
          company_id?: string | null
          created_at?: string
          end_date?: string | null
          id: string
          linked_invoice_ids?: Json
          lpo_number?: string | null
          name: string
          remaining_amount?: number
          remaining_percentage?: number
          start_date?: string | null
          status?: string
          total_invoiced_amount?: number
          total_invoiced_percentage?: number
          total_payment_received?: number
          total_value?: number
          updated_at?: string
          user_id?: string
          valuation_completed?: boolean
          vendor_id?: string | null
        }
        Update: {
          activities?: Json
          company_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          linked_invoice_ids?: Json
          lpo_number?: string | null
          name?: string
          remaining_amount?: number
          remaining_percentage?: number
          start_date?: string | null
          status?: string
          total_invoiced_amount?: number
          total_invoiced_percentage?: number
          total_payment_received?: number
          total_value?: number
          updated_at?: string
          user_id?: string
          valuation_completed?: boolean
          vendor_id?: string | null
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          company_id: string | null
          created_at: string
          due_date: string | null
          id: string
          items: Json
          net_total: number
          notes: string | null
          number: string
          status: string
          terms: string | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          due_date?: string | null
          id: string
          items?: Json
          net_total?: number
          notes?: string | null
          number: string
          status?: string
          terms?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          items?: Json
          net_total?: number
          notes?: string | null
          number?: string
          status?: string
          terms?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      quotations: {
        Row: {
          client_id: string | null
          company_id: string | null
          converted_invoice_id: string | null
          created_at: string
          id: string
          items: Json
          net_total: number
          notes: string | null
          number: string
          salesman_id: string | null
          status: string
          terms: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          id: string
          items?: Json
          net_total?: number
          notes?: string | null
          number: string
          salesman_id?: string | null
          status?: string
          terms?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          net_total?: number
          notes?: string | null
          number?: string
          salesman_id?: string | null
          status?: string
          terms?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salesmen: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id: string
          name: string
          phone?: string | null
          user_id?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          date: string
          details: Json | null
          id: string
          method: string | null
          narration: string | null
          number: string
          party_name: string | null
          reference: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          date?: string
          details?: Json | null
          id: string
          method?: string | null
          narration?: string | null
          number: string
          party_name?: string | null
          reference?: string | null
          type: string
          user_id?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          date?: string
          details?: Json | null
          id?: string
          method?: string | null
          narration?: string | null
          number?: string
          party_name?: string | null
          reference?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
