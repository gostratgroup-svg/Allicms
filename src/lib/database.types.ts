export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          status: 'trial' | 'active' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: 'trial' | 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: 'trial' | 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          role: 'admin' | 'receptionist' | 'therapist' | 'finance' | 'super_admin'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          role?: 'admin' | 'receptionist' | 'therapist' | 'finance' | 'super_admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          role?: 'admin' | 'receptionist' | 'therapist' | 'finance' | 'super_admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      practices: {
        Row: {
          id: string
          tenant_id: string
          name: string
          registration_number: string | null
          practice_number: string | null
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          registration_number?: string | null
          practice_number?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          registration_number?: string | null
          practice_number?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      therapists: {
        Row: {
          id: string
          tenant_id: string
          profile_id: string
          practice_id: string | null
          discipline: string | null
          qualification: string | null
          hpcsa_number: string | null
          practice_number: string | null
          uses_own_practice_number: boolean
          colour: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          profile_id: string
          practice_id?: string | null
          discipline?: string | null
          qualification?: string | null
          hpcsa_number?: string | null
          practice_number?: string | null
          uses_own_practice_number?: boolean
          colour?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          profile_id?: string
          practice_id?: string | null
          discipline?: string | null
          qualification?: string | null
          hpcsa_number?: string | null
          practice_number?: string | null
          uses_own_practice_number?: boolean
          colour?: string
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          tenant_id: string
          patient_number: string
          first_name: string
          last_name: string
          patient_type: 'adult' | 'teen' | 'child'
          date_of_birth: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_email: string | null
          responsible_person_name: string | null
          responsible_person_id_number: string | null
          dependant_code: string | null
          medical_aid_name: string | null
          medical_aid_plan: string | null
          no_medical_aid: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          patient_number: string
          first_name: string
          last_name: string
          patient_type: 'adult' | 'teen' | 'child'
          date_of_birth?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_email?: string | null
          responsible_person_name?: string | null
          responsible_person_id_number?: string | null
          dependant_code?: string | null
          medical_aid_name?: string | null
          medical_aid_plan?: string | null
          no_medical_aid?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          patient_number?: string
          first_name?: string
          last_name?: string
          patient_type?: 'adult' | 'teen' | 'child'
          date_of_birth?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_email?: string | null
          responsible_person_name?: string | null
          responsible_person_id_number?: string | null
          dependant_code?: string | null
          medical_aid_name?: string | null
          medical_aid_plan?: string | null
          no_medical_aid?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          tenant_id: string
          patient_id: string
          therapist_id: string | null
          practice_id: string | null
          service_id: string | null
          starts_at: string
          ends_at: string
          status: 'booked' | 'completed' | 'cancelled' | 'no_show' | 'blocked'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          patient_id: string
          therapist_id?: string | null
          practice_id?: string | null
          service_id?: string | null
          starts_at: string
          ends_at: string
          status?: 'booked' | 'completed' | 'cancelled' | 'no_show' | 'blocked'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          patient_id?: string
          therapist_id?: string | null
          practice_id?: string | null
          service_id?: string | null
          starts_at?: string
          ends_at?: string
          status?: 'booked' | 'completed' | 'cancelled' | 'no_show' | 'blocked'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          tenant_id: string
          code: string
          name: string
          description: string | null
          duration_minutes: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          code: string
          name: string
          description?: string | null
          duration_minutes?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          code?: string
          name?: string
          description?: string | null
          duration_minutes?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      current_tenant_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      is_tenant_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
