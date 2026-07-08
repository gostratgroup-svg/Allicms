export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type PublicTable<Row, Insert, Update, Relationships = []> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relationships
}

type TenantRelationship = {
  foreignKeyName: string
  columns: ['tenant_id']
  isOneToOne: false
  referencedRelation: 'tenants'
  referencedColumns: ['id']
}

type PracticeProfileRelationship = {
  foreignKeyName: string
  columns: ['practice_profile_id']
  isOneToOne: false
  referencedRelation: 'practice_profiles'
  referencedColumns: ['id']
}

type ProfileRelationship = {
  foreignKeyName: string
  columns: ['user_id']
  isOneToOne: false
  referencedRelation: 'profiles'
  referencedColumns: ['id']
}

type TherapistProfileRelationship = {
  foreignKeyName: string
  columns: ['therapist_profile_id']
  isOneToOne: false
  referencedRelation: 'therapist_profiles'
  referencedColumns: ['id']
}

export type Database = {
  public: {
    Tables: {
      audit_events: PublicTable<
        {
          id: string
          tenant_id: string | null
          actor_profile_id: string | null
          actor_tenant_user_id: string | null
          action: string
          entity_table: string
          entity_id: string | null
          occurred_at: string
          metadata: Json
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id?: string | null
          actor_profile_id?: string | null
          actor_tenant_user_id?: string | null
          action: string
          entity_table: string
          entity_id?: string | null
          occurred_at?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string | null
          actor_profile_id?: string | null
          actor_tenant_user_id?: string | null
          action?: string
          entity_table?: string
          entity_id?: string | null
          occurred_at?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        },
        [
          {
            foreignKeyName: 'audit_events_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_actor_profile_id_fkey'
            columns: ['actor_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_events_actor_tenant_user_id_fkey'
            columns: ['actor_tenant_user_id']
            isOneToOne: false
            referencedRelation: 'tenant_users'
            referencedColumns: ['id']
          },
        ]
      >
      bank_accounts: PublicTable<
        {
          id: string
          tenant_id: string
          owner_type: string
          owner_id: string | null
          account_label: string | null
          bank_name: string
          account_holder: string
          account_number: string
          branch_code: string | null
          account_type: string | null
          is_default: boolean
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          owner_type?: string
          owner_id?: string | null
          account_label?: string | null
          bank_name: string
          account_holder: string
          account_number: string
          branch_code?: string | null
          account_type?: string | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          owner_type?: string
          owner_id?: string | null
          account_label?: string | null
          bank_name?: string
          account_holder?: string
          account_number?: string
          branch_code?: string | null
          account_type?: string | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [TenantRelationship]
      >
      billing_settings: PublicTable<
        {
          id: string
          tenant_id: string
          practice_profile_id: string | null
          invoice_prefix: string
          next_invoice_number: number
          statement_prefix: string
          next_statement_number: number
          payment_terms_days: number
          default_bank_account_id: string | null
          allow_therapist_billing: boolean
          allow_therapist_bank_accounts: boolean
          allow_price_override: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          practice_profile_id?: string | null
          invoice_prefix?: string
          next_invoice_number?: number
          statement_prefix?: string
          next_statement_number?: number
          payment_terms_days?: number
          default_bank_account_id?: string | null
          allow_therapist_billing?: boolean
          allow_therapist_bank_accounts?: boolean
          allow_price_override?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          practice_profile_id?: string | null
          invoice_prefix?: string
          next_invoice_number?: number
          statement_prefix?: string
          next_statement_number?: number
          payment_terms_days?: number
          default_bank_account_id?: string | null
          allow_therapist_billing?: boolean
          allow_therapist_bank_accounts?: boolean
          allow_price_override?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [
          TenantRelationship,
          PracticeProfileRelationship,
          {
            foreignKeyName: 'billing_settings_default_bank_account_id_fkey'
            columns: ['default_bank_account_id']
            isOneToOne: false
            referencedRelation: 'bank_accounts'
            referencedColumns: ['id']
          },
        ]
      >
      communication_templates: PublicTable<
        {
          id: string
          tenant_id: string
          practice_profile_id: string | null
          template_key: string
          channel: string
          title: string
          message_body: string
          automation_trigger_key: string | null
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          practice_profile_id?: string | null
          template_key: string
          channel: string
          title: string
          message_body: string
          automation_trigger_key?: string | null
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          practice_profile_id?: string | null
          template_key?: string
          channel?: string
          title?: string
          message_body?: string
          automation_trigger_key?: string | null
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [TenantRelationship, PracticeProfileRelationship]
      >
      platform_configurations: PublicTable<
        {
          id: string
          config_key: string
          config_value: Json
          description: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          config_key: string
          config_value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        },
        []
      >
      practice_branding: PublicTable<
        {
          id: string
          tenant_id: string
          practice_profile_id: string | null
          logo_url: string | null
          primary_colour: string | null
          secondary_colour: string | null
          accent_colour: string | null
          invoice_logo_position: string
          statement_logo_position: string
          patient_facing_display_name: string | null
          document_branding_enabled: boolean
          patient_link_branding_enabled: boolean
          communication_branding_enabled: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          practice_profile_id?: string | null
          logo_url?: string | null
          primary_colour?: string | null
          secondary_colour?: string | null
          accent_colour?: string | null
          invoice_logo_position?: string
          statement_logo_position?: string
          patient_facing_display_name?: string | null
          document_branding_enabled?: boolean
          patient_link_branding_enabled?: boolean
          communication_branding_enabled?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          practice_profile_id?: string | null
          logo_url?: string | null
          primary_colour?: string | null
          secondary_colour?: string | null
          accent_colour?: string | null
          invoice_logo_position?: string
          statement_logo_position?: string
          patient_facing_display_name?: string | null
          document_branding_enabled?: boolean
          patient_link_branding_enabled?: boolean
          communication_branding_enabled?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [TenantRelationship, PracticeProfileRelationship]
      >
      practice_locations: PublicTable<
        {
          id: string
          tenant_id: string
          practice_profile_id: string | null
          location_name: string
          location_type: string
          address_line_1: string | null
          address_line_2: string | null
          suburb: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          country: string
          contact_email: string | null
          contact_phone: string | null
          room_venue_notes: string | null
          is_main_location: boolean
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          practice_profile_id?: string | null
          location_name: string
          location_type?: string
          address_line_1?: string | null
          address_line_2?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string
          contact_email?: string | null
          contact_phone?: string | null
          room_venue_notes?: string | null
          is_main_location?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          practice_profile_id?: string | null
          location_name?: string
          location_type?: string
          address_line_1?: string | null
          address_line_2?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string
          contact_email?: string | null
          contact_phone?: string | null
          room_venue_notes?: string | null
          is_main_location?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [TenantRelationship, PracticeProfileRelationship]
      >
      practice_profiles: PublicTable<
        {
          id: string
          tenant_id: string
          legal_name: string | null
          trading_name: string | null
          business_registration_number: string | null
          tax_number: string | null
          vat_number: string | null
          main_email: string | null
          main_phone: string | null
          website: string | null
          default_time_zone: string
          default_country: string
          default_currency: string
          profile_status: string
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          legal_name?: string | null
          trading_name?: string | null
          business_registration_number?: string | null
          tax_number?: string | null
          vat_number?: string | null
          main_email?: string | null
          main_phone?: string | null
          website?: string | null
          default_time_zone?: string
          default_country?: string
          default_currency?: string
          profile_status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          legal_name?: string | null
          trading_name?: string | null
          business_registration_number?: string | null
          tax_number?: string | null
          vat_number?: string | null
          main_email?: string | null
          main_phone?: string | null
          website?: string | null
          default_time_zone?: string
          default_country?: string
          default_currency?: string
          profile_status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [TenantRelationship]
      >
      profiles: PublicTable<
        {
          id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          is_super_admin: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        []
      >
      professional_registrations: PublicTable<
        {
          id: string
          tenant_id: string
          therapist_profile_id: string
          registration_body: string
          registration_number: string
          registration_type: string | null
          country: string
          valid_from: string | null
          valid_until: string | null
          is_primary: boolean
          is_active: boolean
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          therapist_profile_id: string
          registration_body: string
          registration_number: string
          registration_type?: string | null
          country?: string
          valid_from?: string | null
          valid_until?: string | null
          is_primary?: boolean
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          therapist_profile_id?: string
          registration_body?: string
          registration_number?: string
          registration_type?: string | null
          country?: string
          valid_from?: string | null
          valid_until?: string | null
          is_primary?: boolean
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, TherapistProfileRelationship]
      >
      subscription_plans: PublicTable<
        {
          id: string
          plan_code: string
          plan_name: string
          description: string | null
          user_min: number | null
          user_max: number | null
          price_monthly: number | null
          currency_code: string
          is_active: boolean
          is_public: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          plan_code: string
          plan_name: string
          description?: string | null
          user_min?: number | null
          user_max?: number | null
          price_monthly?: number | null
          currency_code?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          plan_code?: string
          plan_name?: string
          description?: string | null
          user_min?: number | null
          user_max?: number | null
          price_monthly?: number | null
          currency_code?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        []
      >
      therapist_profiles: PublicTable<
        {
          id: string
          tenant_id: string
          user_id: string | null
          display_name: string
          profession: string | null
          qualifications: string | null
          bio: string | null
          default_appointment_duration_minutes: number | null
          default_billing_rate: number | null
          practice_number: string | null
          billing_name: string | null
          billing_email: string | null
          billing_phone: string | null
          is_active: boolean
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          user_id?: string | null
          display_name: string
          profession?: string | null
          qualifications?: string | null
          bio?: string | null
          default_appointment_duration_minutes?: number | null
          default_billing_rate?: number | null
          practice_number?: string | null
          billing_name?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          user_id?: string | null
          display_name?: string
          profession?: string | null
          qualifications?: string | null
          bio?: string | null
          default_appointment_duration_minutes?: number | null
          default_billing_rate?: number | null
          practice_number?: string | null
          billing_name?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, ProfileRelationship]
      >
      tenant_subscriptions: PublicTable<
        {
          id: string
          tenant_id: string
          subscription_plan_id: string | null
          subscription_status: string
          billing_cycle: string
          trial_started_at: string | null
          trial_ends_at: string | null
          current_period_starts_at: string | null
          current_period_ends_at: string | null
          next_billing_date: string | null
          cancelled_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          subscription_plan_id?: string | null
          subscription_status?: string
          billing_cycle?: string
          trial_started_at?: string | null
          trial_ends_at?: string | null
          current_period_starts_at?: string | null
          current_period_ends_at?: string | null
          next_billing_date?: string | null
          cancelled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          subscription_plan_id?: string | null
          subscription_status?: string
          billing_cycle?: string
          trial_started_at?: string | null
          trial_ends_at?: string | null
          current_period_starts_at?: string | null
          current_period_ends_at?: string | null
          next_billing_date?: string | null
          cancelled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'tenant_subscriptions_subscription_plan_id_fkey'
            columns: ['subscription_plan_id']
            isOneToOne: false
            referencedRelation: 'subscription_plans'
            referencedColumns: ['id']
          },
        ]
      >
      tenant_users: PublicTable<
        {
          id: string
          tenant_id: string
          profile_id: string
          role: string
          is_active: boolean
          invited_at: string | null
          activated_at: string | null
          deactivated_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          tenant_id: string
          profile_id: string
          role: string
          is_active?: boolean
          invited_at?: string | null
          activated_at?: string | null
          deactivated_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          tenant_id?: string
          profile_id?: string
          role?: string
          is_active?: boolean
          invited_at?: string | null
          activated_at?: string | null
          deactivated_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'tenant_users_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      >
      tenants: PublicTable<
        {
          id: string
          practice_name: string
          trading_name: string | null
          company_registration_number: string | null
          vat_number: string | null
          primary_contact_name: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          country: string
          time_zone: string
          tenant_status: string
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        },
        {
          id?: string
          practice_name: string
          trading_name?: string | null
          company_registration_number?: string | null
          vat_number?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          country?: string
          time_zone?: string
          tenant_status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        {
          id?: string
          practice_name?: string
          trading_name?: string | null
          company_registration_number?: string | null
          vat_number?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          country?: string
          time_zone?: string
          tenant_status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        },
        []
      >
    }
    Views: Record<string, never>
    Functions: {
      has_tenant_role: {
        Args: {
          target_tenant_id: string
          allowed_roles: string[]
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tenant_member: {
        Args: {
          target_tenant_id: string
        }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
