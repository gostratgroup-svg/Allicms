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
      account_credits: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          credit_reason: string
          credit_status: string
          currency_code: string
          deleted_at: string | null
          expires_at: string | null
          financial_account_id: string | null
          id: string
          metadata: Json
          original_amount: number
          patient_id: string | null
          remaining_amount: number
          responsible_party_id: string | null
          source_payment_allocation_id: string | null
          source_payment_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          credit_reason: string
          credit_status?: string
          currency_code?: string
          deleted_at?: string | null
          expires_at?: string | null
          financial_account_id?: string | null
          id?: string
          metadata?: Json
          original_amount: number
          patient_id?: string | null
          remaining_amount: number
          responsible_party_id?: string | null
          source_payment_allocation_id?: string | null
          source_payment_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          credit_reason?: string
          credit_status?: string
          currency_code?: string
          deleted_at?: string | null
          expires_at?: string | null
          financial_account_id?: string | null
          id?: string
          metadata?: Json
          original_amount?: number
          patient_id?: string | null
          remaining_amount?: number
          responsible_party_id?: string | null
          source_payment_allocation_id?: string | null
          source_payment_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_credits_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_source_payment_allocation_id_fkey"
            columns: ["source_payment_allocation_id"]
            isOneToOne: false
            referencedRelation: "payment_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_credits_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_amendments: {
        Row: {
          amendment_number: number
          amendment_reason: string
          amendment_type: string
          author_profile_id: string | null
          clinical_assessment_id: string
          corrected_snapshot: Json
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          original_snapshot: Json
          patient_facing_impact: string
          patient_id: string
          recalculation_status: string
          target_record_id: string
          target_record_type: string
          tenant_id: string
        }
        Insert: {
          amendment_number: number
          amendment_reason: string
          amendment_type?: string
          author_profile_id?: string | null
          clinical_assessment_id: string
          corrected_snapshot?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          original_snapshot?: Json
          patient_facing_impact?: string
          patient_id: string
          recalculation_status?: string
          target_record_id: string
          target_record_type: string
          tenant_id: string
        }
        Update: {
          amendment_number?: number
          amendment_reason?: string
          amendment_type?: string
          author_profile_id?: string | null
          clinical_assessment_id?: string
          corrected_snapshot?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          original_snapshot?: Json
          patient_facing_impact?: string
          patient_id?: string
          recalculation_status?: string
          target_record_id?: string
          target_record_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_amendments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_amendments_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_amendments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_amendments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_assignments: {
        Row: {
          assessment_definition_version_id: string
          assessment_phase: string | null
          assigned_by_profile_id: string | null
          assignment_priority: number
          assignment_scope: string
          created_at: string
          deleted_at: string | null
          discipline: string | null
          effective_from: string | null
          effective_until: string | null
          encounter_type: string | null
          id: string
          is_active: boolean
          is_default: boolean
          is_recommended: boolean
          lock_version: number
          metadata: Json
          outcome_measure_definition_id: string
          patient_reported_eligible: boolean
          practice_location_id: string | null
          session_type: string | null
          tenant_id: string
          therapist_profile_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_definition_version_id: string
          assessment_phase?: string | null
          assigned_by_profile_id?: string | null
          assignment_priority?: number
          assignment_scope?: string
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          effective_from?: string | null
          effective_until?: string | null
          encounter_type?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_recommended?: boolean
          lock_version?: number
          metadata?: Json
          outcome_measure_definition_id: string
          patient_reported_eligible?: boolean
          practice_location_id?: string | null
          session_type?: string | null
          tenant_id: string
          therapist_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_definition_version_id?: string
          assessment_phase?: string | null
          assigned_by_profile_id?: string | null
          assignment_priority?: number
          assignment_scope?: string
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          effective_from?: string | null
          effective_until?: string | null
          encounter_type?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_recommended?: boolean
          lock_version?: number
          metadata?: Json
          outcome_measure_definition_id?: string
          patient_reported_eligible?: boolean
          practice_location_id?: string | null
          session_type?: string | null
          tenant_id?: string
          therapist_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_assessment_definition_version_id_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_assignments_assessment_definition_version_id_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_assigned_by_profile_id_fkey"
            columns: ["assigned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["outcome_measure_definition_id"]
          },
          {
            foreignKeyName: "assessment_assignments_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_clinical_note_links: {
        Row: {
          clinical_assessment_id: string
          clinical_encounter_id: string | null
          clinical_note_id: string | null
          clinical_note_version_id: string | null
          copied_summary: string | null
          created_at: string
          deleted_at: string | null
          id: string
          link_type: string
          linked_by_profile_id: string | null
          metadata: Json
          outcome_measure_result_id: string | null
          patient_id: string
          provenance_metadata: Json
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          clinical_assessment_id: string
          clinical_encounter_id?: string | null
          clinical_note_id?: string | null
          clinical_note_version_id?: string | null
          copied_summary?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          link_type?: string
          linked_by_profile_id?: string | null
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_id: string
          provenance_metadata?: Json
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          clinical_assessment_id?: string
          clinical_encounter_id?: string | null
          clinical_note_id?: string | null
          clinical_note_version_id?: string | null
          copied_summary?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          link_type?: string
          linked_by_profile_id?: string | null
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_id?: string
          provenance_metadata?: Json
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_clinical_note_links_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_clinical_note_version_id_fkey"
            columns: ["clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_linked_by_profile_id_fkey"
            columns: ["linked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_outcome_measure_result_id_fkey"
            columns: ["outcome_measure_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_clinical_note_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definition_calculation_rules: {
        Row: {
          allowed_operator: string
          assessment_definition_version_id: string
          calculation_config: Json
          calculation_key: string
          calculation_label: string | null
          calculation_type: string
          calculation_version: number
          created_at: string
          deleted_at: string | null
          id: string
          input_item_keys: string[]
          is_active: boolean
          is_required_for_completion: boolean
          lock_version: number
          metadata: Json
          missing_item_strategy: string
          result_unit: string | null
          result_value_type: string
          target_assessment_definition_item_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_operator?: string
          assessment_definition_version_id: string
          calculation_config?: Json
          calculation_key: string
          calculation_label?: string | null
          calculation_type?: string
          calculation_version?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          input_item_keys?: string[]
          is_active?: boolean
          is_required_for_completion?: boolean
          lock_version?: number
          metadata?: Json
          missing_item_strategy?: string
          result_unit?: string | null
          result_value_type?: string
          target_assessment_definition_item_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_operator?: string
          assessment_definition_version_id?: string
          calculation_config?: Json
          calculation_key?: string
          calculation_label?: string | null
          calculation_type?: string
          calculation_version?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          input_item_keys?: string[]
          is_active?: boolean
          is_required_for_completion?: boolean
          lock_version?: number
          metadata?: Json
          missing_item_strategy?: string
          result_unit?: string | null
          result_value_type?: string
          target_assessment_definition_item_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_definition_calcula_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_definition_calcula_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_calcula_target_assessment_definition_fkey"
            columns: ["target_assessment_definition_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_calculation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definition_item_options: {
        Row: {
          assessment_definition_item_id: string
          assessment_definition_version_id: string
          created_at: string
          deleted_at: string | null
          display_order: number
          id: string
          is_default: boolean
          lock_version: number
          metadata: Json
          numeric_value: number | null
          option_key: string
          option_label: string
          option_value: Json | null
          patient_reported_eligible: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_definition_item_id: string
          assessment_definition_version_id: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          lock_version?: number
          metadata?: Json
          numeric_value?: number | null
          option_key: string
          option_label: string
          option_value?: Json | null
          patient_reported_eligible?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_definition_item_id?: string
          assessment_definition_version_id?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          lock_version?: number
          metadata?: Json
          numeric_value?: number | null
          option_key?: string
          option_label?: string
          option_value?: Json | null
          patient_reported_eligible?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_definition_item_op_assessment_definition_item_i_fkey"
            columns: ["assessment_definition_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_item_op_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_definition_item_op_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_item_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definition_items: {
        Row: {
          allowed_units: string[]
          assessment_definition_section_id: string
          assessment_definition_version_id: string
          clinician_only: boolean
          created_at: string
          created_by_profile_id: string | null
          default_value: Json | null
          deleted_at: string | null
          display_order: number
          help_text: string | null
          id: string
          is_calculated: boolean
          is_informational: boolean
          is_read_only: boolean
          is_repeating: boolean
          is_required: boolean
          is_required_for_completion: boolean
          is_restricted: boolean
          item_config: Json
          item_key: string
          item_label: string
          item_prompt: string | null
          item_type: string
          lock_version: number
          metadata: Json
          parent_item_id: string | null
          patient_facing_description: string | null
          patient_facing_label: string | null
          patient_reported_eligible: boolean
          placeholder: string | null
          stable_identity_key: string | null
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          validation_config: Json
        }
        Insert: {
          allowed_units?: string[]
          assessment_definition_section_id: string
          assessment_definition_version_id: string
          clinician_only?: boolean
          created_at?: string
          created_by_profile_id?: string | null
          default_value?: Json | null
          deleted_at?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          is_calculated?: boolean
          is_informational?: boolean
          is_read_only?: boolean
          is_repeating?: boolean
          is_required?: boolean
          is_required_for_completion?: boolean
          is_restricted?: boolean
          item_config?: Json
          item_key: string
          item_label: string
          item_prompt?: string | null
          item_type?: string
          lock_version?: number
          metadata?: Json
          parent_item_id?: string | null
          patient_facing_description?: string | null
          patient_facing_label?: string | null
          patient_reported_eligible?: boolean
          placeholder?: string | null
          stable_identity_key?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_config?: Json
        }
        Update: {
          allowed_units?: string[]
          assessment_definition_section_id?: string
          assessment_definition_version_id?: string
          clinician_only?: boolean
          created_at?: string
          created_by_profile_id?: string | null
          default_value?: Json | null
          deleted_at?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          is_calculated?: boolean
          is_informational?: boolean
          is_read_only?: boolean
          is_repeating?: boolean
          is_required?: boolean
          is_required_for_completion?: boolean
          is_restricted?: boolean
          item_config?: Json
          item_key?: string
          item_label?: string
          item_prompt?: string | null
          item_type?: string
          lock_version?: number
          metadata?: Json
          parent_item_id?: string | null
          patient_facing_description?: string | null
          patient_facing_label?: string | null
          patient_reported_eligible?: boolean
          placeholder?: string | null
          stable_identity_key?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_definition_items_assessment_definition_section__fkey"
            columns: ["assessment_definition_section_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_items_assessment_definition_version__fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_definition_items_assessment_definition_version__fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_items_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_items_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definition_sections: {
        Row: {
          assessment_definition_version_id: string
          clinician_only: boolean
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          display_order: number
          id: string
          instructions: string | null
          is_repeating: boolean
          is_restricted: boolean
          lock_version: number
          metadata: Json
          parent_section_id: string | null
          patient_reported_eligible: boolean
          section_key: string
          section_label: string
          section_type: string
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          assessment_definition_version_id: string
          clinician_only?: boolean
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          display_order?: number
          id?: string
          instructions?: string | null
          is_repeating?: boolean
          is_restricted?: boolean
          lock_version?: number
          metadata?: Json
          parent_section_id?: string | null
          patient_reported_eligible?: boolean
          section_key: string
          section_label: string
          section_type?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          assessment_definition_version_id?: string
          clinician_only?: boolean
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          display_order?: number
          id?: string
          instructions?: string | null
          is_repeating?: boolean
          is_restricted?: boolean
          lock_version?: number
          metadata?: Json
          parent_section_id?: string | null
          patient_reported_eligible?: boolean
          section_key?: string
          section_label?: string
          section_type?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_definition_section_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_definition_section_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_sections_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_sections_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definition_validation_rules: {
        Row: {
          applies_on: string
          assessment_definition_item_id: string | null
          assessment_definition_section_id: string | null
          assessment_definition_version_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          lock_version: number
          message: string | null
          metadata: Json
          rule_config: Json
          rule_key: string
          rule_type: string
          severity: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          applies_on?: string
          assessment_definition_item_id?: string | null
          assessment_definition_section_id?: string | null
          assessment_definition_version_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          lock_version?: number
          message?: string | null
          metadata?: Json
          rule_config?: Json
          rule_key: string
          rule_type: string
          severity?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_on?: string
          assessment_definition_item_id?: string | null
          assessment_definition_section_id?: string | null
          assessment_definition_version_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          lock_version?: number
          message?: string | null
          metadata?: Json
          rule_config?: Json
          rule_key?: string
          rule_type?: string
          severity?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_definition_validat_assessment_definition_item_i_fkey"
            columns: ["assessment_definition_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_validat_assessment_definition_sectio_fkey"
            columns: ["assessment_definition_section_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_validat_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_definition_validat_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_validation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_definition_versions: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          definition_schema: Json
          deleted_at: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          interpretation_schema: Json
          lock_version: number
          metadata: Json
          outcome_measure_definition_id: string
          publication_ready: boolean
          published_at: string | null
          published_by_profile_id: string | null
          release_notes: string | null
          response_mode: string
          retired_at: string | null
          retired_by_profile_id: string | null
          retirement_reason: string | null
          scoring_schema: Json
          source_definition_version_id: string | null
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          validation_status: string
          version_label: string | null
          version_number: number
          version_status: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          definition_schema?: Json
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          interpretation_schema?: Json
          lock_version?: number
          metadata?: Json
          outcome_measure_definition_id: string
          publication_ready?: boolean
          published_at?: string | null
          published_by_profile_id?: string | null
          release_notes?: string | null
          response_mode?: string
          retired_at?: string | null
          retired_by_profile_id?: string | null
          retirement_reason?: string | null
          scoring_schema?: Json
          source_definition_version_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_status?: string
          version_label?: string | null
          version_number: number
          version_status?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          definition_schema?: Json
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          interpretation_schema?: Json
          lock_version?: number
          metadata?: Json
          outcome_measure_definition_id?: string
          publication_ready?: boolean
          published_at?: string | null
          published_by_profile_id?: string | null
          release_notes?: string | null
          response_mode?: string
          retired_at?: string | null
          retired_by_profile_id?: string | null
          retirement_reason?: string | null
          scoring_schema?: Json
          source_definition_version_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_status?: string
          version_label?: string | null
          version_number?: number
          version_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_definition_version_outcome_measure_definition_i_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["outcome_measure_definition_id"]
          },
          {
            foreignKeyName: "assessment_definition_version_outcome_measure_definition_i_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_version_source_definition_version_id_fkey"
            columns: ["source_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_definition_version_source_definition_version_id_fkey"
            columns: ["source_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_versions_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_versions_retired_by_profile_id_fkey"
            columns: ["retired_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_definition_versions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_external_imports: {
        Row: {
          assessment_definition_version_id: string | null
          clinical_assessment_id: string | null
          created_at: string
          deleted_at: string | null
          device_identifier: string | null
          duplicate_detection_key: string | null
          error_metadata: Json
          external_reference: string | null
          id: string
          import_batch_key: string | null
          imported_at: string
          imported_by_profile_id: string | null
          metadata: Json
          patient_id: string
          practitioner_review_status: string
          review_outcome: string | null
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          source_file_metadata: Json
          source_system: string
          source_version: string | null
          tenant_id: string
          updated_at: string
          validation_status: string
          vendor_name: string | null
        }
        Insert: {
          assessment_definition_version_id?: string | null
          clinical_assessment_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_identifier?: string | null
          duplicate_detection_key?: string | null
          error_metadata?: Json
          external_reference?: string | null
          id?: string
          import_batch_key?: string | null
          imported_at?: string
          imported_by_profile_id?: string | null
          metadata?: Json
          patient_id: string
          practitioner_review_status?: string
          review_outcome?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          source_file_metadata?: Json
          source_system: string
          source_version?: string | null
          tenant_id: string
          updated_at?: string
          validation_status?: string
          vendor_name?: string | null
        }
        Update: {
          assessment_definition_version_id?: string | null
          clinical_assessment_id?: string | null
          created_at?: string
          deleted_at?: string | null
          device_identifier?: string | null
          duplicate_detection_key?: string | null
          error_metadata?: Json
          external_reference?: string | null
          id?: string
          import_batch_key?: string | null
          imported_at?: string
          imported_by_profile_id?: string | null
          metadata?: Json
          patient_id?: string
          practitioner_review_status?: string
          review_outcome?: string | null
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          source_file_metadata?: Json
          source_system?: string
          source_version?: string | null
          tenant_id?: string
          updated_at?: string
          validation_status?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_external_imports_assessment_definition_version__fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_external_imports_assessment_definition_version__fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_external_imports_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_external_imports_imported_by_profile_id_fkey"
            columns: ["imported_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_external_imports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_external_imports_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_external_imports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_interpretation_bands: {
        Row: {
          assessment_definition_version_id: string
          band_key: string
          calculation_rule_key: string | null
          classification: string | null
          created_at: string
          deleted_at: string | null
          id: string
          limitation_text: string | null
          lock_version: number
          lower_bound: number | null
          lower_inclusive: boolean
          metadata: Json
          minimal_clinically_important_difference: number | null
          patient_facing_eligible: boolean
          patient_facing_explanation: string | null
          population_metadata: Json
          reference_range_label: string | null
          reliable_change_threshold: number | null
          score_label: string
          severity_band: string | null
          tenant_id: string | null
          updated_at: string
          upper_bound: number | null
          upper_inclusive: boolean
          warning_text: string | null
        }
        Insert: {
          assessment_definition_version_id: string
          band_key: string
          calculation_rule_key?: string | null
          classification?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          limitation_text?: string | null
          lock_version?: number
          lower_bound?: number | null
          lower_inclusive?: boolean
          metadata?: Json
          minimal_clinically_important_difference?: number | null
          patient_facing_eligible?: boolean
          patient_facing_explanation?: string | null
          population_metadata?: Json
          reference_range_label?: string | null
          reliable_change_threshold?: number | null
          score_label: string
          severity_band?: string | null
          tenant_id?: string | null
          updated_at?: string
          upper_bound?: number | null
          upper_inclusive?: boolean
          warning_text?: string | null
        }
        Update: {
          assessment_definition_version_id?: string
          band_key?: string
          calculation_rule_key?: string | null
          classification?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          limitation_text?: string | null
          lock_version?: number
          lower_bound?: number | null
          lower_inclusive?: boolean
          metadata?: Json
          minimal_clinically_important_difference?: number | null
          patient_facing_eligible?: boolean
          patient_facing_explanation?: string | null
          population_metadata?: Json
          reference_range_label?: string | null
          reliable_change_threshold?: number | null
          score_label?: string
          severity_band?: string | null
          tenant_id?: string | null
          updated_at?: string
          upper_bound?: number | null
          upper_inclusive?: boolean
          warning_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_interpretation_ban_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_interpretation_ban_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_interpretation_bands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_patient_invitations: {
        Row: {
          accepted_clinical_assessment_id: string | null
          assessment_definition_version_id: string
          assigned_practitioner_profile_id: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          invitation_status: string
          metadata: Json
          patient_id: string
          patient_link_id: string | null
          review_outcome: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          starts_at: string | null
          submission_status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          verification_token_hash: string | null
        }
        Insert: {
          accepted_clinical_assessment_id?: string | null
          assessment_definition_version_id: string
          assigned_practitioner_profile_id?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_status?: string
          metadata?: Json
          patient_id: string
          patient_link_id?: string | null
          review_outcome?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          starts_at?: string | null
          submission_status?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          verification_token_hash?: string | null
        }
        Update: {
          accepted_clinical_assessment_id?: string | null
          assessment_definition_version_id?: string
          assigned_practitioner_profile_id?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_status?: string
          metadata?: Json
          patient_id?: string
          patient_link_id?: string | null
          review_outcome?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          starts_at?: string | null
          submission_status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          verification_token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_patient_invitation_accepted_clinical_assessment_fkey"
            columns: ["accepted_clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_invitation_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_patient_invitation_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_invitation_assigned_practitioner_profil_fkey"
            columns: ["assigned_practitioner_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_invitations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_invitations_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_invitations_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_patient_link_publications: {
        Row: {
          clinical_assessment_id: string | null
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          is_restricted: boolean
          metadata: Json
          outcome_measure_result_id: string | null
          patient_facing_summary: string | null
          patient_facing_title: string
          patient_id: string
          patient_link_id: string | null
          publication_state: string
          published_at: string | null
          published_by_profile_id: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by_profile_id: string | null
          tenant_id: string
          updated_at: string
          version_metadata: Json
        }
        Insert: {
          clinical_assessment_id?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_restricted?: boolean
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_facing_summary?: string | null
          patient_facing_title: string
          patient_id: string
          patient_link_id?: string | null
          publication_state?: string
          published_at?: string | null
          published_by_profile_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          tenant_id: string
          updated_at?: string
          version_metadata?: Json
        }
        Update: {
          clinical_assessment_id?: string | null
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_restricted?: boolean
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_facing_summary?: string | null
          patient_facing_title?: string
          patient_id?: string
          patient_link_id?: string | null
          publication_state?: string
          published_at?: string | null
          published_by_profile_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_patient_link_publicat_outcome_measure_result_id_fkey"
            columns: ["outcome_measure_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_link_publicatio_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_link_publication_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_link_publications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_link_publications_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_link_publications_revoked_by_profile_id_fkey"
            columns: ["revoked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_patient_link_publications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_practitioner_interpretations: {
        Row: {
          assessment_definition_version_id: string | null
          authored_by_profile_id: string | null
          clinical_assessment_id: string
          clinical_significance: string | null
          created_at: string
          deleted_at: string | null
          finalised_at: string | null
          finalised_by_profile_id: string | null
          follow_up_recommendation: string | null
          id: string
          interpretation_status: string
          interpretation_text: string | null
          is_restricted: boolean
          limitation_text: string | null
          lock_version: number
          metadata: Json
          outcome_measure_result_id: string | null
          patient_facing_eligible: boolean
          patient_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assessment_definition_version_id?: string | null
          authored_by_profile_id?: string | null
          clinical_assessment_id: string
          clinical_significance?: string | null
          created_at?: string
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          follow_up_recommendation?: string | null
          id?: string
          interpretation_status?: string
          interpretation_text?: string | null
          is_restricted?: boolean
          limitation_text?: string | null
          lock_version?: number
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_facing_eligible?: boolean
          patient_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assessment_definition_version_id?: string | null
          authored_by_profile_id?: string | null
          clinical_assessment_id?: string
          clinical_significance?: string | null
          created_at?: string
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          follow_up_recommendation?: string | null
          id?: string
          interpretation_status?: string
          interpretation_text?: string | null
          is_restricted?: boolean
          limitation_text?: string | null
          lock_version?: number
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_facing_eligible?: boolean
          patient_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_practitioner_inter_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_practitioner_inter_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_practitioner_interpre_outcome_measure_result_id_fkey"
            columns: ["outcome_measure_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_practitioner_interpreta_finalised_by_profile_id_fkey"
            columns: ["finalised_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_practitioner_interpretat_authored_by_profile_id_fkey"
            columns: ["authored_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_practitioner_interpretat_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_practitioner_interpretations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_practitioner_interpretations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_repeated_measure_series: {
        Row: {
          baseline_assessment_id: string | null
          clinical_goal_id: string | null
          close_reason: string | null
          closed_at: string | null
          closed_by_profile_id: string | null
          comparison_policy: string
          created_at: string
          deleted_at: string | null
          id: string
          measure_family_key: string
          metadata: Json
          opened_at: string
          outcome_measure_definition_id: string | null
          patient_id: string
          series_status: string
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string
          version_compatibility_metadata: Json
        }
        Insert: {
          baseline_assessment_id?: string | null
          clinical_goal_id?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by_profile_id?: string | null
          comparison_policy?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          measure_family_key: string
          metadata?: Json
          opened_at?: string
          outcome_measure_definition_id?: string | null
          patient_id: string
          series_status?: string
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string
          version_compatibility_metadata?: Json
        }
        Update: {
          baseline_assessment_id?: string | null
          clinical_goal_id?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by_profile_id?: string | null
          comparison_policy?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          measure_family_key?: string
          metadata?: Json
          opened_at?: string
          outcome_measure_definition_id?: string | null
          patient_id?: string
          series_status?: string
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string
          version_compatibility_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_repeated_measure_s_outcome_measure_definition_i_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["outcome_measure_definition_id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_s_outcome_measure_definition_i_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_series_baseline_assessment_id_fkey"
            columns: ["baseline_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_series_clinical_goal_id_fkey"
            columns: ["clinical_goal_id"]
            isOneToOne: false
            referencedRelation: "clinical_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_series_closed_by_profile_id_fkey"
            columns: ["closed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_series_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_series_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_repeated_measure_series_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_score_components: {
        Row: {
          assessment_definition_version_id: string
          calculated_at: string | null
          calculated_by_profile_id: string | null
          calculated_score: number | null
          calculation_rule_key: string
          calculation_snapshot: Json
          calculation_status: string
          clinical_assessment_id: string
          component_key: string
          component_label: string | null
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          missing_item_count: number
          normalised_score: number | null
          outcome_measure_result_id: string | null
          partial_score: boolean
          patient_id: string
          percentage_score: number | null
          raw_score: number | null
          score_type: string
          score_unit: string | null
          source_response_ids: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assessment_definition_version_id: string
          calculated_at?: string | null
          calculated_by_profile_id?: string | null
          calculated_score?: number | null
          calculation_rule_key: string
          calculation_snapshot?: Json
          calculation_status?: string
          clinical_assessment_id: string
          component_key: string
          component_label?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          missing_item_count?: number
          normalised_score?: number | null
          outcome_measure_result_id?: string | null
          partial_score?: boolean
          patient_id: string
          percentage_score?: number | null
          raw_score?: number | null
          score_type?: string
          score_unit?: string | null
          source_response_ids?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assessment_definition_version_id?: string
          calculated_at?: string | null
          calculated_by_profile_id?: string | null
          calculated_score?: number | null
          calculation_rule_key?: string
          calculation_snapshot?: Json
          calculation_status?: string
          clinical_assessment_id?: string
          component_key?: string
          component_label?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          missing_item_count?: number
          normalised_score?: number | null
          outcome_measure_result_id?: string | null
          partial_score?: boolean
          patient_id?: string
          percentage_score?: number | null
          raw_score?: number | null
          score_type?: string
          score_unit?: string | null
          source_response_ids?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_score_components_assessment_definition_version__fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_score_components_assessment_definition_version__fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_score_components_calculated_by_profile_id_fkey"
            columns: ["calculated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_score_components_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_score_components_outcome_measure_result_id_fkey"
            columns: ["outcome_measure_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_score_components_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_score_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_series_members: {
        Row: {
          added_by_profile_id: string | null
          assessment_repeated_measure_series_id: string
          clinical_assessment_id: string
          comparison_eligible: boolean
          comparison_exclusion_reason: string | null
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          outcome_measure_result_id: string | null
          patient_id: string
          series_role: string
          tenant_id: string
        }
        Insert: {
          added_by_profile_id?: string | null
          assessment_repeated_measure_series_id: string
          clinical_assessment_id: string
          comparison_eligible?: boolean
          comparison_exclusion_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_id: string
          series_role?: string
          tenant_id: string
        }
        Update: {
          added_by_profile_id?: string | null
          assessment_repeated_measure_series_id?: string
          clinical_assessment_id?: string
          comparison_eligible?: boolean
          comparison_exclusion_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_id?: string
          series_role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_series_members_added_by_profile_id_fkey"
            columns: ["added_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_members_assessment_repeated_measure_seri_fkey"
            columns: ["assessment_repeated_measure_series_id"]
            isOneToOne: false
            referencedRelation: "assessment_repeated_measure_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_members_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_members_outcome_measure_result_id_fkey"
            columns: ["outcome_measure_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_members_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_treatment_goal_links: {
        Row: {
          clinical_assessment_id: string
          clinical_goal_id: string | null
          clinical_goal_review_id: string | null
          created_at: string
          deleted_at: string | null
          evidence_summary: string | null
          id: string
          link_type: string
          linked_by_profile_id: string | null
          metadata: Json
          outcome_measure_result_id: string | null
          patient_id: string
          tenant_id: string
          treatment_plan_id: string | null
        }
        Insert: {
          clinical_assessment_id: string
          clinical_goal_id?: string | null
          clinical_goal_review_id?: string | null
          created_at?: string
          deleted_at?: string | null
          evidence_summary?: string | null
          id?: string
          link_type?: string
          linked_by_profile_id?: string | null
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_id: string
          tenant_id: string
          treatment_plan_id?: string | null
        }
        Update: {
          clinical_assessment_id?: string
          clinical_goal_id?: string | null
          clinical_goal_review_id?: string | null
          created_at?: string
          deleted_at?: string | null
          evidence_summary?: string | null
          id?: string
          link_type?: string
          linked_by_profile_id?: string | null
          metadata?: Json
          outcome_measure_result_id?: string | null
          patient_id?: string
          tenant_id?: string
          treatment_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_treatment_goal_links_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_clinical_goal_id_fkey"
            columns: ["clinical_goal_id"]
            isOneToOne: false
            referencedRelation: "clinical_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_clinical_goal_review_id_fkey"
            columns: ["clinical_goal_review_id"]
            isOneToOne: false
            referencedRelation: "clinical_goal_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_linked_by_profile_id_fkey"
            columns: ["linked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_outcome_measure_result_id_fkey"
            columns: ["outcome_measure_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_treatment_goal_links_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_usage_snapshots: {
        Row: {
          active_assignment_count: number
          assessment_count: number
          assessment_definition_version_id: string | null
          calculated_at: string
          completed_count: number
          created_at: string
          definition_usage_count: number
          deleted_at: string | null
          draft_count: number
          finalised_count: number
          first_used_at: string | null
          id: string
          invalidated_count: number
          last_used_at: string | null
          metadata: Json
          outcome_measure_definition_id: string | null
          repeated_measure_series_count: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active_assignment_count?: number
          assessment_count?: number
          assessment_definition_version_id?: string | null
          calculated_at?: string
          completed_count?: number
          created_at?: string
          definition_usage_count?: number
          deleted_at?: string | null
          draft_count?: number
          finalised_count?: number
          first_used_at?: string | null
          id?: string
          invalidated_count?: number
          last_used_at?: string | null
          metadata?: Json
          outcome_measure_definition_id?: string | null
          repeated_measure_series_count?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active_assignment_count?: number
          assessment_count?: number
          assessment_definition_version_id?: string | null
          calculated_at?: string
          completed_count?: number
          created_at?: string
          definition_usage_count?: number
          deleted_at?: string | null
          draft_count?: number
          finalised_count?: number
          first_used_at?: string | null
          id?: string
          invalidated_count?: number
          last_used_at?: string | null
          metadata?: Json
          outcome_measure_definition_id?: string | null
          repeated_measure_series_count?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_usage_snapshots_assessment_definition_version_i_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "assessment_usage_snapshots_assessment_definition_version_i_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_usage_snapshots_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["outcome_measure_definition_id"]
          },
          {
            foreignKeyName: "assessment_usage_snapshots_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_usage_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_profile_id: string | null
          actor_tenant_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json
          occurred_at: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          actor_tenant_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json
          occurred_at?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          actor_tenant_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_actor_tenant_user_id_fkey"
            columns: ["actor_tenant_user_id"]
            isOneToOne: false
            referencedRelation: "tenant_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder: string
          account_label: string | null
          account_number: string
          account_type: string | null
          bank_name: string
          branch_code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          metadata: Json
          owner_id: string | null
          owner_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_label?: string | null
          account_number: string
          account_type?: string | null
          bank_name: string
          branch_code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          metadata?: Json
          owner_id?: string | null
          owner_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_label?: string | null
          account_number?: string
          account_type?: string | null
          bank_name?: string
          branch_code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          metadata?: Json
          owner_id?: string | null
          owner_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          allow_price_override: boolean
          allow_therapist_bank_accounts: boolean
          allow_therapist_billing: boolean
          created_at: string
          default_bank_account_id: string | null
          deleted_at: string | null
          id: string
          invoice_prefix: string
          metadata: Json
          next_invoice_number: number
          next_statement_number: number
          payment_terms_days: number
          practice_profile_id: string | null
          statement_prefix: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_price_override?: boolean
          allow_therapist_bank_accounts?: boolean
          allow_therapist_billing?: boolean
          created_at?: string
          default_bank_account_id?: string | null
          deleted_at?: string | null
          id?: string
          invoice_prefix?: string
          metadata?: Json
          next_invoice_number?: number
          next_statement_number?: number
          payment_terms_days?: number
          practice_profile_id?: string | null
          statement_prefix?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_price_override?: boolean
          allow_therapist_bank_accounts?: boolean
          allow_therapist_billing?: boolean
          created_at?: string
          default_bank_account_id?: string | null
          deleted_at?: string | null
          id?: string
          invoice_prefix?: string
          metadata?: Json
          next_invoice_number?: number
          next_statement_number?: number
          payment_terms_days?: number
          practice_profile_id?: string | null
          statement_prefix?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_settings_default_bank_account_id_fkey"
            columns: ["default_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_settings_practice_profile_id_fkey"
            columns: ["practice_profile_id"]
            isOneToOne: false
            referencedRelation: "practice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_notes: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          is_patient_visible: boolean
          metadata: Json
          note_type: string
          tenant_id: string
          title: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          note_type?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          note_type?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notes_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_notes_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_occurrence_exceptions: {
        Row: {
          booking_id: string | null
          cancellation_reason: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          exception_type: string
          id: string
          metadata: Json
          new_end_at: string | null
          new_start_at: string | null
          original_end_at: string | null
          original_start_at: string
          recurrence_rule_id: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          booking_id?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          exception_type: string
          id?: string
          metadata?: Json
          new_end_at?: string | null
          new_start_at?: string | null
          original_end_at?: string | null
          original_start_at: string
          recurrence_rule_id: string
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          booking_id?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          exception_type?: string
          id?: string
          metadata?: Json
          new_end_at?: string | null
          new_start_at?: string | null
          original_end_at?: string | null
          original_start_at?: string
          recurrence_rule_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_occurrence_exceptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_occurrence_exceptions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_occurrence_exceptions_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "booking_recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_occurrence_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_occurrence_exceptions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_procedures: {
        Row: {
          adjustment_amount: number
          booking_id: string
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          discount_amount: number
          duration_minutes: number | null
          id: string
          is_billable: boolean
          line_total: number
          metadata: Json
          price_list_id: string | null
          price_list_item_id: string | null
          procedure_code: string | null
          procedure_name: string
          quantity: number
          tenant_id: string
          unit_price: number
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          adjustment_amount?: number
          booking_id: string
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          discount_amount?: number
          duration_minutes?: number | null
          id?: string
          is_billable?: boolean
          line_total?: number
          metadata?: Json
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_code?: string | null
          procedure_name: string
          quantity?: number
          tenant_id: string
          unit_price?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          adjustment_amount?: number
          booking_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          discount_amount?: number
          duration_minutes?: number | null
          id?: string
          is_billable?: boolean
          line_total?: number
          metadata?: Json
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_code?: string | null
          procedure_name?: string
          quantity?: number
          tenant_id?: string
          unit_price?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_procedures_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_procedures_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_procedures_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_procedures_price_list_item_id_fkey"
            columns: ["price_list_item_id"]
            isOneToOne: false
            referencedRelation: "price_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_procedures_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_recurrence_rules: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          edit_scope: string | null
          ends_on: string | null
          id: string
          metadata: Json
          recurrence_status: string
          rrule: string
          series_booking_id: string
          starts_on: string
          tenant_id: string
          timezone: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          edit_scope?: string | null
          ends_on?: string | null
          id?: string
          metadata?: Json
          recurrence_status?: string
          rrule: string
          series_booking_id: string
          starts_on: string
          tenant_id: string
          timezone?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          edit_scope?: string | null
          ends_on?: string | null
          id?: string
          metadata?: Json
          recurrence_status?: string
          rrule?: string
          series_booking_id?: string
          starts_on?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_recurrence_rules_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_recurrence_rules_series_booking_id_fkey"
            columns: ["series_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_recurrence_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_recurrence_rules_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          event_reason: string | null
          event_type: string
          from_status: string | null
          id: string
          is_patient_visible: boolean
          metadata: Json
          new_end_at: string | null
          new_start_at: string | null
          old_end_at: string | null
          old_start_at: string | null
          tenant_id: string
          to_status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          new_end_at?: string | null
          new_start_at?: string | null
          old_end_at?: string | null
          old_start_at?: string | null
          tenant_id: string
          to_status: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          new_end_at?: string | null
          new_start_at?: string | null
          old_end_at?: string | null
          old_start_at?: string | null
          tenant_id?: string
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_workflow_events: {
        Row: {
          booking_id: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          error_message: string | null
          event_status: string
          event_type: string
          failed_at: string | null
          id: string
          idempotency_key: string
          payload: Json
          processed_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          payload?: Json
          processed_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          processed_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_workflow_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_workflow_events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_mode: string
          booking_source: string
          booking_status: string
          booking_type: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          draft_invoice_ready: boolean
          duration_minutes: number | null
          end_at: string | null
          id: string
          in_progress_at: string | null
          metadata: Json
          no_show_at: string | null
          patient_facing_notes: string | null
          patient_facing_title: string | null
          patient_id: string
          patient_link_visible: boolean
          practice_location_id: string | null
          price_list_id: string | null
          recurrence_rule_id: string | null
          rescheduled_from_booking_id: string | null
          room_label: string | null
          session_ready: boolean
          start_at: string | null
          tenant_id: string
          therapist_profile_id: string | null
          timezone: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          appointment_mode?: string
          booking_source?: string
          booking_status?: string
          booking_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          draft_invoice_ready?: boolean
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          in_progress_at?: string | null
          metadata?: Json
          no_show_at?: string | null
          patient_facing_notes?: string | null
          patient_facing_title?: string | null
          patient_id: string
          patient_link_visible?: boolean
          practice_location_id?: string | null
          price_list_id?: string | null
          recurrence_rule_id?: string | null
          rescheduled_from_booking_id?: string | null
          room_label?: string | null
          session_ready?: boolean
          start_at?: string | null
          tenant_id: string
          therapist_profile_id?: string | null
          timezone?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          appointment_mode?: string
          booking_source?: string
          booking_status?: string
          booking_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          draft_invoice_ready?: boolean
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          in_progress_at?: string | null
          metadata?: Json
          no_show_at?: string | null
          patient_facing_notes?: string | null
          patient_facing_title?: string | null
          patient_id?: string
          patient_link_visible?: boolean
          practice_location_id?: string | null
          price_list_id?: string | null
          recurrence_rule_id?: string | null
          rescheduled_from_booking_id?: string | null
          room_label?: string | null
          session_ready?: boolean
          start_at?: string | null
          tenant_id?: string
          therapist_profile_id?: string | null
          timezone?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "booking_recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_rescheduled_from_booking_id_fkey"
            columns: ["rescheduled_from_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_assessment_draft_states: {
        Row: {
          active_editor_profile_id: string | null
          assessment_definition_version_id: string | null
          clinical_assessment_id: string
          conflict_detected: boolean
          conflict_reason: string | null
          created_at: string
          deleted_at: string | null
          draft_owner_profile_id: string | null
          draft_status: string
          id: string
          last_idempotency_key: string | null
          last_saved_at: string
          last_saved_by_profile_id: string | null
          lock_version: number
          metadata: Json
          patient_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_editor_profile_id?: string | null
          assessment_definition_version_id?: string | null
          clinical_assessment_id: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_owner_profile_id?: string | null
          draft_status?: string
          id?: string
          last_idempotency_key?: string | null
          last_saved_at?: string
          last_saved_by_profile_id?: string | null
          lock_version?: number
          metadata?: Json
          patient_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_editor_profile_id?: string | null
          assessment_definition_version_id?: string | null
          clinical_assessment_id?: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_owner_profile_id?: string | null
          draft_status?: string
          id?: string
          last_idempotency_key?: string | null
          last_saved_at?: string
          last_saved_by_profile_id?: string | null
          lock_version?: number
          metadata?: Json
          patient_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_assessment_draft_sta_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_sta_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_states_active_editor_profile_id_fkey"
            columns: ["active_editor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_states_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_states_draft_owner_profile_id_fkey"
            columns: ["draft_owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_states_last_saved_by_profile_id_fkey"
            columns: ["last_saved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_states_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_draft_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_assessment_item_responses: {
        Row: {
          assessment_definition_item_id: string
          assessment_definition_section_id: string | null
          assessment_definition_version_id: string
          attachment_id: string | null
          boolean_value: boolean | null
          clinical_assessment_id: string
          created_at: string
          created_by_profile_id: string | null
          date_value: string | null
          datetime_value: string | null
          deleted_at: string | null
          id: string
          idempotency_key: string | null
          is_restricted: boolean
          item_key: string
          lock_version: number
          measurement_unit: string | null
          measurement_value: number | null
          numeric_value: number | null
          patient_id: string
          referenced_record_id: string | null
          referenced_record_type: string | null
          repeat_index: number
          response_source: string
          response_value: Json | null
          selected_option_keys: string[]
          tenant_id: string
          text_value: string | null
          time_value: string | null
          updated_at: string
          updated_by_profile_id: string | null
          validation_status: string
        }
        Insert: {
          assessment_definition_item_id: string
          assessment_definition_section_id?: string | null
          assessment_definition_version_id: string
          attachment_id?: string | null
          boolean_value?: boolean | null
          clinical_assessment_id: string
          created_at?: string
          created_by_profile_id?: string | null
          date_value?: string | null
          datetime_value?: string | null
          deleted_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_restricted?: boolean
          item_key: string
          lock_version?: number
          measurement_unit?: string | null
          measurement_value?: number | null
          numeric_value?: number | null
          patient_id: string
          referenced_record_id?: string | null
          referenced_record_type?: string | null
          repeat_index?: number
          response_source?: string
          response_value?: Json | null
          selected_option_keys?: string[]
          tenant_id: string
          text_value?: string | null
          time_value?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_status?: string
        }
        Update: {
          assessment_definition_item_id?: string
          assessment_definition_section_id?: string | null
          assessment_definition_version_id?: string
          attachment_id?: string | null
          boolean_value?: boolean | null
          clinical_assessment_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          date_value?: string | null
          datetime_value?: string | null
          deleted_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_restricted?: boolean
          item_key?: string
          lock_version?: number
          measurement_unit?: string | null
          measurement_value?: number | null
          numeric_value?: number | null
          patient_id?: string
          referenced_record_id?: string | null
          referenced_record_type?: string | null
          repeat_index?: number
          response_source?: string
          response_value?: Json | null
          selected_option_keys?: string[]
          tenant_id?: string
          text_value?: string | null
          time_value?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_assessment_item_resp_assessment_definition_item_i_fkey"
            columns: ["assessment_definition_item_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_resp_assessment_definition_sectio_fkey"
            columns: ["assessment_definition_section_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_resp_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_resp_assessment_definition_versio_fkey"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_responses_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "clinical_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_responses_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_responses_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessment_item_responses_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_assessments: {
        Row: {
          amendment_count: number
          assessment_date: string | null
          assessment_definition_version_id: string | null
          assessment_phase: string | null
          assessment_source: string
          assessment_status: string
          assessment_type: string
          assessor_therapist_profile_id: string | null
          booking_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          clinical_encounter_id: string | null
          clinical_goal_id: string | null
          completed_at: string | null
          completed_by_profile_id: string | null
          content_hash: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          finalised_at: string | null
          finalised_by_profile_id: string | null
          id: string
          interpretation: string | null
          invalidated_at: string | null
          invalidated_by_profile_id: string | null
          invalidation_reason: string | null
          is_restricted: boolean
          latest_result_id: string | null
          lock_version: number
          metadata: Json
          outcome_measure_definition_id: string | null
          patient_id: string
          patient_visible_allowed: boolean
          session_id: string | null
          signature_statement: string | null
          signed_at: string | null
          signed_by_profile_id: string | null
          started_at: string | null
          started_by_profile_id: string | null
          summary: string | null
          superseded_by_assessment_id: string | null
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          amendment_count?: number
          assessment_date?: string | null
          assessment_definition_version_id?: string | null
          assessment_phase?: string | null
          assessment_source?: string
          assessment_status?: string
          assessment_type?: string
          assessor_therapist_profile_id?: string | null
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          clinical_encounter_id?: string | null
          clinical_goal_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          content_hash?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          id?: string
          interpretation?: string | null
          invalidated_at?: string | null
          invalidated_by_profile_id?: string | null
          invalidation_reason?: string | null
          is_restricted?: boolean
          latest_result_id?: string | null
          lock_version?: number
          metadata?: Json
          outcome_measure_definition_id?: string | null
          patient_id: string
          patient_visible_allowed?: boolean
          session_id?: string | null
          signature_statement?: string | null
          signed_at?: string | null
          signed_by_profile_id?: string | null
          started_at?: string | null
          started_by_profile_id?: string | null
          summary?: string | null
          superseded_by_assessment_id?: string | null
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          amendment_count?: number
          assessment_date?: string | null
          assessment_definition_version_id?: string | null
          assessment_phase?: string | null
          assessment_source?: string
          assessment_status?: string
          assessment_type?: string
          assessor_therapist_profile_id?: string | null
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          clinical_encounter_id?: string | null
          clinical_goal_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          content_hash?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          id?: string
          interpretation?: string | null
          invalidated_at?: string | null
          invalidated_by_profile_id?: string | null
          invalidation_reason?: string | null
          is_restricted?: boolean
          latest_result_id?: string | null
          lock_version?: number
          metadata?: Json
          outcome_measure_definition_id?: string | null
          patient_id?: string
          patient_visible_allowed?: boolean
          session_id?: string | null
          signature_statement?: string | null
          signed_at?: string | null
          signed_by_profile_id?: string | null
          started_at?: string | null
          started_by_profile_id?: string | null
          summary?: string | null
          superseded_by_assessment_id?: string | null
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_assessments_assessor_therapist_profile_id_fkey"
            columns: ["assessor_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_clinical_goal_id_fkey"
            columns: ["clinical_goal_id"]
            isOneToOne: false
            referencedRelation: "clinical_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_completed_by_profile_id_fkey"
            columns: ["completed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_definition_version_fk"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "clinical_assessments_definition_version_fk"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_finalised_by_profile_id_fkey"
            columns: ["finalised_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_invalidated_by_profile_id_fkey"
            columns: ["invalidated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_latest_result_fk"
            columns: ["latest_result_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["outcome_measure_definition_id"]
          },
          {
            foreignKeyName: "clinical_assessments_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_signed_by_profile_id_fkey"
            columns: ["signed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_started_by_profile_id_fkey"
            columns: ["started_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_superseded_by_assessment_id_fkey"
            columns: ["superseded_by_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_assessments_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_attachments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by_profile_id: string | null
          attachment_category: string
          clinical_assessment_id: string | null
          clinical_encounter_id: string | null
          clinical_note_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          document_file_id: string | null
          external_document_id: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          is_restricted: boolean
          metadata: Json
          mime_type: string | null
          patient_id: string
          patient_visible_allowed: boolean
          storage_bucket: string | null
          storage_path: string | null
          tenant_id: string
          updated_at: string
          uploaded_by_profile_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_profile_id?: string | null
          attachment_category?: string
          clinical_assessment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_note_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          document_file_id?: string | null
          external_document_id?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          is_restricted?: boolean
          metadata?: Json
          mime_type?: string | null
          patient_id: string
          patient_visible_allowed?: boolean
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id: string
          updated_at?: string
          uploaded_by_profile_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_profile_id?: string | null
          attachment_category?: string
          clinical_assessment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_note_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          document_file_id?: string | null
          external_document_id?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          is_restricted?: boolean
          metadata?: Json
          mime_type?: string | null
          patient_id?: string
          patient_visible_allowed?: boolean
          storage_bucket?: string | null
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_attachments_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_document_file_id_fkey"
            columns: ["document_file_id"]
            isOneToOne: false
            referencedRelation: "document_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_attachments_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_diagnoses: {
        Row: {
          code: string
          coding_system: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          diagnosis_status: string
          id: string
          is_primary: boolean
          label: string | null
          metadata: Json
          onset_date: string | null
          patient_id: string
          patient_visible_allowed: boolean
          practitioner_therapist_profile_id: string | null
          resolved_date: string | null
          source_clinical_assessment_id: string | null
          source_clinical_note_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          code: string
          coding_system?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          diagnosis_status?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          metadata?: Json
          onset_date?: string | null
          patient_id: string
          patient_visible_allowed?: boolean
          practitioner_therapist_profile_id?: string | null
          resolved_date?: string | null
          source_clinical_assessment_id?: string | null
          source_clinical_note_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          code?: string
          coding_system?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          diagnosis_status?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          metadata?: Json
          onset_date?: string | null
          patient_id?: string
          patient_visible_allowed?: boolean
          practitioner_therapist_profile_id?: string | null
          resolved_date?: string | null
          source_clinical_assessment_id?: string | null
          source_clinical_note_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_diagnoses_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_diagnoses_practitioner_therapist_profile_id_fkey"
            columns: ["practitioner_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_diagnoses_source_clinical_assessment_id_fkey"
            columns: ["source_clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_diagnoses_source_clinical_note_id_fkey"
            columns: ["source_clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_diagnoses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_diagnoses_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_encounters: {
        Row: {
          booking_id: string | null
          clinical_visibility: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          encounter_status: string
          encounter_type: string
          ended_at: string | null
          id: string
          lock_version: number
          metadata: Json
          occurred_at: string | null
          patient_id: string
          practice_location_id: string | null
          responsible_therapist_profile_id: string | null
          restricted_reason: string | null
          session_id: string | null
          started_at: string | null
          summary: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          booking_id?: string | null
          clinical_visibility?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          encounter_status?: string
          encounter_type?: string
          ended_at?: string | null
          id?: string
          lock_version?: number
          metadata?: Json
          occurred_at?: string | null
          patient_id: string
          practice_location_id?: string | null
          responsible_therapist_profile_id?: string | null
          restricted_reason?: string | null
          session_id?: string | null
          started_at?: string | null
          summary?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          booking_id?: string | null
          clinical_visibility?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          encounter_status?: string
          encounter_type?: string
          ended_at?: string | null
          id?: string
          lock_version?: number
          metadata?: Json
          occurred_at?: string | null
          patient_id?: string
          practice_location_id?: string | null
          responsible_therapist_profile_id?: string | null
          restricted_reason?: string | null
          session_id?: string | null
          started_at?: string | null
          summary?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_encounters_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_responsible_therapist_profile_id_fkey"
            columns: ["responsible_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_encounters_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_goal_reviews: {
        Row: {
          clinical_goal_id: string
          created_at: string
          deleted_at: string | null
          evidence_summary: string | null
          id: string
          metadata: Json
          patient_id: string
          progress_rating: number | null
          review_status: string
          reviewed_at: string
          reviewed_by_profile_id: string | null
          tenant_id: string
        }
        Insert: {
          clinical_goal_id: string
          created_at?: string
          deleted_at?: string | null
          evidence_summary?: string | null
          id?: string
          metadata?: Json
          patient_id: string
          progress_rating?: number | null
          review_status?: string
          reviewed_at?: string
          reviewed_by_profile_id?: string | null
          tenant_id: string
        }
        Update: {
          clinical_goal_id?: string
          created_at?: string
          deleted_at?: string | null
          evidence_summary?: string | null
          id?: string
          metadata?: Json
          patient_id?: string
          progress_rating?: number | null
          review_status?: string
          reviewed_at?: string
          reviewed_by_profile_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_goal_reviews_clinical_goal_id_fkey"
            columns: ["clinical_goal_id"]
            isOneToOne: false
            referencedRelation: "clinical_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goal_reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goal_reviews_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goal_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_goals: {
        Row: {
          achieved_at: string | null
          baseline_summary: string | null
          clinical_encounter_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          discontinued_at: string | null
          goal_domain: string | null
          goal_status: string
          goal_text: string
          id: string
          lock_version: number
          measurable_criteria: string | null
          metadata: Json
          patient_id: string
          patient_visible_allowed: boolean
          priority: string
          review_due_date: string | null
          target_summary: string | null
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          achieved_at?: string | null
          baseline_summary?: string | null
          clinical_encounter_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          discontinued_at?: string | null
          goal_domain?: string | null
          goal_status?: string
          goal_text: string
          id?: string
          lock_version?: number
          measurable_criteria?: string | null
          metadata?: Json
          patient_id: string
          patient_visible_allowed?: boolean
          priority?: string
          review_due_date?: string | null
          target_summary?: string | null
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          achieved_at?: string | null
          baseline_summary?: string | null
          clinical_encounter_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          discontinued_at?: string | null
          goal_domain?: string | null
          goal_status?: string
          goal_text?: string
          id?: string
          lock_version?: number
          measurable_criteria?: string | null
          metadata?: Json
          patient_id?: string
          patient_visible_allowed?: boolean
          priority?: string
          review_due_date?: string | null
          target_summary?: string | null
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_goals_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_amendments: {
        Row: {
          amendment_free_text: string | null
          amendment_number: number
          amendment_reason: string
          amendment_structured_content: Json
          author_profile_id: string | null
          clinical_note_id: string
          clinical_note_version_id: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          amendment_free_text?: string | null
          amendment_number: number
          amendment_reason: string
          amendment_structured_content?: Json
          author_profile_id?: string | null
          clinical_note_id: string
          clinical_note_version_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          amendment_free_text?: string | null
          amendment_number?: number
          amendment_reason?: string
          amendment_structured_content?: Json
          author_profile_id?: string | null
          clinical_note_id?: string
          clinical_note_version_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_amendments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_clinical_note_version_id_fkey"
            columns: ["clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_amendments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_copy_forward_events: {
        Row: {
          copied_at: string
          copied_by_profile_id: string | null
          copied_value_edited: boolean
          copied_value_snapshot: Json | null
          copy_reason: string | null
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          patient_id: string
          source_clinical_note_id: string
          source_clinical_note_version_id: string
          source_field_key: string | null
          source_response_id: string | null
          source_section_key: string | null
          target_clinical_note_id: string
          target_clinical_note_version_id: string
          target_field_key: string | null
          target_response_id: string | null
          target_section_key: string | null
          tenant_id: string
        }
        Insert: {
          copied_at?: string
          copied_by_profile_id?: string | null
          copied_value_edited?: boolean
          copied_value_snapshot?: Json | null
          copy_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          patient_id: string
          source_clinical_note_id: string
          source_clinical_note_version_id: string
          source_field_key?: string | null
          source_response_id?: string | null
          source_section_key?: string | null
          target_clinical_note_id: string
          target_clinical_note_version_id: string
          target_field_key?: string | null
          target_response_id?: string | null
          target_section_key?: string | null
          tenant_id: string
        }
        Update: {
          copied_at?: string
          copied_by_profile_id?: string | null
          copied_value_edited?: boolean
          copied_value_snapshot?: Json | null
          copy_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          patient_id?: string
          source_clinical_note_id?: string
          source_clinical_note_version_id?: string
          source_field_key?: string | null
          source_response_id?: string | null
          source_section_key?: string | null
          target_clinical_note_id?: string
          target_clinical_note_version_id?: string
          target_field_key?: string | null
          target_response_id?: string | null
          target_section_key?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_copy_forward_ev_source_clinical_note_version_fkey"
            columns: ["source_clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_ev_target_clinical_note_version_fkey"
            columns: ["target_clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_copied_by_profile_id_fkey"
            columns: ["copied_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_source_clinical_note_id_fkey"
            columns: ["source_clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_source_response_id_fkey"
            columns: ["source_response_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_structured_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_target_clinical_note_id_fkey"
            columns: ["target_clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_target_response_id_fkey"
            columns: ["target_response_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_structured_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_copy_forward_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_draft_states: {
        Row: {
          active_editor_profile_id: string | null
          clinical_note_id: string
          clinical_note_version_id: string
          conflict_detected: boolean
          conflict_reason: string | null
          created_at: string
          deleted_at: string | null
          draft_status: string
          id: string
          last_client_saved_at: string | null
          last_idempotency_key: string | null
          last_saved_at: string
          last_saved_by_profile_id: string | null
          lock_version: number
          metadata: Json
          patient_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_editor_profile_id?: string | null
          clinical_note_id: string
          clinical_note_version_id: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_status?: string
          id?: string
          last_client_saved_at?: string | null
          last_idempotency_key?: string | null
          last_saved_at?: string
          last_saved_by_profile_id?: string | null
          lock_version?: number
          metadata?: Json
          patient_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_editor_profile_id?: string | null
          clinical_note_id?: string
          clinical_note_version_id?: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_status?: string
          id?: string
          last_client_saved_at?: string | null
          last_idempotency_key?: string | null
          last_saved_at?: string
          last_saved_by_profile_id?: string | null
          lock_version?: number
          metadata?: Json
          patient_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_draft_states_active_editor_profile_id_fkey"
            columns: ["active_editor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_draft_states_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_draft_states_clinical_note_version_id_fkey"
            columns: ["clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_draft_states_last_saved_by_profile_id_fkey"
            columns: ["last_saved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_draft_states_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_draft_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_structured_responses: {
        Row: {
          clinical_note_id: string
          clinical_note_template_version_id: string | null
          clinical_note_version_id: string
          clinical_template_field_id: string | null
          clinical_template_section_id: string | null
          copied_value_edited: boolean
          copy_forward_event_id: string | null
          created_at: string
          deleted_at: string | null
          display_value: string | null
          field_key: string
          id: string
          idempotency_key: string | null
          is_calculated: boolean
          is_required_snapshot: boolean
          lock_version: number
          metadata: Json
          patient_id: string
          patient_visible_eligible_snapshot: boolean
          practitioner_only_snapshot: boolean
          repeat_group_key: string | null
          repeat_index: number
          response_boolean: boolean | null
          response_date: string | null
          response_datetime: string | null
          response_number: number | null
          response_text: string | null
          response_unit: string | null
          response_value: Json | null
          restricted_snapshot: boolean
          saved_at: string
          saved_by_profile_id: string | null
          section_key: string
          tenant_id: string
          updated_at: string
          validation_errors: Json
          validation_state: string
          value_type: string
        }
        Insert: {
          clinical_note_id: string
          clinical_note_template_version_id?: string | null
          clinical_note_version_id: string
          clinical_template_field_id?: string | null
          clinical_template_section_id?: string | null
          copied_value_edited?: boolean
          copy_forward_event_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_value?: string | null
          field_key: string
          id?: string
          idempotency_key?: string | null
          is_calculated?: boolean
          is_required_snapshot?: boolean
          lock_version?: number
          metadata?: Json
          patient_id: string
          patient_visible_eligible_snapshot?: boolean
          practitioner_only_snapshot?: boolean
          repeat_group_key?: string | null
          repeat_index?: number
          response_boolean?: boolean | null
          response_date?: string | null
          response_datetime?: string | null
          response_number?: number | null
          response_text?: string | null
          response_unit?: string | null
          response_value?: Json | null
          restricted_snapshot?: boolean
          saved_at?: string
          saved_by_profile_id?: string | null
          section_key: string
          tenant_id: string
          updated_at?: string
          validation_errors?: Json
          validation_state?: string
          value_type: string
        }
        Update: {
          clinical_note_id?: string
          clinical_note_template_version_id?: string | null
          clinical_note_version_id?: string
          clinical_template_field_id?: string | null
          clinical_template_section_id?: string | null
          copied_value_edited?: boolean
          copy_forward_event_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_value?: string | null
          field_key?: string
          id?: string
          idempotency_key?: string | null
          is_calculated?: boolean
          is_required_snapshot?: boolean
          lock_version?: number
          metadata?: Json
          patient_id?: string
          patient_visible_eligible_snapshot?: boolean
          practitioner_only_snapshot?: boolean
          repeat_group_key?: string | null
          repeat_index?: number
          response_boolean?: boolean | null
          response_date?: string | null
          response_datetime?: string | null
          response_number?: number | null
          response_text?: string | null
          response_unit?: string | null
          response_value?: Json | null
          restricted_snapshot?: boolean
          saved_at?: string
          saved_by_profile_id?: string | null
          section_key?: string
          tenant_id?: string
          updated_at?: string
          validation_errors?: Json
          validation_state?: string
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_structured_resp_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_resp_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_note_structured_resp_clinical_template_section_id_fkey"
            columns: ["clinical_template_section_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_respon_clinical_template_field_id_fkey"
            columns: ["clinical_template_field_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_response_clinical_note_version_id_fkey"
            columns: ["clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_responses_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_responses_copy_forward_fk"
            columns: ["copy_forward_event_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_copy_forward_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_responses_saved_by_profile_id_fkey"
            columns: ["saved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_structured_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_template_versions: {
        Row: {
          approval_comment: string | null
          approved_at: string | null
          approved_by_profile_id: string | null
          clinical_note_template_id: string
          created_at: string
          created_by_profile_id: string | null
          default_free_text: string | null
          default_structured_content: Json
          deleted_at: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          lock_version: number
          metadata: Json
          publication_ready: boolean
          published_at: string | null
          published_by_profile_id: string | null
          release_notes: string | null
          required_fields: string[]
          retired_at: string | null
          retirement_reason: string | null
          review_status: string
          source_template_version_id: string | null
          submitted_for_review_at: string | null
          submitted_for_review_by_profile_id: string | null
          template_schema: Json
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          validation_status: string
          version_number: number
          version_status: string
          visibility_default: string
        }
        Insert: {
          approval_comment?: string | null
          approved_at?: string | null
          approved_by_profile_id?: string | null
          clinical_note_template_id: string
          created_at?: string
          created_by_profile_id?: string | null
          default_free_text?: string | null
          default_structured_content?: Json
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          lock_version?: number
          metadata?: Json
          publication_ready?: boolean
          published_at?: string | null
          published_by_profile_id?: string | null
          release_notes?: string | null
          required_fields?: string[]
          retired_at?: string | null
          retirement_reason?: string | null
          review_status?: string
          source_template_version_id?: string | null
          submitted_for_review_at?: string | null
          submitted_for_review_by_profile_id?: string | null
          template_schema?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_status?: string
          version_number: number
          version_status?: string
          visibility_default?: string
        }
        Update: {
          approval_comment?: string | null
          approved_at?: string | null
          approved_by_profile_id?: string | null
          clinical_note_template_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          default_free_text?: string | null
          default_structured_content?: Json
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          lock_version?: number
          metadata?: Json
          publication_ready?: boolean
          published_at?: string | null
          published_by_profile_id?: string | null
          release_notes?: string | null
          required_fields?: string[]
          retired_at?: string | null
          retirement_reason?: string | null
          review_status?: string
          source_template_version_id?: string | null
          submitted_for_review_at?: string | null
          submitted_for_review_by_profile_id?: string | null
          template_schema?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_status?: string
          version_number?: number
          version_status?: string
          visibility_default?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_template_versio_submitted_for_review_by_prof_fkey"
            columns: ["submitted_for_review_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_approved_by_profile_id_fkey"
            columns: ["approved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_source_template_version_id_fkey"
            columns: ["source_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_source_template_version_id_fkey"
            columns: ["source_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_template_versions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_templates: {
        Row: {
          active_version_id: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          description: string | null
          discipline_tags: string[]
          id: string
          is_system_template: boolean
          lock_version: number
          metadata: Json
          name: string
          template_key: string
          template_owner_type: string
          template_status: string
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          active_version_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline_tags?: string[]
          id?: string
          is_system_template?: boolean
          lock_version?: number
          metadata?: Json
          name: string
          template_key: string
          template_owner_type?: string
          template_status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          active_version_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline_tags?: string[]
          id?: string
          is_system_template?: boolean
          lock_version?: number
          metadata?: Json
          name?: string
          template_key?: string
          template_owner_type?: string
          template_status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_templates_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_templates_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_note_templates_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_templates_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_templates_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_versions: {
        Row: {
          author_profile_id: string | null
          change_reason: string | null
          clinical_note_id: string
          clinical_note_template_version_id: string | null
          content_hash: string | null
          created_at: string
          deleted_at: string | null
          finalised_at: string | null
          finalised_by_profile_id: string | null
          free_text_content: string | null
          id: string
          metadata: Json
          signature_hash: string | null
          signature_statement: string | null
          signed_at: string | null
          signed_by_profile_id: string | null
          structured_content: Json
          tenant_id: string
          updated_at: string
          version_number: number
          version_status: string
        }
        Insert: {
          author_profile_id?: string | null
          change_reason?: string | null
          clinical_note_id: string
          clinical_note_template_version_id?: string | null
          content_hash?: string | null
          created_at?: string
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          free_text_content?: string | null
          id?: string
          metadata?: Json
          signature_hash?: string | null
          signature_statement?: string | null
          signed_at?: string | null
          signed_by_profile_id?: string | null
          structured_content?: Json
          tenant_id: string
          updated_at?: string
          version_number: number
          version_status?: string
        }
        Update: {
          author_profile_id?: string | null
          change_reason?: string | null
          clinical_note_id?: string
          clinical_note_template_version_id?: string | null
          content_hash?: string | null
          created_at?: string
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          free_text_content?: string | null
          id?: string
          metadata?: Json
          signature_hash?: string | null
          signature_statement?: string | null
          signed_at?: string | null
          signed_by_profile_id?: string | null
          structured_content?: Json
          tenant_id?: string
          updated_at?: string
          version_number?: number
          version_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_versions_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_versions_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_versions_clinical_note_template_version_id_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_versions_clinical_note_template_version_id_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_note_versions_finalised_by_profile_id_fkey"
            columns: ["finalised_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_versions_signed_by_profile_id_fkey"
            columns: ["signed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_note_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          amended_at: string | null
          amended_by_profile_id: string | null
          amendment_count: number
          author_profile_id: string | null
          booking_id: string | null
          clinical_encounter_id: string | null
          clinical_visibility: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          finalised_at: string | null
          finalised_by_profile_id: string | null
          id: string
          is_restricted: boolean
          latest_version_id: string | null
          lock_version: number
          locked_at: string | null
          locked_by_profile_id: string | null
          metadata: Json
          note_status: string
          note_title: string | null
          note_type: string
          patient_id: string
          patient_visible_allowed: boolean
          responsible_therapist_profile_id: string | null
          session_id: string | null
          signed_at: string | null
          signed_by_profile_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          amended_at?: string | null
          amended_by_profile_id?: string | null
          amendment_count?: number
          author_profile_id?: string | null
          booking_id?: string | null
          clinical_encounter_id?: string | null
          clinical_visibility?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          id?: string
          is_restricted?: boolean
          latest_version_id?: string | null
          lock_version?: number
          locked_at?: string | null
          locked_by_profile_id?: string | null
          metadata?: Json
          note_status?: string
          note_title?: string | null
          note_type?: string
          patient_id: string
          patient_visible_allowed?: boolean
          responsible_therapist_profile_id?: string | null
          session_id?: string | null
          signed_at?: string | null
          signed_by_profile_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          amended_at?: string | null
          amended_by_profile_id?: string | null
          amendment_count?: number
          author_profile_id?: string | null
          booking_id?: string | null
          clinical_encounter_id?: string | null
          clinical_visibility?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          finalised_at?: string | null
          finalised_by_profile_id?: string | null
          id?: string
          is_restricted?: boolean
          latest_version_id?: string | null
          lock_version?: number
          locked_at?: string | null
          locked_by_profile_id?: string | null
          metadata?: Json
          note_status?: string
          note_title?: string | null
          note_type?: string
          patient_id?: string
          patient_visible_allowed?: boolean
          responsible_therapist_profile_id?: string | null
          session_id?: string | null
          signed_at?: string | null
          signed_by_profile_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_amended_by_profile_id_fkey"
            columns: ["amended_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_finalised_by_profile_id_fkey"
            columns: ["finalised_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_latest_version_fk"
            columns: ["latest_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_locked_by_profile_id_fkey"
            columns: ["locked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_responsible_therapist_profile_id_fkey"
            columns: ["responsible_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_signed_by_profile_id_fkey"
            columns: ["signed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_patient_link_publications: {
        Row: {
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          metadata: Json
          patient_id: string
          patient_link_id: string | null
          publication_status: string
          published_at: string | null
          published_by_profile_id: string | null
          record_id: string
          record_type: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by_profile_id: string | null
          safe_summary: string | null
          safe_title: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          patient_id: string
          patient_link_id?: string | null
          publication_status?: string
          published_at?: string | null
          published_by_profile_id?: string | null
          record_id: string
          record_type: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          safe_summary?: string | null
          safe_title: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          patient_id?: string
          patient_link_id?: string | null
          publication_status?: string
          published_at?: string | null
          published_by_profile_id?: string | null
          record_id?: string
          record_type?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          safe_summary?: string | null
          safe_title?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_patient_link_publications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_link_publications_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_link_publications_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_link_publications_revoked_by_profile_id_fkey"
            columns: ["revoked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_link_publications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_record_restrictions: {
        Row: {
          applied_at: string
          applied_by_profile_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          patient_id: string
          record_id: string
          record_type: string
          removed_at: string | null
          removed_by_profile_id: string | null
          restriction_reason: string
          restriction_status: string
          review_due_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          applied_by_profile_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          patient_id: string
          record_id: string
          record_type: string
          removed_at?: string | null
          removed_by_profile_id?: string | null
          restriction_reason: string
          restriction_status?: string
          review_due_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          applied_by_profile_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          patient_id?: string
          record_id?: string
          record_type?: string
          removed_at?: string | null
          removed_by_profile_id?: string | null
          restriction_reason?: string
          restriction_status?: string
          review_due_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_record_restrictions_applied_by_profile_id_fkey"
            columns: ["applied_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_record_restrictions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_record_restrictions_removed_by_profile_id_fkey"
            columns: ["removed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_record_restrictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_assignments: {
        Row: {
          assigned_by_profile_id: string | null
          assignment_priority: number
          assignment_reason: string | null
          assignment_scope: string
          clinical_note_template_id: string
          clinical_note_template_version_id: string | null
          created_at: string
          deleted_at: string | null
          discipline: string | null
          effective_from: string | null
          effective_until: string | null
          encounter_type: string | null
          id: string
          is_active: boolean
          is_default: boolean
          lock_version: number
          metadata: Json
          practice_location_id: string | null
          session_type: string | null
          tenant_id: string | null
          therapist_profile_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by_profile_id?: string | null
          assignment_priority?: number
          assignment_reason?: string | null
          assignment_scope?: string
          clinical_note_template_id: string
          clinical_note_template_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          effective_from?: string | null
          effective_until?: string | null
          encounter_type?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          lock_version?: number
          metadata?: Json
          practice_location_id?: string | null
          session_type?: string | null
          tenant_id?: string | null
          therapist_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by_profile_id?: string | null
          assignment_priority?: number
          assignment_reason?: string | null
          assignment_scope?: string
          clinical_note_template_id?: string
          clinical_note_template_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          effective_from?: string | null
          effective_until?: string | null
          encounter_type?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          lock_version?: number
          metadata?: Json
          practice_location_id?: string | null
          session_type?: string | null
          tenant_id?: string | null
          therapist_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_assignments_assigned_by_profile_id_fkey"
            columns: ["assigned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_assignments_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_calculation_rules: {
        Row: {
          calculation_config: Json
          calculation_key: string
          calculation_status: string
          calculation_type: string
          clinical_note_template_version_id: string
          created_at: string
          deleted_at: string | null
          id: string
          input_field_keys: string[]
          is_required_for_finalise: boolean
          lock_version: number
          metadata: Json
          result_unit: string | null
          result_value_type: string
          target_clinical_template_field_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          calculation_config?: Json
          calculation_key: string
          calculation_status?: string
          calculation_type: string
          clinical_note_template_version_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          input_field_keys?: string[]
          is_required_for_finalise?: boolean
          lock_version?: number
          metadata?: Json
          result_unit?: string | null
          result_value_type?: string
          target_clinical_template_field_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          calculation_config?: Json
          calculation_key?: string
          calculation_status?: string
          calculation_type?: string
          clinical_note_template_version_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          input_field_keys?: string[]
          is_required_for_finalise?: boolean
          lock_version?: number
          metadata?: Json
          result_unit?: string | null
          result_value_type?: string
          target_clinical_template_field_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_calculation_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_calculation_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_calculation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_calculation_target_clinical_template_fie_fkey"
            columns: ["target_clinical_template_field_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_draft_states: {
        Row: {
          active_editor_profile_id: string | null
          clinical_note_template_id: string
          clinical_note_template_version_id: string
          conflict_detected: boolean
          conflict_reason: string | null
          created_at: string
          deleted_at: string | null
          draft_owner_profile_id: string | null
          draft_status: string
          id: string
          last_client_saved_at: string | null
          last_idempotency_key: string | null
          last_saved_at: string
          last_saved_by_profile_id: string | null
          lock_version: number
          metadata: Json
          publication_ready: boolean
          review_status: string
          tenant_id: string | null
          updated_at: string
          validation_status: string
        }
        Insert: {
          active_editor_profile_id?: string | null
          clinical_note_template_id: string
          clinical_note_template_version_id: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_owner_profile_id?: string | null
          draft_status?: string
          id?: string
          last_client_saved_at?: string | null
          last_idempotency_key?: string | null
          last_saved_at?: string
          last_saved_by_profile_id?: string | null
          lock_version?: number
          metadata?: Json
          publication_ready?: boolean
          review_status?: string
          tenant_id?: string | null
          updated_at?: string
          validation_status?: string
        }
        Update: {
          active_editor_profile_id?: string | null
          clinical_note_template_id?: string
          clinical_note_template_version_id?: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_owner_profile_id?: string | null
          draft_status?: string
          id?: string
          last_client_saved_at?: string | null
          last_idempotency_key?: string | null
          last_saved_at?: string
          last_saved_by_profile_id?: string | null
          lock_version?: number
          metadata?: Json
          publication_ready?: boolean
          review_status?: string
          tenant_id?: string | null
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_draft_state_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_draft_state_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_draft_states_active_editor_profile_id_fkey"
            columns: ["active_editor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_draft_states_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_draft_states_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_id"]
          },
          {
            foreignKeyName: "clinical_template_draft_states_draft_owner_profile_id_fkey"
            columns: ["draft_owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_draft_states_last_saved_by_profile_id_fkey"
            columns: ["last_saved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_draft_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_field_options: {
        Row: {
          clinical_note_template_version_id: string
          clinical_template_field_id: string
          created_at: string
          deleted_at: string | null
          display_order: number
          id: string
          is_default: boolean
          lock_version: number
          metadata: Json
          option_key: string
          option_label: string
          option_value: Json | null
          patient_visible_eligible: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          clinical_note_template_version_id: string
          clinical_template_field_id: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          lock_version?: number
          metadata?: Json
          option_key: string
          option_label: string
          option_value?: Json | null
          patient_visible_eligible?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          clinical_note_template_version_id?: string
          clinical_template_field_id?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          lock_version?: number
          metadata?: Json
          option_key?: string
          option_label?: string
          option_value?: Json | null
          patient_visible_eligible?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_field_optio_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_field_optio_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_field_options_clinical_template_field_id_fkey"
            columns: ["clinical_template_field_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_field_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_fields: {
        Row: {
          allowed_units: string[]
          clinical_note_template_version_id: string
          clinical_template_section_id: string
          created_at: string
          created_by_profile_id: string | null
          default_value: Json | null
          deleted_at: string | null
          display_order: number
          field_config: Json
          field_key: string
          field_label: string
          field_type: string
          help_text: string | null
          id: string
          is_calculated: boolean
          is_internal_admin: boolean
          is_read_only: boolean
          is_repeating: boolean
          is_required: boolean
          is_required_on_finalise: boolean
          lock_version: number
          metadata: Json
          parent_field_id: string | null
          patient_facing_description: string | null
          patient_facing_label: string | null
          patient_visible_eligible: boolean
          placeholder: string | null
          practitioner_only: boolean
          required_rules: Json
          stable_identity_key: string | null
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          validation_config: Json
          visibility_class: string
          visibility_rules: Json
        }
        Insert: {
          allowed_units?: string[]
          clinical_note_template_version_id: string
          clinical_template_section_id: string
          created_at?: string
          created_by_profile_id?: string | null
          default_value?: Json | null
          deleted_at?: string | null
          display_order?: number
          field_config?: Json
          field_key: string
          field_label: string
          field_type: string
          help_text?: string | null
          id?: string
          is_calculated?: boolean
          is_internal_admin?: boolean
          is_read_only?: boolean
          is_repeating?: boolean
          is_required?: boolean
          is_required_on_finalise?: boolean
          lock_version?: number
          metadata?: Json
          parent_field_id?: string | null
          patient_facing_description?: string | null
          patient_facing_label?: string | null
          patient_visible_eligible?: boolean
          placeholder?: string | null
          practitioner_only?: boolean
          required_rules?: Json
          stable_identity_key?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_config?: Json
          visibility_class?: string
          visibility_rules?: Json
        }
        Update: {
          allowed_units?: string[]
          clinical_note_template_version_id?: string
          clinical_template_section_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          default_value?: Json | null
          deleted_at?: string | null
          display_order?: number
          field_config?: Json
          field_key?: string
          field_label?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_calculated?: boolean
          is_internal_admin?: boolean
          is_read_only?: boolean
          is_repeating?: boolean
          is_required?: boolean
          is_required_on_finalise?: boolean
          lock_version?: number
          metadata?: Json
          parent_field_id?: string | null
          patient_facing_description?: string | null
          patient_facing_label?: string | null
          patient_visible_eligible?: boolean
          placeholder?: string | null
          practitioner_only?: boolean
          required_rules?: Json
          stable_identity_key?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          validation_config?: Json
          visibility_class?: string
          visibility_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_fields_clinical_note_template_version_id_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_fields_clinical_note_template_version_id_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_fields_clinical_template_section_id_fkey"
            columns: ["clinical_template_section_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_fields_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_fields_parent_field_id_fkey"
            columns: ["parent_field_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_fields_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_review_requests: {
        Row: {
          clinical_note_template_id: string
          clinical_note_template_version_id: string
          created_at: string
          decision_at: string | null
          decision_reason: string | null
          deleted_at: string | null
          id: string
          metadata: Json
          requested_at: string
          requested_by_profile_id: string | null
          review_status: string
          reviewer_profile_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          clinical_note_template_id: string
          clinical_note_template_version_id: string
          created_at?: string
          decision_at?: string | null
          decision_reason?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          requested_at?: string
          requested_by_profile_id?: string | null
          review_status?: string
          reviewer_profile_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          clinical_note_template_id?: string
          clinical_note_template_version_id?: string
          created_at?: string
          decision_at?: string | null
          decision_reason?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          requested_at?: string
          requested_by_profile_id?: string | null
          review_status?: string
          reviewer_profile_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_review_requ_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_review_requ_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_review_request_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_review_request_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_id"]
          },
          {
            foreignKeyName: "clinical_template_review_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_review_requests_reviewer_profile_id_fkey"
            columns: ["reviewer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_review_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_sections: {
        Row: {
          clinical_note_template_version_id: string
          created_at: string
          created_by_profile_id: string | null
          default_collapsed: boolean
          deleted_at: string | null
          description: string | null
          display_order: number
          help_text: string | null
          id: string
          is_internal_admin: boolean
          is_repeating: boolean
          lock_version: number
          max_repeats: number | null
          metadata: Json
          min_repeats: number | null
          parent_section_id: string | null
          patient_facing_description: string | null
          patient_facing_label: string | null
          patient_visible_eligible: boolean
          practitioner_only: boolean
          required_rules: Json
          section_key: string
          section_label: string
          section_type: string
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          visibility_class: string
          visibility_rules: Json
        }
        Insert: {
          clinical_note_template_version_id: string
          created_at?: string
          created_by_profile_id?: string | null
          default_collapsed?: boolean
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          is_internal_admin?: boolean
          is_repeating?: boolean
          lock_version?: number
          max_repeats?: number | null
          metadata?: Json
          min_repeats?: number | null
          parent_section_id?: string | null
          patient_facing_description?: string | null
          patient_facing_label?: string | null
          patient_visible_eligible?: boolean
          practitioner_only?: boolean
          required_rules?: Json
          section_key: string
          section_label: string
          section_type?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          visibility_class?: string
          visibility_rules?: Json
        }
        Update: {
          clinical_note_template_version_id?: string
          created_at?: string
          created_by_profile_id?: string | null
          default_collapsed?: boolean
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          is_internal_admin?: boolean
          is_repeating?: boolean
          lock_version?: number
          max_repeats?: number | null
          metadata?: Json
          min_repeats?: number | null
          parent_section_id?: string | null
          patient_facing_description?: string | null
          patient_facing_label?: string | null
          patient_visible_eligible?: boolean
          practitioner_only?: boolean
          required_rules?: Json
          section_key?: string
          section_label?: string
          section_type?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          visibility_class?: string
          visibility_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_sections_clinical_note_template_version__fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_sections_clinical_note_template_version__fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_sections_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_sections_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_usage_snapshots: {
        Row: {
          active_assignment_count: number
          active_version_count: number
          calculated_at: string
          clinical_note_template_id: string
          clinical_note_template_version_id: string | null
          created_at: string
          deleted_at: string | null
          draft_version_count: number
          first_used_at: string | null
          id: string
          last_used_at: string | null
          metadata: Json
          note_count: number
          retired_version_count: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active_assignment_count?: number
          active_version_count?: number
          calculated_at?: string
          clinical_note_template_id: string
          clinical_note_template_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_version_count?: number
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json
          note_count?: number
          retired_version_count?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active_assignment_count?: number
          active_version_count?: number
          calculated_at?: string
          clinical_note_template_id?: string
          clinical_note_template_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          draft_version_count?: number
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json
          note_count?: number
          retired_version_count?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_usage_snaps_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_usage_snaps_clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_usage_snapshot_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_usage_snapshot_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_id"]
          },
          {
            foreignKeyName: "clinical_template_usage_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_validation_results: {
        Row: {
          clinical_note_template_id: string
          clinical_note_template_version_id: string
          created_at: string
          deleted_at: string | null
          error_count: number
          finding_count: number
          findings: Json
          id: string
          info_count: number
          metadata: Json
          template_lock_version: number | null
          tenant_id: string | null
          updated_at: string
          validated_at: string
          validated_by_profile_id: string | null
          validation_scope: string
          validation_status: string
          version_lock_version: number | null
          warning_count: number
        }
        Insert: {
          clinical_note_template_id: string
          clinical_note_template_version_id: string
          created_at?: string
          deleted_at?: string | null
          error_count?: number
          finding_count?: number
          findings?: Json
          id?: string
          info_count?: number
          metadata?: Json
          template_lock_version?: number | null
          tenant_id?: string | null
          updated_at?: string
          validated_at?: string
          validated_by_profile_id?: string | null
          validation_scope?: string
          validation_status: string
          version_lock_version?: number | null
          warning_count?: number
        }
        Update: {
          clinical_note_template_id?: string
          clinical_note_template_version_id?: string
          created_at?: string
          deleted_at?: string | null
          error_count?: number
          finding_count?: number
          findings?: Json
          id?: string
          info_count?: number
          metadata?: Json
          template_lock_version?: number | null
          tenant_id?: string | null
          updated_at?: string
          validated_at?: string
          validated_by_profile_id?: string | null
          validation_scope?: string
          validation_status?: string
          version_lock_version?: number | null
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_validation_clinical_note_template_versi_fkey1"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_validation_clinical_note_template_versi_fkey1"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_validation_res_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_validation_res_clinical_note_template_id_fkey"
            columns: ["clinical_note_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_id"]
          },
          {
            foreignKeyName: "clinical_template_validation_resul_validated_by_profile_id_fkey"
            columns: ["validated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_validation_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_validation_rules: {
        Row: {
          applies_on: string
          clinical_note_template_version_id: string
          clinical_template_field_id: string | null
          clinical_template_section_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          lock_version: number
          message: string | null
          metadata: Json
          rule_config: Json
          rule_key: string
          rule_type: string
          severity: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          applies_on?: string
          clinical_note_template_version_id: string
          clinical_template_field_id?: string | null
          clinical_template_section_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          lock_version?: number
          message?: string | null
          metadata?: Json
          rule_config?: Json
          rule_key: string
          rule_type: string
          severity?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_on?: string
          clinical_note_template_version_id?: string
          clinical_template_field_id?: string | null
          clinical_template_section_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          lock_version?: number
          message?: string | null
          metadata?: Json
          rule_config?: Json
          rule_key?: string
          rule_type?: string
          severity?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_template_validation__clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_validation__clinical_note_template_versi_fkey"
            columns: ["clinical_note_template_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_usage_summary"
            referencedColumns: ["clinical_note_template_version_id"]
          },
          {
            foreignKeyName: "clinical_template_validation__clinical_template_section_id_fkey"
            columns: ["clinical_template_section_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_validation_ru_clinical_template_field_id_fkey"
            columns: ["clinical_template_field_id"]
            isOneToOne: false
            referencedRelation: "clinical_template_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_template_validation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_workflow_events: {
        Row: {
          clinical_assessment_id: string | null
          clinical_encounter_id: string | null
          clinical_goal_id: string | null
          clinical_note_id: string | null
          clinical_note_version_id: string | null
          created_at: string
          deleted_at: string | null
          error_message: string | null
          event_key: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          patient_id: string | null
          processed_at: string | null
          tenant_id: string
          treatment_plan_id: string | null
          updated_at: string
          workflow_status: string
        }
        Insert: {
          clinical_assessment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_goal_id?: string | null
          clinical_note_id?: string | null
          clinical_note_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          event_key?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          patient_id?: string | null
          processed_at?: string | null
          tenant_id: string
          treatment_plan_id?: string | null
          updated_at?: string
          workflow_status?: string
        }
        Update: {
          clinical_assessment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_goal_id?: string | null
          clinical_note_id?: string | null
          clinical_note_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          error_message?: string | null
          event_key?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          patient_id?: string | null
          processed_at?: string | null
          tenant_id?: string
          treatment_plan_id?: string | null
          updated_at?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_workflow_events_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_clinical_goal_id_fkey"
            columns: ["clinical_goal_id"]
            isOneToOne: false
            referencedRelation: "clinical_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_clinical_note_version_id_fkey"
            columns: ["clinical_note_version_id"]
            isOneToOne: false
            referencedRelation: "clinical_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_workflow_events_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_requests: {
        Row: {
          approved_merge_fields: Json
          attempt_count: number
          channel: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          error_summary: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          locked_at: string | null
          locked_by: string | null
          recipient_patient_id: string | null
          recipient_responsible_party_id: string | null
          recipient_type: string
          related_booking_id: string | null
          related_invoice_id: string | null
          related_patient_id: string | null
          related_patient_link_id: string | null
          related_payment_id: string | null
          related_receipt_id: string | null
          related_session_id: string | null
          scheduled_send_at: string | null
          status: string
          template_id: string | null
          template_key: string | null
          template_version: string | null
          tenant_id: string
          updated_at: string
          workflow_execution_id: string | null
          workflow_step_execution_id: string | null
        }
        Insert: {
          approved_merge_fields?: Json
          attempt_count?: number
          channel: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          locked_at?: string | null
          locked_by?: string | null
          recipient_patient_id?: string | null
          recipient_responsible_party_id?: string | null
          recipient_type: string
          related_booking_id?: string | null
          related_invoice_id?: string | null
          related_patient_id?: string | null
          related_patient_link_id?: string | null
          related_payment_id?: string | null
          related_receipt_id?: string | null
          related_session_id?: string | null
          scheduled_send_at?: string | null
          status?: string
          template_id?: string | null
          template_key?: string | null
          template_version?: string | null
          tenant_id: string
          updated_at?: string
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Update: {
          approved_merge_fields?: Json
          attempt_count?: number
          channel?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          locked_at?: string | null
          locked_by?: string | null
          recipient_patient_id?: string | null
          recipient_responsible_party_id?: string | null
          recipient_type?: string
          related_booking_id?: string | null
          related_invoice_id?: string | null
          related_patient_id?: string | null
          related_patient_link_id?: string | null
          related_payment_id?: string | null
          related_receipt_id?: string | null
          related_session_id?: string | null
          scheduled_send_at?: string | null
          status?: string
          template_id?: string | null
          template_key?: string | null
          template_version?: string | null
          tenant_id?: string
          updated_at?: string
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_requests_recipient_patient_id_fkey"
            columns: ["recipient_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_recipient_responsible_party_id_fkey"
            columns: ["recipient_responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_patient_link_id_fkey"
            columns: ["related_patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_receipt_id_fkey"
            columns: ["related_receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_requests_workflow_step_execution_id_fkey"
            columns: ["workflow_step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          automation_trigger_key: string | null
          channel: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          message_body: string
          metadata: Json
          practice_profile_id: string | null
          template_key: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          automation_trigger_key?: string | null
          channel: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          message_body: string
          metadata?: Json
          practice_profile_id?: string | null
          template_key: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          automation_trigger_key?: string | null
          channel?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          message_body?: string
          metadata?: Json
          practice_profile_id?: string | null
          template_key?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_practice_profile_id_fkey"
            columns: ["practice_profile_id"]
            isOneToOne: false
            referencedRelation: "practice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_files: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by_profile_id: string | null
          bucket_id: string
          checksum_sha256: string | null
          clinical_attachment_id: string | null
          clinical_encounter_id: string | null
          clinical_note_id: string | null
          content_type: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          document_category: string
          document_status: string
          file_size_bytes: number
          id: string
          invoice_id: string | null
          metadata: Json
          object_path: string
          original_filename: string
          patient_id: string | null
          patient_link_shared_at: string | null
          patient_link_shared_by_profile_id: string | null
          patient_link_visible: boolean
          payment_id: string | null
          practice_branding_id: string | null
          practice_profile_id: string | null
          receipt_id: string | null
          responsible_party_id: string | null
          safe_filename: string
          sharing_scope: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
          upload_completed_at: string | null
          upload_intent_created_at: string
          uploaded_by_profile_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_profile_id?: string | null
          bucket_id: string
          checksum_sha256?: string | null
          clinical_attachment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_note_id?: string | null
          content_type: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          document_category: string
          document_status?: string
          file_size_bytes: number
          id?: string
          invoice_id?: string | null
          metadata?: Json
          object_path: string
          original_filename: string
          patient_id?: string | null
          patient_link_shared_at?: string | null
          patient_link_shared_by_profile_id?: string | null
          patient_link_visible?: boolean
          payment_id?: string | null
          practice_branding_id?: string | null
          practice_profile_id?: string | null
          receipt_id?: string | null
          responsible_party_id?: string | null
          safe_filename: string
          sharing_scope?: string
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
          upload_completed_at?: string | null
          upload_intent_created_at?: string
          uploaded_by_profile_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_profile_id?: string | null
          bucket_id?: string
          checksum_sha256?: string | null
          clinical_attachment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_note_id?: string | null
          content_type?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          document_category?: string
          document_status?: string
          file_size_bytes?: number
          id?: string
          invoice_id?: string | null
          metadata?: Json
          object_path?: string
          original_filename?: string
          patient_id?: string | null
          patient_link_shared_at?: string | null
          patient_link_shared_by_profile_id?: string | null
          patient_link_visible?: boolean
          payment_id?: string | null
          practice_branding_id?: string | null
          practice_profile_id?: string | null
          receipt_id?: string | null
          responsible_party_id?: string | null
          safe_filename?: string
          sharing_scope?: string
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
          upload_completed_at?: string | null
          upload_intent_created_at?: string
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_files_archived_by_profile_id_fkey"
            columns: ["archived_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_patient_link_shared_by_profile_id_fkey"
            columns: ["patient_link_shared_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_practice_branding_id_fkey"
            columns: ["practice_branding_id"]
            isOneToOne: false
            referencedRelation: "practice_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_practice_profile_id_fkey"
            columns: ["practice_profile_id"]
            isOneToOne: false
            referencedRelation: "practice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_files_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_name: string
          account_reference: string | null
          account_status: string
          account_type: string
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          id: string
          metadata: Json
          notes: string | null
          patient_id: string | null
          responsible_party_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          account_name: string
          account_reference?: string | null
          account_status?: string
          account_type?: string
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          account_name?: string
          account_reference?: string | null
          account_status?: string
          account_type?: string
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_issuer_snapshots: {
        Row: {
          bank_account_holder: string | null
          bank_account_id: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_branch_code: string | null
          bank_name: string | null
          branding: Json
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          id: string
          invoice_footer: string | null
          invoice_id: string
          location_address: Json
          location_name: string | null
          payment_instructions: string | null
          payment_terms_days: number
          practice_address: Json
          practice_email: string | null
          practice_legal_name: string | null
          practice_location_id: string | null
          practice_phone: string | null
          practice_profile_id: string | null
          practice_registration_number: string | null
          practice_tax_number: string | null
          practice_trading_name: string | null
          practice_vat_number: string | null
          practice_website: string | null
          snapshot: Json
          tenant_id: string
          therapist_name: string | null
          therapist_practice_number: string | null
          therapist_profession: string | null
          therapist_profile_id: string | null
          therapist_registration: Json
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_id?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          branding?: Json
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_id: string
          location_address?: Json
          location_name?: string | null
          payment_instructions?: string | null
          payment_terms_days?: number
          practice_address?: Json
          practice_email?: string | null
          practice_legal_name?: string | null
          practice_location_id?: string | null
          practice_phone?: string | null
          practice_profile_id?: string | null
          practice_registration_number?: string | null
          practice_tax_number?: string | null
          practice_trading_name?: string | null
          practice_vat_number?: string | null
          practice_website?: string | null
          snapshot?: Json
          tenant_id: string
          therapist_name?: string | null
          therapist_practice_number?: string | null
          therapist_profession?: string | null
          therapist_profile_id?: string | null
          therapist_registration?: Json
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_id?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          branding?: Json
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_id?: string
          location_address?: Json
          location_name?: string | null
          payment_instructions?: string | null
          payment_terms_days?: number
          practice_address?: Json
          practice_email?: string | null
          practice_legal_name?: string | null
          practice_location_id?: string | null
          practice_phone?: string | null
          practice_profile_id?: string | null
          practice_registration_number?: string | null
          practice_tax_number?: string | null
          practice_trading_name?: string | null
          practice_vat_number?: string | null
          practice_website?: string | null
          snapshot?: Json
          tenant_id?: string
          therapist_name?: string | null
          therapist_practice_number?: string | null
          therapist_profession?: string | null
          therapist_profile_id?: string | null
          therapist_registration?: Json
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_issuer_snapshots_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_practice_profile_id_fkey"
            columns: ["practice_profile_id"]
            isOneToOne: false
            referencedRelation: "practice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_issuer_snapshots_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          adjustment_amount: number
          change_reason: string | null
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          differs_from_source: boolean
          discount_amount: number
          icd10_code: string | null
          id: string
          invoice_id: string
          line_order: number
          line_subtotal: number
          line_total: number
          line_type: string
          metadata: Json
          practice_location_id: string | null
          procedure_code: string | null
          procedure_name: string
          quantity: number
          service_date: string | null
          source_booking_procedure_id: string | null
          source_price_list_item_id: string | null
          source_session_procedure_id: string | null
          tax_amount: number
          tax_rate: number
          tenant_id: string
          therapist_profile_id: string | null
          unit_price: number
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          adjustment_amount?: number
          change_reason?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          differs_from_source?: boolean
          discount_amount?: number
          icd10_code?: string | null
          id?: string
          invoice_id: string
          line_order?: number
          line_subtotal?: number
          line_total?: number
          line_type?: string
          metadata?: Json
          practice_location_id?: string | null
          procedure_code?: string | null
          procedure_name: string
          quantity?: number
          service_date?: string | null
          source_booking_procedure_id?: string | null
          source_price_list_item_id?: string | null
          source_session_procedure_id?: string | null
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          therapist_profile_id?: string | null
          unit_price?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          adjustment_amount?: number
          change_reason?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          differs_from_source?: boolean
          discount_amount?: number
          icd10_code?: string | null
          id?: string
          invoice_id?: string
          line_order?: number
          line_subtotal?: number
          line_total?: number
          line_type?: string
          metadata?: Json
          practice_location_id?: string | null
          procedure_code?: string | null
          procedure_name?: string
          quantity?: number
          service_date?: string | null
          source_booking_procedure_id?: string | null
          source_price_list_item_id?: string | null
          source_session_procedure_id?: string | null
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          therapist_profile_id?: string | null
          unit_price?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_source_booking_procedure_id_fkey"
            columns: ["source_booking_procedure_id"]
            isOneToOne: false
            referencedRelation: "booking_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_source_price_list_item_id_fkey"
            columns: ["source_price_list_item_id"]
            isOneToOne: false
            referencedRelation: "price_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_source_session_procedure_id_fkey"
            columns: ["source_session_procedure_id"]
            isOneToOne: false
            referencedRelation: "session_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_number_sequences: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          metadata: Json
          next_number: number
          padding_length: number
          prefix: string
          reset_strategy: string
          sequence_key: string
          suffix: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          next_number?: number
          padding_length?: number
          prefix?: string
          reset_strategy?: string
          sequence_key?: string
          suffix?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          next_number?: number
          padding_length?: number
          prefix?: string
          reset_strategy?: string
          sequence_key?: string
          suffix?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_number_sequences_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_number_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_number_sequences_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_party_snapshots: {
        Row: {
          billing_address: Json
          billing_email: string | null
          billing_phone: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          invoice_id: string
          medical_aid_context: Json
          organisation_name: string | null
          patient_date_of_birth: string | null
          patient_full_name: string
          patient_icd10_code: string | null
          patient_id: string | null
          patient_id_number: string | null
          patient_number: string | null
          relationship_to_patient: string | null
          responsible_party_id: string | null
          responsible_party_id_number: string | null
          responsible_party_name: string | null
          responsible_party_type: string | null
          snapshot: Json
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          billing_address?: Json
          billing_email?: string | null
          billing_phone?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          invoice_id: string
          medical_aid_context?: Json
          organisation_name?: string | null
          patient_date_of_birth?: string | null
          patient_full_name: string
          patient_icd10_code?: string | null
          patient_id?: string | null
          patient_id_number?: string | null
          patient_number?: string | null
          relationship_to_patient?: string | null
          responsible_party_id?: string | null
          responsible_party_id_number?: string | null
          responsible_party_name?: string | null
          responsible_party_type?: string | null
          snapshot?: Json
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          billing_address?: Json
          billing_email?: string | null
          billing_phone?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          invoice_id?: string
          medical_aid_context?: Json
          organisation_name?: string | null
          patient_date_of_birth?: string | null
          patient_full_name?: string
          patient_icd10_code?: string | null
          patient_id?: string | null
          patient_id_number?: string | null
          patient_number?: string | null
          relationship_to_patient?: string | null
          responsible_party_id?: string | null
          responsible_party_id_number?: string | null
          responsible_party_name?: string | null
          responsible_party_type?: string | null
          snapshot?: Json
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_party_snapshots_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_party_snapshots_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_party_snapshots_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_party_snapshots_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_party_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_party_snapshots_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_status_history: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          event_reason: string | null
          event_type: string
          from_status: string | null
          id: string
          invoice_id: string
          is_patient_visible: boolean
          metadata: Json
          patient_id: string | null
          session_id: string | null
          tenant_id: string
          to_status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          invoice_id: string
          is_patient_visible?: boolean
          metadata?: Json
          patient_id?: string | null
          session_id?: string | null
          tenant_id: string
          to_status: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          invoice_id?: string
          is_patient_visible?: boolean
          metadata?: Json
          patient_id?: string | null
          session_id?: string | null
          tenant_id?: string
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_workflow_events: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          error_message: string | null
          event_status: string
          event_type: string
          failed_at: string | null
          id: string
          idempotency_key: string
          invoice_id: string
          patient_id: string | null
          payload: Json
          processed_at: string | null
          session_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          invoice_id: string
          patient_id?: string | null
          payload?: Json
          processed_at?: string | null
          session_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string
          patient_id?: string | null
          payload?: Json
          processed_at?: string | null
          session_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_workflow_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_workflow_events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_workflow_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_workflow_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_workflow_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          adjustment_total: number
          amount_paid: number
          balance_due: number
          booking_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          collection_status: string
          confirmed_at: string | null
          confirmed_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          differs_from_source: boolean
          discount_total: number
          draft_created_at: string
          draft_reference: string
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          invoice_prefix: string | null
          invoice_sequence_key: string | null
          invoice_sequence_number: number | null
          invoice_status: string
          issued_at: string | null
          issued_by_profile_id: string | null
          last_payment_at: string | null
          manual_edit_reason: string | null
          manually_edited: boolean
          metadata: Json
          overdue_since: string | null
          patient_id: string
          patient_link_update_ready: boolean
          patient_link_visible: boolean
          payment_reconciliation_status: string
          payment_status: string
          payment_terms_days: number
          practice_location_id: string | null
          ready_to_confirm_at: string | null
          reconciliation_reason: string | null
          reconciliation_required: boolean
          responsible_party_id: string | null
          review_required_at: string | null
          review_required_reason: string | null
          rounding_adjustment: number
          service_date: string | null
          session_id: string | null
          session_reopened_at: string | null
          source_type: string
          source_workflow_event_id: string | null
          subtotal_amount: number
          tax_total: number
          taxable_amount: number
          tenant_id: string
          therapist_profile_id: string | null
          total_amount: number
          updated_at: string
          updated_by_profile_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by_profile_id: string | null
        }
        Insert: {
          adjustment_total?: number
          amount_paid?: number
          balance_due?: number
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          collection_status?: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          differs_from_source?: boolean
          discount_total?: number
          draft_created_at?: string
          draft_reference: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_prefix?: string | null
          invoice_sequence_key?: string | null
          invoice_sequence_number?: number | null
          invoice_status?: string
          issued_at?: string | null
          issued_by_profile_id?: string | null
          last_payment_at?: string | null
          manual_edit_reason?: string | null
          manually_edited?: boolean
          metadata?: Json
          overdue_since?: string | null
          patient_id: string
          patient_link_update_ready?: boolean
          patient_link_visible?: boolean
          payment_reconciliation_status?: string
          payment_status?: string
          payment_terms_days?: number
          practice_location_id?: string | null
          ready_to_confirm_at?: string | null
          reconciliation_reason?: string | null
          reconciliation_required?: boolean
          responsible_party_id?: string | null
          review_required_at?: string | null
          review_required_reason?: string | null
          rounding_adjustment?: number
          service_date?: string | null
          session_id?: string | null
          session_reopened_at?: string | null
          source_type?: string
          source_workflow_event_id?: string | null
          subtotal_amount?: number
          tax_total?: number
          taxable_amount?: number
          tenant_id: string
          therapist_profile_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by_profile_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by_profile_id?: string | null
        }
        Update: {
          adjustment_total?: number
          amount_paid?: number
          balance_due?: number
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          collection_status?: string
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          differs_from_source?: boolean
          discount_total?: number
          draft_created_at?: string
          draft_reference?: string
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_prefix?: string | null
          invoice_sequence_key?: string | null
          invoice_sequence_number?: number | null
          invoice_status?: string
          issued_at?: string | null
          issued_by_profile_id?: string | null
          last_payment_at?: string | null
          manual_edit_reason?: string | null
          manually_edited?: boolean
          metadata?: Json
          overdue_since?: string | null
          patient_id?: string
          patient_link_update_ready?: boolean
          patient_link_visible?: boolean
          payment_reconciliation_status?: string
          payment_status?: string
          payment_terms_days?: number
          practice_location_id?: string | null
          ready_to_confirm_at?: string | null
          reconciliation_reason?: string | null
          reconciliation_required?: boolean
          responsible_party_id?: string | null
          review_required_at?: string | null
          review_required_reason?: string | null
          rounding_adjustment?: number
          service_date?: string | null
          session_id?: string | null
          session_reopened_at?: string | null
          source_type?: string
          source_workflow_event_id?: string | null
          subtotal_amount?: number
          tax_total?: number
          taxable_amount?: number
          tenant_id?: string
          therapist_profile_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by_profile_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_confirmed_by_profile_id_fkey"
            columns: ["confirmed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_by_profile_id_fkey"
            columns: ["issued_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_workflow_event_id_fkey"
            columns: ["source_workflow_event_id"]
            isOneToOne: false
            referencedRelation: "session_workflow_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_voided_by_profile_id_fkey"
            columns: ["voided_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_measure_definitions: {
        Row: {
          active_definition_version_id: string | null
          created_at: string
          created_by_profile_id: string | null
          definition_owner_type: string
          definition_scope: string
          definition_status: string
          deleted_at: string | null
          description: string | null
          discipline_tags: string[]
          effective_from: string | null
          effective_until: string | null
          encounter_type_availability: string[]
          id: string
          interpretation_rules: Json
          is_licensed_definition: boolean
          is_restricted_definition: boolean
          is_system_definition: boolean
          licence_metadata: Json
          lock_version: number
          measure_key: string
          measure_schema: Json
          metadata: Json
          name: string
          profession_restrictions: string[]
          retired_at: string | null
          retired_by_profile_id: string | null
          retirement_reason: string | null
          scoring_method: string | null
          session_type_availability: string[]
          supports_clinician_administered: boolean
          supports_imported_results: boolean
          supports_patient_reported: boolean
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          version_label: string | null
        }
        Insert: {
          active_definition_version_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          definition_owner_type?: string
          definition_scope?: string
          definition_status?: string
          deleted_at?: string | null
          description?: string | null
          discipline_tags?: string[]
          effective_from?: string | null
          effective_until?: string | null
          encounter_type_availability?: string[]
          id?: string
          interpretation_rules?: Json
          is_licensed_definition?: boolean
          is_restricted_definition?: boolean
          is_system_definition?: boolean
          licence_metadata?: Json
          lock_version?: number
          measure_key: string
          measure_schema?: Json
          metadata?: Json
          name: string
          profession_restrictions?: string[]
          retired_at?: string | null
          retired_by_profile_id?: string | null
          retirement_reason?: string | null
          scoring_method?: string | null
          session_type_availability?: string[]
          supports_clinician_administered?: boolean
          supports_imported_results?: boolean
          supports_patient_reported?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          version_label?: string | null
        }
        Update: {
          active_definition_version_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          definition_owner_type?: string
          definition_scope?: string
          definition_status?: string
          deleted_at?: string | null
          description?: string | null
          discipline_tags?: string[]
          effective_from?: string | null
          effective_until?: string | null
          encounter_type_availability?: string[]
          id?: string
          interpretation_rules?: Json
          is_licensed_definition?: boolean
          is_restricted_definition?: boolean
          is_system_definition?: boolean
          licence_metadata?: Json
          lock_version?: number
          measure_key?: string
          measure_schema?: Json
          metadata?: Json
          name?: string
          profession_restrictions?: string[]
          retired_at?: string | null
          retired_by_profile_id?: string | null
          retirement_reason?: string | null
          scoring_method?: string | null
          session_type_availability?: string[]
          supports_clinician_administered?: boolean
          supports_imported_results?: boolean
          supports_patient_reported?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_measure_definitions_active_version_fk"
            columns: ["active_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "outcome_measure_definitions_active_version_fk"
            columns: ["active_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_definitions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_definitions_retired_by_profile_id_fkey"
            columns: ["retired_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_definitions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_measure_results: {
        Row: {
          amended_at: string | null
          amended_by_profile_id: string | null
          assessment_definition_version_id: string | null
          assessor_therapist_profile_id: string | null
          calculated_at: string | null
          calculated_by_profile_id: string | null
          calculation_rule_key: string | null
          calculation_status: string
          calculation_version: number | null
          clinical_assessment_id: string | null
          clinical_encounter_id: string | null
          clinical_visibility: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          interpretation_band_id: string | null
          interpreted_score: string | null
          invalidated_at: string | null
          invalidated_by_profile_id: string | null
          invalidation_reason: string | null
          lock_version: number
          metadata: Json
          missing_item_count: number
          normalised_score: number | null
          numeric_score: number | null
          outcome_measure_definition_id: string | null
          partial_score: boolean
          patient_id: string
          patient_visible_allowed: boolean
          percentage_score: number | null
          practitioner_interpretation_id: string | null
          raw_score: number | null
          response_set: Json
          result_date: string | null
          result_key: string | null
          result_label: string | null
          result_status: string
          score_type: string
          score_unit: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          amended_at?: string | null
          amended_by_profile_id?: string | null
          assessment_definition_version_id?: string | null
          assessor_therapist_profile_id?: string | null
          calculated_at?: string | null
          calculated_by_profile_id?: string | null
          calculation_rule_key?: string | null
          calculation_status?: string
          calculation_version?: number | null
          clinical_assessment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_visibility?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          interpretation_band_id?: string | null
          interpreted_score?: string | null
          invalidated_at?: string | null
          invalidated_by_profile_id?: string | null
          invalidation_reason?: string | null
          lock_version?: number
          metadata?: Json
          missing_item_count?: number
          normalised_score?: number | null
          numeric_score?: number | null
          outcome_measure_definition_id?: string | null
          partial_score?: boolean
          patient_id: string
          patient_visible_allowed?: boolean
          percentage_score?: number | null
          practitioner_interpretation_id?: string | null
          raw_score?: number | null
          response_set?: Json
          result_date?: string | null
          result_key?: string | null
          result_label?: string | null
          result_status?: string
          score_type?: string
          score_unit?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          amended_at?: string | null
          amended_by_profile_id?: string | null
          assessment_definition_version_id?: string | null
          assessor_therapist_profile_id?: string | null
          calculated_at?: string | null
          calculated_by_profile_id?: string | null
          calculation_rule_key?: string | null
          calculation_status?: string
          calculation_version?: number | null
          clinical_assessment_id?: string | null
          clinical_encounter_id?: string | null
          clinical_visibility?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          interpretation_band_id?: string | null
          interpreted_score?: string | null
          invalidated_at?: string | null
          invalidated_by_profile_id?: string | null
          invalidation_reason?: string | null
          lock_version?: number
          metadata?: Json
          missing_item_count?: number
          normalised_score?: number | null
          numeric_score?: number | null
          outcome_measure_definition_id?: string | null
          partial_score?: boolean
          patient_id?: string
          patient_visible_allowed?: boolean
          percentage_score?: number | null
          practitioner_interpretation_id?: string | null
          raw_score?: number | null
          response_set?: Json
          result_date?: string | null
          result_key?: string | null
          result_label?: string | null
          result_status?: string
          score_type?: string
          score_unit?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_measure_results_amended_by_profile_id_fkey"
            columns: ["amended_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_assessor_therapist_profile_id_fkey"
            columns: ["assessor_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_calculated_by_profile_id_fkey"
            columns: ["calculated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_clinical_assessment_id_fkey"
            columns: ["clinical_assessment_id"]
            isOneToOne: false
            referencedRelation: "clinical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_clinical_encounter_id_fkey"
            columns: ["clinical_encounter_id"]
            isOneToOne: false
            referencedRelation: "clinical_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_definition_version_fk"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["assessment_definition_version_id"]
          },
          {
            foreignKeyName: "outcome_measure_results_definition_version_fk"
            columns: ["assessment_definition_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_interpretation_band_fk"
            columns: ["interpretation_band_id"]
            isOneToOne: false
            referencedRelation: "assessment_interpretation_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_invalidated_by_profile_id_fkey"
            columns: ["invalidated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definition_usage_summary"
            referencedColumns: ["outcome_measure_definition_id"]
          },
          {
            foreignKeyName: "outcome_measure_results_outcome_measure_definition_id_fkey"
            columns: ["outcome_measure_definition_id"]
            isOneToOne: false
            referencedRelation: "outcome_measure_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_practitioner_interpretation_fk"
            columns: ["practitioner_interpretation_id"]
            isOneToOne: false
            referencedRelation: "assessment_practitioner_interpretations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_measure_results_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_addresses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          address_owner_type: string
          address_type: string
          city: string | null
          country: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          is_primary: boolean
          metadata: Json
          patient_id: string | null
          postal_code: string | null
          province: string | null
          responsible_party_id: string | null
          suburb: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          address_owner_type: string
          address_type?: string
          city?: string | null
          country?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          metadata?: Json
          patient_id?: string | null
          postal_code?: string | null
          province?: string | null
          responsible_party_id?: string | null
          suburb?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          address_owner_type?: string
          address_type?: string
          city?: string | null
          country?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_primary?: boolean
          metadata?: Json
          patient_id?: string | null
          postal_code?: string | null
          province?: string | null
          responsible_party_id?: string | null
          suburb?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_addresses_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_addresses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_addresses_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_addresses_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_alerts: {
        Row: {
          alert_type: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_patient_visible: boolean
          metadata: Json
          patient_id: string
          resolved_at: string | null
          resolved_by_profile_id: string | null
          severity: string
          tenant_id: string
          title: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_patient_visible?: boolean
          metadata?: Json
          patient_id: string
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          severity?: string
          tenant_id: string
          title: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_patient_visible?: boolean
          metadata?: Json
          patient_id?: string
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          severity?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_alerts_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_resolved_by_profile_id_fkey"
            columns: ["resolved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_alerts_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          accepted_at: string | null
          consent_status: string
          consent_text: string | null
          consent_type: string
          consent_version: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          metadata: Json
          patient_id: string
          responsible_party_id: string | null
          revoked_at: string | null
          signature_url: string | null
          signed_by_name: string | null
          signed_by_relationship: string | null
          source: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          consent_status?: string
          consent_text?: string | null
          consent_type: string
          consent_version?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          patient_id: string
          responsible_party_id?: string | null
          revoked_at?: string | null
          signature_url?: string | null
          signed_by_name?: string | null
          signed_by_relationship?: string | null
          source?: string
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          consent_status?: string
          consent_text?: string | null
          consent_type?: string
          consent_version?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          patient_id?: string
          responsible_party_id?: string | null
          revoked_at?: string | null
          signature_url?: string | null
          signed_by_name?: string | null
          signed_by_relationship?: string | null
          source?: string
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_emergency_contacts: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          metadata: Json
          notes: string | null
          patient_id: string
          phone: string
          relationship_to_patient: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          metadata?: Json
          notes?: string | null
          patient_id: string
          phone: string
          relationship_to_patient?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          metadata?: Json
          notes?: string | null
          patient_id?: string
          phone?: string
          relationship_to_patient?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_emergency_contacts_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_emergency_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_emergency_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_emergency_contacts_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_history_events: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          event_body: string | null
          event_title: string
          event_type: string
          id: string
          is_patient_visible: boolean
          metadata: Json
          occurred_at: string
          patient_id: string
          patient_visible_body: string | null
          patient_visible_title: string | null
          source_id: string | null
          source_table: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_body?: string | null
          event_title: string
          event_type: string
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          occurred_at?: string
          patient_id: string
          patient_visible_body?: string | null
          patient_visible_title?: string | null
          source_id?: string | null
          source_table?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_body?: string | null
          event_title?: string
          event_type?: string
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          occurred_at?: string
          patient_id?: string
          patient_visible_body?: string | null
          patient_visible_title?: string | null
          source_id?: string | null
          source_table?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_history_events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_history_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_history_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_link_access_grants: {
        Row: {
          access_status: string
          access_type: string
          appointments_visible: boolean
          authority_confirmed_at: string | null
          consent_acknowledged_at: string | null
          contact_destination_hash: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          documents_visible: boolean
          finance_visible: boolean
          id: string
          last_used_at: string | null
          metadata: Json
          patient_id: string
          patient_link_id: string
          responsible_party_id: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by_profile_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          access_status?: string
          access_type: string
          appointments_visible?: boolean
          authority_confirmed_at?: string | null
          consent_acknowledged_at?: string | null
          contact_destination_hash?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          documents_visible?: boolean
          finance_visible?: boolean
          id?: string
          last_used_at?: string | null
          metadata?: Json
          patient_id: string
          patient_link_id: string
          responsible_party_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          access_status?: string
          access_type?: string
          appointments_visible?: boolean
          authority_confirmed_at?: string | null
          consent_acknowledged_at?: string | null
          contact_destination_hash?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          documents_visible?: boolean
          finance_visible?: boolean
          id?: string
          last_used_at?: string | null
          metadata?: Json
          patient_id?: string
          patient_link_id?: string
          responsible_party_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by_profile_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_link_access_grants_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_grants_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_grants_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_grants_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_grants_revoked_by_profile_id_fkey"
            columns: ["revoked_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_grants_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_link_access_logs: {
        Row: {
          access_grant_id: string | null
          created_at: string
          event_status: string
          event_type: string
          failure_reason: string | null
          id: string
          ip_address_hash: string | null
          metadata: Json
          occurred_at: string
          patient_id: string | null
          patient_link_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          suspicious: boolean
          tenant_id: string
          user_agent_hash: string | null
        }
        Insert: {
          access_grant_id?: string | null
          created_at?: string
          event_status?: string
          event_type: string
          failure_reason?: string | null
          id?: string
          ip_address_hash?: string | null
          metadata?: Json
          occurred_at?: string
          patient_id?: string | null
          patient_link_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          suspicious?: boolean
          tenant_id: string
          user_agent_hash?: string | null
        }
        Update: {
          access_grant_id?: string | null
          created_at?: string
          event_status?: string
          event_type?: string
          failure_reason?: string | null
          id?: string
          ip_address_hash?: string | null
          metadata?: Json
          occurred_at?: string
          patient_id?: string | null
          patient_link_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          suspicious?: boolean
          tenant_id?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_link_access_logs_access_grant_id_fkey"
            columns: ["access_grant_id"]
            isOneToOne: false
            referencedRelation: "patient_link_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_logs_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "patient_link_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_link_sessions: {
        Row: {
          access_grant_id: string | null
          created_at: string
          created_from_challenge_id: string | null
          deleted_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          ip_address_hash: string | null
          last_activity_at: string | null
          metadata: Json
          patient_id: string
          patient_link_id: string
          revocation_reason: string | null
          revoked_at: string | null
          session_status: string
          session_token_hash: string
          tenant_id: string
          updated_at: string
          user_agent: string | null
          user_agent_hash: string | null
        }
        Insert: {
          access_grant_id?: string | null
          created_at?: string
          created_from_challenge_id?: string | null
          deleted_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          ip_address_hash?: string | null
          last_activity_at?: string | null
          metadata?: Json
          patient_id: string
          patient_link_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          session_status?: string
          session_token_hash: string
          tenant_id: string
          updated_at?: string
          user_agent?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          access_grant_id?: string | null
          created_at?: string
          created_from_challenge_id?: string | null
          deleted_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          ip_address_hash?: string | null
          last_activity_at?: string | null
          metadata?: Json
          patient_id?: string
          patient_link_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          session_status?: string
          session_token_hash?: string
          tenant_id?: string
          updated_at?: string
          user_agent?: string | null
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_link_sessions_access_grant_id_fkey"
            columns: ["access_grant_id"]
            isOneToOne: false
            referencedRelation: "patient_link_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_sessions_created_from_challenge_id_fkey"
            columns: ["created_from_challenge_id"]
            isOneToOne: false
            referencedRelation: "patient_link_verification_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_sessions_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_link_verification_challenges: {
        Row: {
          access_grant_id: string | null
          attempts_count: number
          challenge_status: string
          code_salt: string
          consumed_at: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          delivery_method: string
          destination_hash: string | null
          expires_at: string
          id: string
          last_attempt_at: string | null
          max_attempts: number
          metadata: Json
          patient_link_id: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
          verification_code_hash: string
        }
        Insert: {
          access_grant_id?: string | null
          attempts_count?: number
          challenge_status?: string
          code_salt?: string
          consumed_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          delivery_method: string
          destination_hash?: string | null
          expires_at: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          metadata?: Json
          patient_link_id: string
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
          verification_code_hash: string
        }
        Update: {
          access_grant_id?: string | null
          attempts_count?: number
          challenge_status?: string
          code_salt?: string
          consumed_at?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          delivery_method?: string
          destination_hash?: string | null
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          metadata?: Json
          patient_link_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
          verification_code_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_link_verification_challenges_access_grant_id_fkey"
            columns: ["access_grant_id"]
            isOneToOne: false
            referencedRelation: "patient_link_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_verification_challenges_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_verification_challenges_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_verification_challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_verification_challenges_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_link_workflow_events: {
        Row: {
          access_grant_id: string | null
          available_at: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          error_message: string | null
          event_status: string
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          patient_id: string | null
          patient_link_id: string | null
          payload: Json
          processed_at: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          access_grant_id?: string | null
          available_at?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          patient_id?: string | null
          patient_link_id?: string | null
          payload?: Json
          processed_at?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          access_grant_id?: string | null
          available_at?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          patient_id?: string | null
          patient_link_id?: string | null
          payload?: Json
          processed_at?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_link_workflow_events_access_grant_id_fkey"
            columns: ["access_grant_id"]
            isOneToOne: false
            referencedRelation: "patient_link_access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_workflow_events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_workflow_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_workflow_events_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_link_workflow_events_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_links: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          credential_hash: string
          credential_reset_at: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          intake_completed_at: string | null
          intake_started_at: string | null
          last_accessed_at: string | null
          link_status: string
          link_token: string
          metadata: Json
          patient_id: string
          public_identifier: string
          replaced_by_patient_link_id: string | null
          requires_intake: boolean
          revoked_at: string | null
          suspended_at: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          credential_hash: string
          credential_reset_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          intake_completed_at?: string | null
          intake_started_at?: string | null
          last_accessed_at?: string | null
          link_status?: string
          link_token: string
          metadata?: Json
          patient_id: string
          public_identifier: string
          replaced_by_patient_link_id?: string | null
          requires_intake?: boolean
          revoked_at?: string | null
          suspended_at?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          credential_hash?: string
          credential_reset_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          intake_completed_at?: string | null
          intake_started_at?: string | null
          last_accessed_at?: string | null
          link_status?: string
          link_token?: string
          metadata?: Json
          patient_id?: string
          public_identifier?: string
          replaced_by_patient_link_id?: string | null
          requires_intake?: boolean
          revoked_at?: string | null
          suspended_at?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_links_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_replaced_by_patient_link_id_fkey"
            columns: ["replaced_by_patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_links_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medical_information: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          current_medication: string | null
          deleted_at: string | null
          has_medical_aid: boolean
          id: string
          main_member_id_number: string | null
          main_member_name: string | null
          medical_aid_dependant_code: string | null
          medical_aid_name: string | null
          medical_aid_number: string | null
          medical_aid_plan: string | null
          medical_conditions: string | null
          medical_notes: string | null
          metadata: Json
          patient_id: string
          referring_practice: string | null
          referring_professional: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          current_medication?: string | null
          deleted_at?: string | null
          has_medical_aid?: boolean
          id?: string
          main_member_id_number?: string | null
          main_member_name?: string | null
          medical_aid_dependant_code?: string | null
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          medical_aid_plan?: string | null
          medical_conditions?: string | null
          medical_notes?: string | null
          metadata?: Json
          patient_id: string
          referring_practice?: string | null
          referring_professional?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          current_medication?: string | null
          deleted_at?: string | null
          has_medical_aid?: boolean
          id?: string
          main_member_id_number?: string | null
          main_member_name?: string | null
          medical_aid_dependant_code?: string | null
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          medical_aid_plan?: string | null
          medical_conditions?: string | null
          medical_notes?: string | null
          metadata?: Json
          patient_id?: string
          referring_practice?: string | null
          referring_professional?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medical_information_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medical_information_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medical_information_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medical_information_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          active_icd10_code: string | null
          archive_reason: string | null
          archived_at: string | null
          assigned_therapist_profile_id: string | null
          created_at: string
          created_by_profile_id: string | null
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          id_number: string | null
          intake_completed_at: string | null
          intake_sent_at: string | null
          intake_started_at: string | null
          language: string | null
          last_name: string
          merged_into_patient_id: string | null
          metadata: Json
          patient_number: string | null
          patient_status: string
          patient_type: string
          phone: string | null
          preferred_name: string | null
          referral_source: string | null
          reviewed_at: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          active_icd10_code?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          assigned_therapist_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          intake_completed_at?: string | null
          intake_sent_at?: string | null
          intake_started_at?: string | null
          language?: string | null
          last_name: string
          merged_into_patient_id?: string | null
          metadata?: Json
          patient_number?: string | null
          patient_status?: string
          patient_type?: string
          phone?: string | null
          preferred_name?: string | null
          referral_source?: string | null
          reviewed_at?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          active_icd10_code?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          assigned_therapist_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          intake_completed_at?: string | null
          intake_sent_at?: string | null
          intake_started_at?: string | null
          language?: string | null
          last_name?: string
          merged_into_patient_id?: string | null
          metadata?: Json
          patient_number?: string | null
          patient_status?: string
          patient_type?: string
          phone?: string | null
          preferred_name?: string | null
          referral_source?: string | null
          reviewed_at?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_assigned_therapist_profile_id_fkey"
            columns: ["assigned_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_merged_into_patient_id_fkey"
            columns: ["merged_into_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          allocated_at: string
          allocated_by_profile_id: string | null
          allocation_order: number
          allocation_status: string
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          financial_account_id: string | null
          id: string
          idempotency_key: string | null
          invoice_id: string
          metadata: Json
          patient_id: string | null
          payment_id: string
          responsible_party_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          allocated_amount: number
          allocated_at?: string
          allocated_by_profile_id?: string | null
          allocation_order?: number
          allocation_status?: string
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          financial_account_id?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id: string
          metadata?: Json
          patient_id?: string | null
          payment_id: string
          responsible_party_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          allocated_amount?: number
          allocated_at?: string
          allocated_by_profile_id?: string | null
          allocation_order?: number
          allocation_status?: string
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          financial_account_id?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string
          metadata?: Json
          patient_id?: string | null
          payment_id?: string
          responsible_party_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_allocated_by_profile_id_fkey"
            columns: ["allocated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_reversed_by_profile_id_fkey"
            columns: ["reversed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_status_history: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          event_reason: string | null
          event_type: string
          financial_account_id: string | null
          from_status: string | null
          id: string
          metadata: Json
          patient_id: string | null
          payment_id: string
          responsible_party_id: string | null
          tenant_id: string
          to_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type: string
          financial_account_id?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json
          patient_id?: string | null
          payment_id: string
          responsible_party_id?: string | null
          tenant_id: string
          to_status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type?: string
          financial_account_id?: string | null
          from_status?: string | null
          id?: string
          metadata?: Json
          patient_id?: string | null
          payment_id?: string
          responsible_party_id?: string | null
          tenant_id?: string
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_status_history_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_workflow_events: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          error_message: string | null
          event_status: string
          event_type: string
          failed_at: string | null
          financial_account_id: string | null
          id: string
          idempotency_key: string
          invoice_id: string | null
          patient_id: string | null
          payload: Json
          payment_allocation_id: string | null
          payment_id: string | null
          processed_at: string | null
          receipt_id: string | null
          responsible_party_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type: string
          failed_at?: string | null
          financial_account_id?: string | null
          id?: string
          idempotency_key: string
          invoice_id?: string | null
          patient_id?: string | null
          payload?: Json
          payment_allocation_id?: string | null
          payment_id?: string | null
          processed_at?: string | null
          receipt_id?: string | null
          responsible_party_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type?: string
          failed_at?: string | null
          financial_account_id?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string | null
          patient_id?: string | null
          payload?: Json
          payment_allocation_id?: string | null
          payment_id?: string | null
          processed_at?: string | null
          receipt_id?: string | null
          responsible_party_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_workflow_events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_payment_allocation_id_fkey"
            columns: ["payment_allocation_id"]
            isOneToOne: false
            referencedRelation: "payment_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          allocated_amount: number
          amount: number
          bank_account_id: string | null
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          external_transaction_reference: string | null
          financial_account_id: string | null
          id: string
          metadata: Json
          notes: string | null
          patient_id: string | null
          payer_email: string | null
          payer_name: string
          payer_phone: string | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
          payment_status: string
          practice_location_id: string | null
          primary_invoice_id: string | null
          proof_document_id: string | null
          reconciliation_status: string
          recorded_by_profile_id: string | null
          refund_ready: boolean
          responsible_party_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          tenant_id: string
          therapist_profile_id: string | null
          unallocated_amount: number
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          allocated_amount?: number
          amount: number
          bank_account_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          external_transaction_reference?: string | null
          financial_account_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          patient_id?: string | null
          payer_email?: string | null
          payer_name: string
          payer_phone?: string | null
          payment_date?: string
          payment_method: string
          payment_reference?: string | null
          payment_status?: string
          practice_location_id?: string | null
          primary_invoice_id?: string | null
          proof_document_id?: string | null
          reconciliation_status?: string
          recorded_by_profile_id?: string | null
          refund_ready?: boolean
          responsible_party_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          tenant_id: string
          therapist_profile_id?: string | null
          unallocated_amount?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          allocated_amount?: number
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          external_transaction_reference?: string | null
          financial_account_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          patient_id?: string | null
          payer_email?: string | null
          payer_name?: string
          payer_phone?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          practice_location_id?: string | null
          primary_invoice_id?: string | null
          proof_document_id?: string | null
          reconciliation_status?: string
          recorded_by_profile_id?: string | null
          refund_ready?: boolean
          responsible_party_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          tenant_id?: string
          therapist_profile_id?: string | null
          unallocated_amount?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_primary_invoice_id_fkey"
            columns: ["primary_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_proof_document_id_fkey"
            columns: ["proof_document_id"]
            isOneToOne: false
            referencedRelation: "document_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reversed_by_profile_id_fkey"
            columns: ["reversed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_configurations: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_branding: {
        Row: {
          accent_colour: string | null
          communication_branding_enabled: boolean
          created_at: string
          deleted_at: string | null
          document_branding_enabled: boolean
          id: string
          invoice_logo_position: string
          logo_url: string | null
          metadata: Json
          patient_facing_display_name: string | null
          patient_link_branding_enabled: boolean
          practice_profile_id: string | null
          primary_colour: string | null
          secondary_colour: string | null
          statement_logo_position: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent_colour?: string | null
          communication_branding_enabled?: boolean
          created_at?: string
          deleted_at?: string | null
          document_branding_enabled?: boolean
          id?: string
          invoice_logo_position?: string
          logo_url?: string | null
          metadata?: Json
          patient_facing_display_name?: string | null
          patient_link_branding_enabled?: boolean
          practice_profile_id?: string | null
          primary_colour?: string | null
          secondary_colour?: string | null
          statement_logo_position?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent_colour?: string | null
          communication_branding_enabled?: boolean
          created_at?: string
          deleted_at?: string | null
          document_branding_enabled?: boolean
          id?: string
          invoice_logo_position?: string
          logo_url?: string | null
          metadata?: Json
          patient_facing_display_name?: string | null
          patient_link_branding_enabled?: boolean
          practice_profile_id?: string | null
          primary_colour?: string | null
          secondary_colour?: string | null
          statement_logo_position?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_branding_practice_profile_id_fkey"
            columns: ["practice_profile_id"]
            isOneToOne: false
            referencedRelation: "practice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_main_location: boolean
          location_name: string
          location_type: string
          metadata: Json
          postal_code: string | null
          practice_profile_id: string | null
          province: string | null
          room_venue_notes: string | null
          suburb: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_main_location?: boolean
          location_name: string
          location_type?: string
          metadata?: Json
          postal_code?: string | null
          practice_profile_id?: string | null
          province?: string | null
          room_venue_notes?: string | null
          suburb?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_main_location?: boolean
          location_name?: string
          location_type?: string
          metadata?: Json
          postal_code?: string | null
          practice_profile_id?: string | null
          province?: string | null
          room_venue_notes?: string | null
          suburb?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_locations_practice_profile_id_fkey"
            columns: ["practice_profile_id"]
            isOneToOne: false
            referencedRelation: "practice_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_profiles: {
        Row: {
          business_registration_number: string | null
          created_at: string
          default_country: string
          default_currency: string
          default_time_zone: string
          deleted_at: string | null
          id: string
          legal_name: string | null
          main_email: string | null
          main_phone: string | null
          metadata: Json
          profile_status: string
          tax_number: string | null
          tenant_id: string
          trading_name: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          business_registration_number?: string | null
          created_at?: string
          default_country?: string
          default_currency?: string
          default_time_zone?: string
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          main_email?: string | null
          main_phone?: string | null
          metadata?: Json
          profile_status?: string
          tax_number?: string | null
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          business_registration_number?: string | null
          created_at?: string
          default_country?: string
          default_currency?: string
          default_time_zone?: string
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          main_email?: string | null
          main_phone?: string | null
          metadata?: Json
          profile_status?: string
          tax_number?: string | null
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          metadata: Json
          price: number
          price_list_id: string
          procedure_code: string | null
          procedure_name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          price?: number
          price_list_id: string
          procedure_code?: string | null
          procedure_name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          price?: number
          price_list_id?: string
          procedure_code?: string | null
          procedure_name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          list_type: string | null
          metadata: Json
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          list_type?: string | null
          metadata?: Json
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          list_type?: string | null
          metadata?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_registrations: {
        Row: {
          country: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          metadata: Json
          registration_body: string
          registration_number: string
          registration_type: string | null
          tenant_id: string
          therapist_profile_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json
          registration_body: string
          registration_number: string
          registration_type?: string | null
          tenant_id: string
          therapist_profile_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          metadata?: Json
          registration_body?: string
          registration_number?: string
          registration_type?: string | null
          tenant_id?: string
          therapist_profile_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_registrations_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_super_admin: boolean
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_super_admin?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_super_admin?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipt_number_sequences: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          metadata: Json
          next_number: number
          padding_length: number
          prefix: string
          reset_strategy: string
          sequence_key: string
          suffix: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          next_number?: number
          padding_length?: number
          prefix?: string
          reset_strategy?: string
          sequence_key?: string
          suffix?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          next_number?: number
          padding_length?: number
          prefix?: string
          reset_strategy?: string
          sequence_key?: string
          suffix?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_number_sequences_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_number_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_number_sequences_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          allocation_snapshot: Json
          communication_ready: boolean
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          financial_account_id: string | null
          id: string
          invoice_issuer_snapshot_id: string | null
          issued_at: string
          issued_by_profile_id: string | null
          issuer_snapshot: Json
          metadata: Json
          patient_id: string | null
          patient_link_ready: boolean
          payer_snapshot: Json
          payment_amount: number
          payment_id: string
          payment_method: string | null
          payment_reference: string | null
          pdf_generation_ready: boolean
          receipt_date: string
          receipt_number: string
          receipt_prefix: string | null
          receipt_sequence_key: string | null
          receipt_sequence_number: number | null
          receipt_status: string
          responsible_party_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          allocation_snapshot?: Json
          communication_ready?: boolean
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          financial_account_id?: string | null
          id?: string
          invoice_issuer_snapshot_id?: string | null
          issued_at?: string
          issued_by_profile_id?: string | null
          issuer_snapshot?: Json
          metadata?: Json
          patient_id?: string | null
          patient_link_ready?: boolean
          payer_snapshot?: Json
          payment_amount: number
          payment_id: string
          payment_method?: string | null
          payment_reference?: string | null
          pdf_generation_ready?: boolean
          receipt_date?: string
          receipt_number: string
          receipt_prefix?: string | null
          receipt_sequence_key?: string | null
          receipt_sequence_number?: number | null
          receipt_status?: string
          responsible_party_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          allocation_snapshot?: Json
          communication_ready?: boolean
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          financial_account_id?: string | null
          id?: string
          invoice_issuer_snapshot_id?: string | null
          issued_at?: string
          issued_by_profile_id?: string | null
          issuer_snapshot?: Json
          metadata?: Json
          patient_id?: string | null
          patient_link_ready?: boolean
          payer_snapshot?: Json
          payment_amount?: number
          payment_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          pdf_generation_ready?: boolean
          receipt_date?: string
          receipt_number?: string
          receipt_prefix?: string | null
          receipt_sequence_key?: string | null
          receipt_sequence_number?: number | null
          receipt_status?: string
          responsible_party_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_issuer_snapshot_id_fkey"
            columns: ["invoice_issuer_snapshot_id"]
            isOneToOne: false
            referencedRelation: "invoice_issuer_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_issued_by_profile_id_fkey"
            columns: ["issued_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_reversed_by_profile_id_fkey"
            columns: ["reversed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      responsible_parties: {
        Row: {
          account_responsibility_status: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          is_billing_contact: boolean
          is_primary: boolean
          medical_aid_dependant_code: string | null
          medical_aid_member_number: string | null
          metadata: Json
          organisation_name: string | null
          party_type: string
          patient_id: string
          phone: string | null
          relationship_to_patient: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          account_responsibility_status?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          is_billing_contact?: boolean
          is_primary?: boolean
          medical_aid_dependant_code?: string | null
          medical_aid_member_number?: string | null
          metadata?: Json
          organisation_name?: string | null
          party_type?: string
          patient_id: string
          phone?: string | null
          relationship_to_patient?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          account_responsibility_status?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_billing_contact?: boolean
          is_primary?: boolean
          medical_aid_dependant_code?: string | null
          medical_aid_member_number?: string | null
          metadata?: Json
          organisation_name?: string | null
          party_type?: string
          patient_id?: string
          phone?: string | null
          relationship_to_patient?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsible_parties_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsible_parties_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsible_parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsible_parties_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          body: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          id: string
          metadata: Json
          note_type: string
          session_id: string
          tenant_id: string
          title: string | null
          updated_at: string
          updated_by_profile_id: string | null
          visibility: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          note_type?: string
          session_id: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          note_type?: string
          session_id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_procedures: {
        Row: {
          adjustment_amount: number
          booking_procedure_id: string | null
          change_reason: string | null
          created_at: string
          created_by_profile_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          differs_from_booking: boolean
          discount_amount: number
          duration_minutes: number | null
          id: string
          is_billable: boolean
          line_total: number
          metadata: Json
          price_list_id: string | null
          price_list_item_id: string | null
          procedure_code: string | null
          procedure_name: string
          quantity: number
          session_id: string
          tenant_id: string
          unit_price: number
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          adjustment_amount?: number
          booking_procedure_id?: string | null
          change_reason?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          differs_from_booking?: boolean
          discount_amount?: number
          duration_minutes?: number | null
          id?: string
          is_billable?: boolean
          line_total?: number
          metadata?: Json
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_code?: string | null
          procedure_name: string
          quantity?: number
          session_id: string
          tenant_id: string
          unit_price?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          adjustment_amount?: number
          booking_procedure_id?: string | null
          change_reason?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          differs_from_booking?: boolean
          discount_amount?: number
          duration_minutes?: number | null
          id?: string
          is_billable?: boolean
          line_total?: number
          metadata?: Json
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_code?: string | null
          procedure_name?: string
          quantity?: number
          session_id?: string
          tenant_id?: string
          unit_price?: number
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_procedures_booking_procedure_id_fkey"
            columns: ["booking_procedure_id"]
            isOneToOne: false
            referencedRelation: "booking_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_procedures_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_procedures_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_procedures_price_list_item_id_fkey"
            columns: ["price_list_item_id"]
            isOneToOne: false
            referencedRelation: "price_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_procedures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_procedures_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_status_history: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          booking_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          event_reason: string | null
          event_type: string
          from_status: string | null
          id: string
          is_patient_visible: boolean
          metadata: Json
          patient_id: string | null
          session_id: string
          tenant_id: string
          to_status: string
          updated_at: string
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          patient_id?: string | null
          session_id: string
          tenant_id: string
          to_status: string
          updated_at?: string
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          event_reason?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          is_patient_visible?: boolean
          metadata?: Json
          patient_id?: string | null
          session_id?: string
          tenant_id?: string
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_status_history_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_status_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_status_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_workflow_events: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          error_message: string | null
          event_status: string
          event_type: string
          failed_at: string | null
          id: string
          idempotency_key: string
          patient_id: string | null
          payload: Json
          processed_at: string | null
          session_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          patient_id?: string | null
          payload?: Json
          processed_at?: string | null
          session_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          event_status?: string
          event_type?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          patient_id?: string | null
          payload?: Json
          processed_at?: string | null
          session_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_workflow_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_workflow_events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_workflow_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_workflow_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_workflow_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_duration_minutes: number | null
          actual_end_at: string | null
          actual_start_at: string | null
          attendance_outcome: string
          booking_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          completed_at: string | null
          completed_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          draft_invoice_request_status: string
          draft_invoice_requested_at: string | null
          id: string
          metadata: Json
          no_show_at: string | null
          operational_summary: string | null
          patient_history_ready: boolean
          patient_id: string
          patient_link_update_ready: boolean
          practice_location_id: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by_profile_id: string | null
          room_label: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          session_modality: string
          session_outcome: string | null
          session_status: string
          session_type: string
          tenant_id: string
          therapist_profile_id: string | null
          timezone: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          actual_end_at?: string | null
          actual_start_at?: string | null
          attendance_outcome?: string
          booking_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          draft_invoice_request_status?: string
          draft_invoice_requested_at?: string | null
          id?: string
          metadata?: Json
          no_show_at?: string | null
          operational_summary?: string | null
          patient_history_ready?: boolean
          patient_id: string
          patient_link_update_ready?: boolean
          practice_location_id?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by_profile_id?: string | null
          room_label?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          session_modality?: string
          session_outcome?: string | null
          session_status?: string
          session_type?: string
          tenant_id: string
          therapist_profile_id?: string | null
          timezone?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          actual_end_at?: string | null
          actual_start_at?: string | null
          attendance_outcome?: string
          booking_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          draft_invoice_request_status?: string
          draft_invoice_requested_at?: string | null
          id?: string
          metadata?: Json
          no_show_at?: string | null
          operational_summary?: string | null
          patient_history_ready?: boolean
          patient_id?: string
          patient_link_update_ready?: boolean
          practice_location_id?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by_profile_id?: string | null
          room_label?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          session_modality?: string
          session_outcome?: string | null
          session_status?: string
          session_type?: string
          tenant_id?: string
          therapist_profile_id?: string | null
          timezone?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_cancelled_by_profile_id_fkey"
            columns: ["cancelled_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_completed_by_profile_id_fkey"
            columns: ["completed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_reopened_by_profile_id_fkey"
            columns: ["reopened_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_profile_id_fkey"
            columns: ["therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_tasks: {
        Row: {
          assigned_profile_id: string | null
          assigned_role: string | null
          booking_id: string | null
          completed_at: string | null
          completed_by_profile_id: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          patient_id: string | null
          patient_link_id: string | null
          payment_id: string | null
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          session_id: string | null
          source_workflow_execution_id: string | null
          status: string
          task_type: string
          tenant_id: string
          title: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          assigned_profile_id?: string | null
          assigned_role?: string | null
          booking_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          patient_id?: string | null
          patient_link_id?: string | null
          payment_id?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          session_id?: string | null
          source_workflow_execution_id?: string | null
          status?: string
          task_type?: string
          tenant_id: string
          title: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          assigned_profile_id?: string | null
          assigned_role?: string | null
          booking_id?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          patient_id?: string | null
          patient_link_id?: string | null
          payment_id?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          session_id?: string | null
          source_workflow_execution_id?: string | null
          status?: string
          task_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_assigned_profile_id_fkey"
            columns: ["assigned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_completed_by_profile_id_fkey"
            columns: ["completed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_source_workflow_execution_id_fkey"
            columns: ["source_workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          metadata: Json
          plan_code: string
          plan_name: string
          price_monthly: number | null
          updated_at: string
          user_max: number | null
          user_min: number | null
        }
        Insert: {
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json
          plan_code: string
          plan_name: string
          price_monthly?: number | null
          updated_at?: string
          user_max?: number | null
          user_min?: number | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          metadata?: Json
          plan_code?: string
          plan_name?: string
          price_monthly?: number | null
          updated_at?: string
          user_max?: number | null
          user_min?: number | null
        }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_ends_at: string | null
          current_period_starts_at: string | null
          deleted_at: string | null
          id: string
          metadata: Json
          next_billing_date: string | null
          subscription_plan_id: string | null
          subscription_status: string
          tenant_id: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          next_billing_date?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string
          tenant_id: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json
          next_billing_date?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          activated_at: string | null
          created_at: string
          deactivated_at: string | null
          deleted_at: string | null
          id: string
          invited_at: string | null
          is_active: boolean
          profile_id: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          deleted_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean
          profile_id: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          deleted_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean
          profile_id?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          company_registration_number: string | null
          country: string
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          practice_name: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          tenant_status: string
          time_zone: string
          trading_name: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          company_registration_number?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          practice_name: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          tenant_status?: string
          time_zone?: string
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          company_registration_number?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          practice_name?: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          tenant_status?: string
          time_zone?: string
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      therapist_profiles: {
        Row: {
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          bio: string | null
          created_at: string
          default_appointment_duration_minutes: number | null
          default_billing_rate: number | null
          deleted_at: string | null
          display_name: string
          id: string
          is_active: boolean
          metadata: Json
          practice_number: string | null
          profession: string | null
          qualifications: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          bio?: string | null
          created_at?: string
          default_appointment_duration_minutes?: number | null
          default_billing_rate?: number | null
          deleted_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          metadata?: Json
          practice_number?: string | null
          profession?: string | null
          qualifications?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          bio?: string | null
          created_at?: string
          default_appointment_duration_minutes?: number | null
          default_billing_rate?: number | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          practice_number?: string | null
          profession?: string | null
          qualifications?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapist_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          clinical_focus: string | null
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          lock_version: number
          metadata: Json
          patient_id: string
          patient_visible_allowed: boolean
          plan_status: string
          plan_title: string
          responsible_therapist_profile_id: string | null
          review_due_date: string | null
          start_date: string | null
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          clinical_focus?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          lock_version?: number
          metadata?: Json
          patient_id: string
          patient_visible_allowed?: boolean
          plan_status?: string
          plan_title: string
          responsible_therapist_profile_id?: string | null
          review_due_date?: string | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          clinical_focus?: string | null
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          lock_version?: number
          metadata?: Json
          patient_id?: string
          patient_visible_allowed?: boolean
          plan_status?: string
          plan_title?: string
          responsible_therapist_profile_id?: string | null
          review_due_date?: string | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_responsible_therapist_profile_id_fkey"
            columns: ["responsible_therapist_profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_requests: {
        Row: {
          action_type: string
          attempt_count: number
          available_at: string
          booking_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          error_summary: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          invoice_id: string | null
          locked_at: string | null
          locked_by: string | null
          patient_id: string | null
          patient_link_id: string | null
          payload: Json
          payment_id: string | null
          responsible_party_id: string | null
          session_id: string | null
          status: string
          target_entity_id: string | null
          target_entity_type: string | null
          tenant_id: string
          updated_at: string
          workflow_execution_id: string | null
          workflow_step_execution_id: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number
          available_at?: string
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          invoice_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          patient_id?: string | null
          patient_link_id?: string | null
          payload?: Json
          payment_id?: string | null
          responsible_party_id?: string | null
          session_id?: string | null
          status?: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          tenant_id: string
          updated_at?: string
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number
          available_at?: string
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          patient_id?: string | null
          patient_link_id?: string | null
          payload?: Json
          payment_id?: string | null
          responsible_party_id?: string | null
          session_id?: string | null
          status?: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          tenant_id?: string
          updated_at?: string
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_action_requests_workflow_step_execution_id_fkey"
            columns: ["workflow_step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_dead_letters: {
        Row: {
          attempt_count: number
          created_at: string
          dead_lettered_at: string
          deleted_at: string | null
          error_code: string | null
          error_summary: string
          failure_class: string
          first_failed_at: string
          id: string
          last_failed_at: string
          outbox_event_id: string | null
          resolution_notes: string | null
          resolution_status: string
          resolved_at: string | null
          resolved_by_profile_id: string | null
          retry_count: number
          safe_context: Json
          tenant_id: string
          updated_at: string
          workflow_definition_id: string | null
          workflow_definition_version_id: string | null
          workflow_execution_id: string | null
          workflow_step_execution_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          dead_lettered_at?: string
          deleted_at?: string | null
          error_code?: string | null
          error_summary: string
          failure_class?: string
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          outbox_event_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          retry_count?: number
          safe_context?: Json
          tenant_id: string
          updated_at?: string
          workflow_definition_id?: string | null
          workflow_definition_version_id?: string | null
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          dead_lettered_at?: string
          deleted_at?: string | null
          error_code?: string | null
          error_summary?: string
          failure_class?: string
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          outbox_event_id?: string | null
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          retry_count?: number
          safe_context?: Json
          tenant_id?: string
          updated_at?: string
          workflow_definition_id?: string | null
          workflow_definition_version_id?: string | null
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_dead_letters_outbox_event_id_fkey"
            columns: ["outbox_event_id"]
            isOneToOne: false
            referencedRelation: "workflow_event_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letters_resolved_by_profile_id_fkey"
            columns: ["resolved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letters_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letters_workflow_definition_version_id_fkey"
            columns: ["workflow_definition_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letters_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_dead_letters_workflow_step_execution_id_fkey"
            columns: ["workflow_step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definition_versions: {
        Row: {
          action_config: Json
          condition_config: Json
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          published_at: string | null
          published_by_profile_id: string | null
          status: string
          tenant_id: string | null
          timezone_strategy: string
          trigger_config: Json
          trigger_event_type: string | null
          trigger_type: string
          updated_at: string
          validation_metadata: Json
          version_number: number
          workflow_definition_id: string
        }
        Insert: {
          action_config?: Json
          condition_config?: Json
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          published_at?: string | null
          published_by_profile_id?: string | null
          status?: string
          tenant_id?: string | null
          timezone_strategy?: string
          trigger_config?: Json
          trigger_event_type?: string | null
          trigger_type: string
          updated_at?: string
          validation_metadata?: Json
          version_number: number
          workflow_definition_id: string
        }
        Update: {
          action_config?: Json
          condition_config?: Json
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          published_at?: string | null
          published_by_profile_id?: string | null
          status?: string
          tenant_id?: string | null
          timezone_strategy?: string
          trigger_config?: Json
          trigger_event_type?: string | null
          trigger_type?: string
          updated_at?: string
          validation_metadata?: Json
          version_number?: number
          workflow_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definition_versions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definition_versions_published_by_profile_id_fkey"
            columns: ["published_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definition_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definition_versions_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          active_version_id: string | null
          category: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_system_workflow: boolean
          metadata: Json
          name: string
          status: string
          tenant_clone_allowed: boolean
          tenant_disable_allowed: boolean
          tenant_id: string | null
          updated_at: string
          updated_by_profile_id: string | null
          workflow_key: string
          workflow_owner_type: string
        }
        Insert: {
          active_version_id?: string | null
          category?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system_workflow?: boolean
          metadata?: Json
          name: string
          status?: string
          tenant_clone_allowed?: boolean
          tenant_disable_allowed?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          workflow_key: string
          workflow_owner_type?: string
        }
        Update: {
          active_version_id?: string | null
          category?: string
          created_at?: string
          created_by_profile_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_system_workflow?: boolean
          metadata?: Json
          name?: string
          status?: string
          tenant_clone_allowed?: boolean
          tenant_disable_allowed?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by_profile_id?: string | null
          workflow_key?: string
          workflow_owner_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_active_version_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_event_outbox: {
        Row: {
          actor_profile_id: string | null
          attempt_count: number
          available_at: string
          booking_id: string | null
          causation_id: string | null
          completed_at: string | null
          correlation_id: string
          created_at: string
          dead_lettered_at: string | null
          deleted_at: string | null
          event_type: string
          event_version: number
          failed_at: string | null
          id: string
          idempotency_key: string
          invoice_id: string | null
          last_error_code: string | null
          last_error_summary: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          patient_id: string | null
          patient_link_id: string | null
          payload: Json
          payment_id: string | null
          priority: number
          processing_status: string
          responsible_party_id: string | null
          session_id: string | null
          source_domain: string
          source_event_id: string | null
          source_record_id: string | null
          source_table: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actor_profile_id?: string | null
          attempt_count?: number
          available_at?: string
          booking_id?: string | null
          causation_id?: string | null
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          dead_lettered_at?: string | null
          deleted_at?: string | null
          event_type: string
          event_version?: number
          failed_at?: string | null
          id?: string
          idempotency_key: string
          invoice_id?: string | null
          last_error_code?: string | null
          last_error_summary?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          patient_id?: string | null
          patient_link_id?: string | null
          payload?: Json
          payment_id?: string | null
          priority?: number
          processing_status?: string
          responsible_party_id?: string | null
          session_id?: string | null
          source_domain: string
          source_event_id?: string | null
          source_record_id?: string | null
          source_table: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actor_profile_id?: string | null
          attempt_count?: number
          available_at?: string
          booking_id?: string | null
          causation_id?: string | null
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          dead_lettered_at?: string | null
          deleted_at?: string | null
          event_type?: string
          event_version?: number
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          invoice_id?: string | null
          last_error_code?: string | null
          last_error_summary?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          patient_id?: string | null
          patient_link_id?: string | null
          payload?: Json
          payment_id?: string | null
          priority?: number
          processing_status?: string
          responsible_party_id?: string | null
          session_id?: string | null
          source_domain?: string
          source_event_id?: string | null
          source_record_id?: string | null
          source_table?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_event_outbox_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_patient_link_id_fkey"
            columns: ["patient_link_id"]
            isOneToOne: false
            referencedRelation: "patient_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_event_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          attempt_count: number
          cancelled_at: string | null
          cancelled_reason: string | null
          causation_id: string | null
          completed_at: string | null
          correlation_id: string
          created_at: string
          current_step_key: string | null
          deleted_at: string | null
          error_classification: string | null
          error_summary: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          next_retry_at: string | null
          started_at: string | null
          status: string
          tenant_id: string
          trigger_type: string
          triggering_outbox_event_id: string | null
          updated_at: string
          workflow_definition_id: string
          workflow_definition_version_id: string
        }
        Insert: {
          attempt_count?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          causation_id?: string | null
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          current_step_key?: string | null
          deleted_at?: string | null
          error_classification?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          next_retry_at?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          trigger_type: string
          triggering_outbox_event_id?: string | null
          updated_at?: string
          workflow_definition_id: string
          workflow_definition_version_id: string
        }
        Update: {
          attempt_count?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          causation_id?: string | null
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          current_step_key?: string | null
          deleted_at?: string | null
          error_classification?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          next_retry_at?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          trigger_type?: string
          triggering_outbox_event_id?: string | null
          updated_at?: string
          workflow_definition_id?: string
          workflow_definition_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_triggering_outbox_event_id_fkey"
            columns: ["triggering_outbox_event_id"]
            isOneToOne: false
            referencedRelation: "workflow_event_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_definition_version_id_fkey"
            columns: ["workflow_definition_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_definition_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_scheduled_jobs: {
        Row: {
          attempt_count: number
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string
          job_type: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string | null
          priority: number
          scheduled_for: string
          source_outbox_event_id: string | null
          status: string
          superseded_by_job_id: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          tenant_id: string
          timezone: string
          updated_at: string
          workflow_execution_id: string | null
          workflow_step_execution_id: string | null
        }
        Insert: {
          attempt_count?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key: string
          job_type: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string | null
          priority?: number
          scheduled_for: string
          source_outbox_event_id?: string | null
          status?: string
          superseded_by_job_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Update: {
          attempt_count?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string
          job_type?: string
          locked_at?: string | null
          locked_by?: string | null
          next_retry_at?: string | null
          priority?: number
          scheduled_for?: string
          source_outbox_event_id?: string | null
          status?: string
          superseded_by_job_id?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
          workflow_execution_id?: string | null
          workflow_step_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_scheduled_jobs_source_outbox_event_id_fkey"
            columns: ["source_outbox_event_id"]
            isOneToOne: false
            referencedRelation: "workflow_event_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_scheduled_jobs_superseded_by_job_id_fkey"
            columns: ["superseded_by_job_id"]
            isOneToOne: false
            referencedRelation: "workflow_scheduled_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_scheduled_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_scheduled_jobs_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_scheduled_jobs_workflow_step_execution_id_fkey"
            columns: ["workflow_step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          action_type: string
          attempt_count: number
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          error_classification: string | null
          error_summary: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          input_summary: Json
          next_retry_at: string | null
          output_summary: Json
          started_at: string | null
          status: string
          step_key: string
          step_order: number
          tenant_id: string
          updated_at: string
          workflow_definition_version_id: string
          workflow_execution_id: string
        }
        Insert: {
          action_type: string
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_classification?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          input_summary?: Json
          next_retry_at?: string | null
          output_summary?: Json
          started_at?: string | null
          status?: string
          step_key: string
          step_order?: number
          tenant_id: string
          updated_at?: string
          workflow_definition_version_id: string
          workflow_execution_id: string
        }
        Update: {
          action_type?: string
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          error_classification?: string | null
          error_summary?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          input_summary?: Json
          next_retry_at?: string | null
          output_summary?: Json
          started_at?: string | null
          status?: string
          step_key?: string
          step_order?: number
          tenant_id?: string
          updated_at?: string
          workflow_definition_version_id?: string
          workflow_execution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_workflow_definition_version_id_fkey"
            columns: ["workflow_definition_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_definition_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assessment_definition_usage_summary: {
        Row: {
          active_assignment_count: number | null
          assessment_count: number | null
          assessment_definition_version_id: string | null
          completed_count: number | null
          draft_count: number | null
          finalised_count: number | null
          first_used_at: string | null
          invalidated_count: number | null
          last_used_at: string | null
          measure_key: string | null
          name: string | null
          outcome_measure_definition_id: string | null
          tenant_id: string | null
          version_number: number | null
          version_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_measure_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_template_usage_summary: {
        Row: {
          active_assignment_count: number | null
          clinical_note_template_id: string | null
          clinical_note_template_version_id: string | null
          first_used_at: string | null
          last_used_at: string | null
          name: string | null
          note_count: number | null
          template_key: string | null
          tenant_id: string | null
          version_number: number | null
          version_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_workflow_version: {
        Args: { target_version_id: string }
        Returns: string
      }
      allocate_payment: {
        Args: { allocations: Json; target_payment_id: string }
        Returns: {
          allocated_amount: number
          payment_id: string
          payment_status: string
          unallocated_amount: number
        }[]
      }
      amend_clinical_assessment: {
        Args: {
          amendment_reason_input: string
          corrected_snapshot_input?: Json
          target_clinical_assessment_id: string
          target_record_id_input?: string
          target_record_type_input?: string
        }
        Returns: string
      }
      amend_clinical_note: {
        Args: {
          amendment_free_text_input?: string
          amendment_reason_input: string
          amendment_structured_content_input?: Json
          target_clinical_note_id: string
          target_note_version_id: string
        }
        Returns: string
      }
      apply_payment_allocations: {
        Args: { allocations: Json; target_payment_id: string }
        Returns: undefined
      }
      archive_document_file: {
        Args: { archive_reason_input: string; target_document_file_id: string }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by_profile_id: string | null
          bucket_id: string
          checksum_sha256: string | null
          clinical_attachment_id: string | null
          clinical_encounter_id: string | null
          clinical_note_id: string | null
          content_type: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          document_category: string
          document_status: string
          file_size_bytes: number
          id: string
          invoice_id: string | null
          metadata: Json
          object_path: string
          original_filename: string
          patient_id: string | null
          patient_link_shared_at: string | null
          patient_link_shared_by_profile_id: string | null
          patient_link_visible: boolean
          payment_id: string | null
          practice_branding_id: string | null
          practice_profile_id: string | null
          receipt_id: string | null
          responsible_party_id: string | null
          safe_filename: string
          sharing_scope: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
          upload_completed_at: string | null
          upload_intent_created_at: string
          uploaded_by_profile_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "document_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_assessment_definition_version_is_draft: {
        Args: { target_definition_version_id: string }
        Returns: undefined
      }
      assert_clinical_template_version_is_draft: {
        Args: { target_template_version_id: string }
        Returns: undefined
      }
      assessment_definition_version_is_available_for_tenant: {
        Args: { target_definition_version_id: string; target_tenant_id: string }
        Returns: boolean
      }
      assessment_response_value_is_valid: {
        Args: {
          item_record: Database["public"]["Tables"]["assessment_definition_items"]["Row"]
          response_payload: Json
        }
        Returns: boolean
      }
      can_create_document_file: {
        Args: { target_category: string; target_tenant_id: string }
        Returns: boolean
      }
      can_manage_document_file: {
        Args: { target_document_file_id: string }
        Returns: boolean
      }
      can_read_document_file: {
        Args: { target_document_file_id: string }
        Returns: boolean
      }
      cancel_workflow_execution: {
        Args: { cancellation_reason_input: string; target_execution_id: string }
        Returns: string
      }
      cancel_workflow_scheduled_job: {
        Args: { cancellation_reason_input: string; target_job_id: string }
        Returns: string
      }
      claim_workflow_outbox_events: {
        Args: { batch_size?: number; worker_id_input: string }
        Returns: {
          actor_profile_id: string | null
          attempt_count: number
          available_at: string
          booking_id: string | null
          causation_id: string | null
          completed_at: string | null
          correlation_id: string
          created_at: string
          dead_lettered_at: string | null
          deleted_at: string | null
          event_type: string
          event_version: number
          failed_at: string | null
          id: string
          idempotency_key: string
          invoice_id: string | null
          last_error_code: string | null
          last_error_summary: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          patient_id: string | null
          patient_link_id: string | null
          payload: Json
          payment_id: string | null
          priority: number
          processing_status: string
          responsible_party_id: string | null
          session_id: string | null
          source_domain: string
          source_event_id: string | null
          source_record_id: string | null
          source_table: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_event_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_workflow_scheduled_jobs: {
        Args: { batch_size?: number; worker_id_input: string }
        Returns: {
          attempt_count: number
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string
          job_type: string
          locked_at: string | null
          locked_by: string | null
          next_retry_at: string | null
          priority: number
          scheduled_for: string
          source_outbox_event_id: string | null
          status: string
          superseded_by_job_id: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          tenant_id: string
          timezone: string
          updated_at: string
          workflow_execution_id: string | null
          workflow_step_execution_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_scheduled_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      clinical_response_value_type_for_field: {
        Args: { field_type_input: string }
        Returns: string
      }
      clinical_template_version_is_available_for_context: {
        Args: {
          target_encounter_id?: string
          target_template_version_id: string
          target_tenant_id: string
        }
        Returns: boolean
      }
      complete_clinical_assessment: {
        Args: { target_clinical_assessment_id: string }
        Returns: string
      }
      complete_session: {
        Args: {
          actual_end_at_input: string
          actual_start_at_input: string
          attendance_outcome_input: string
          operational_summary_input?: string
          session_outcome_input: string
          target_session_id: string
        }
        Returns: {
          completed_session: boolean
          draft_invoice_requested: boolean
          session_id: string
          session_status: string
        }[]
      }
      complete_workflow_outbox_event: {
        Args: { target_outbox_id: string; worker_id_input: string }
        Returns: string
      }
      confirm_invoice: {
        Args: { target_invoice_id: string }
        Returns: {
          confirmed_invoice: boolean
          invoice_id: string
          invoice_number: string
          invoice_status: string
        }[]
      }
      copy_forward_clinical_response: {
        Args: {
          copy_reason_input?: string
          idempotency_key_input?: string
          source_response_id_input: string
          target_note_version_id: string
          target_template_field_id: string
        }
        Returns: string
      }
      create_assessment_definition_version_from: {
        Args: {
          change_reason_input?: string
          source_definition_version_id: string
        }
        Returns: string
      }
      create_clinical_assessment_draft: {
        Args: {
          assessment_definition_version_id_input: string
          assessment_phase_input?: string
          booking_id_input?: string
          clinical_encounter_id_input?: string
          clinical_goal_id_input?: string
          idempotency_key_input?: string
          session_id_input?: string
          target_patient_id: string
          target_tenant_id: string
          treatment_plan_id_input?: string
        }
        Returns: {
          assessment_draft_state_id: string
          clinical_assessment_id: string
        }[]
      }
      create_clinical_note_draft: {
        Args: {
          clinical_encounter_id_input?: string
          clinical_note_template_version_id_input?: string
          clinical_visibility_input?: string
          free_text_content_input?: string
          idempotency_key_input?: string
          is_restricted_input?: boolean
          note_title_input?: string
          note_type_input?: string
          patient_visible_allowed_input?: boolean
          structured_content_input?: Json
          target_patient_id: string
          target_tenant_id: string
        }
        Returns: {
          clinical_note_id: string
          clinical_note_version_id: string
        }[]
      }
      create_clinical_template_draft: {
        Args: {
          default_note_type_input?: string
          description_input?: string
          discipline_tags_input?: string[]
          idempotency_key_input?: string
          target_tenant_id: string
          template_key_input: string
          template_name_input: string
        }
        Returns: {
          clinical_note_template_id: string
          clinical_note_template_version_id: string
        }[]
      }
      create_clinical_template_version_from: {
        Args: {
          change_reason_input?: string
          source_template_version_id: string
        }
        Returns: string
      }
      create_document_upload_intent: {
        Args: {
          content_type_input: string
          file_size_bytes_input: number
          metadata_input?: Json
          original_filename_input: string
          sharing_scope_input?: string
          target_bucket_id: string
          target_clinical_note_id?: string
          target_document_category: string
          target_invoice_id?: string
          target_patient_id: string
          target_payment_id?: string
          target_practice_branding_id?: string
          target_practice_profile_id?: string
          target_tenant_id: string
        }
        Returns: {
          allowed_content_types: string[]
          bucket_id: string
          document_file_id: string
          max_file_size_bytes: number
          object_path: string
        }[]
      }
      create_draft_invoice_from_session: {
        Args: { target_session_id: string }
        Returns: {
          created_invoice: boolean
          invoice_id: string
          invoice_status: string
        }[]
      }
      create_or_get_patient_link: {
        Args: { target_patient_id: string }
        Returns: {
          created_link: boolean
          link_status: string
          patient_link_id: string
          public_identifier: string
        }[]
      }
      create_outcome_measure_definition_draft: {
        Args: {
          definition_name_input: string
          description_input?: string
          discipline_tags_input?: string[]
          idempotency_key_input?: string
          measure_key_input: string
          response_mode_input?: string
          target_tenant_id: string
        }
        Returns: {
          assessment_definition_version_id: string
          outcome_measure_definition_id: string
        }[]
      }
      create_patient_link_session: {
        Args: {
          expires_in_minutes?: number
          ip_address_input?: unknown
          session_token_input: string
          target_challenge_id: string
          user_agent_input?: string
        }
        Returns: {
          expires_at: string
          session_id: string
          session_status: string
        }[]
      }
      create_receipt_for_payment: {
        Args: { target_payment_id: string }
        Returns: string
      }
      create_session_from_booking: {
        Args: { target_booking_id: string }
        Returns: {
          created_session: boolean
          session_id: string
          session_status: string
        }[]
      }
      document_file_path_matches_metadata: {
        Args: {
          target_bucket_id: string
          target_category: string
          target_document_id: string
          target_object_path: string
          target_patient_id: string
          target_safe_filename: string
          target_tenant_id: string
        }
        Returns: boolean
      }
      duplicate_clinical_template: {
        Args: {
          idempotency_key_input?: string
          new_template_key_input: string
          new_template_name_input: string
          source_template_version_id: string
          target_tenant_id: string
        }
        Returns: {
          clinical_note_template_id: string
          clinical_note_template_version_id: string
        }[]
      }
      enqueue_workflow_event: {
        Args: {
          actor_profile_id_input?: string
          available_at_input?: string
          booking_id_input?: string
          causation_id_input?: string
          correlation_id_input?: string
          event_type_input: string
          event_version_input?: number
          idempotency_key_input: string
          invoice_id_input?: string
          patient_id_input?: string
          patient_link_id_input?: string
          payload_input?: Json
          payment_id_input?: string
          priority_input?: number
          responsible_party_id_input?: string
          session_id_input?: string
          source_domain_input: string
          source_event_id_input: string
          source_record_id_input: string
          source_table_input: string
          target_tenant_id: string
        }
        Returns: string
      }
      fail_workflow_outbox_event: {
        Args: {
          error_code_input: string
          error_summary_input: string
          retryable_input?: boolean
          target_outbox_id: string
          worker_id_input: string
        }
        Returns: string
      }
      finalise_clinical_assessment: {
        Args: { target_clinical_assessment_id: string }
        Returns: string
      }
      finalise_clinical_note_version: {
        Args: { target_note_version_id: string }
        Returns: string
      }
      finalise_document_upload: {
        Args: { target_document_file_id: string }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by_profile_id: string | null
          bucket_id: string
          checksum_sha256: string | null
          clinical_attachment_id: string | null
          clinical_encounter_id: string | null
          clinical_note_id: string | null
          content_type: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          document_category: string
          document_status: string
          file_size_bytes: number
          id: string
          invoice_id: string | null
          metadata: Json
          object_path: string
          original_filename: string
          patient_id: string | null
          patient_link_shared_at: string | null
          patient_link_shared_by_profile_id: string | null
          patient_link_visible: boolean
          payment_id: string | null
          practice_branding_id: string | null
          practice_profile_id: string | null
          receipt_id: string | null
          responsible_party_id: string | null
          safe_filename: string
          sharing_scope: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
          upload_completed_at: string | null
          upload_intent_created_at: string
          uploaded_by_profile_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "document_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_document_file_max_size: {
        Args: { target_bucket_id: string }
        Returns: number
      }
      get_patient_link_portal_data: {
        Args: {
          selected_public_identifier?: string
          session_token_input: string
          target_public_identifier: string
        }
        Returns: Json
      }
      get_patient_link_public_context: {
        Args: { target_public_identifier: string }
        Returns: Json
      }
      get_patient_link_shared_documents: {
        Args: { session_token_input: string; target_public_identifier: string }
        Returns: Json
      }
      has_assessment_permission: {
        Args: { action_key: string; target_tenant_id: string }
        Returns: boolean
      }
      has_clinical_template_management_permission: {
        Args: { action_key: string; target_tenant_id: string }
        Returns: boolean
      }
      has_tenant_role: {
        Args: { allowed_roles: string[]; target_tenant_id: string }
        Returns: boolean
      }
      hash_patient_link_secret: {
        Args: { salt_input?: string; secret_input: string }
        Returns: string
      }
      is_allowed_document_content_type: {
        Args: { target_bucket_id: string; target_content_type: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { target_tenant_id: string }; Returns: boolean }
      issue_invoice: {
        Args: { target_invoice_id: string }
        Returns: {
          invoice_id: string
          invoice_status: string
          issued_at: string
          issued_invoice: boolean
        }[]
      }
      log_patient_link_portal_access: {
        Args: {
          event_type_input: string
          resource_id_input?: string
          resource_type_input?: string
          session_token_input: string
          target_public_identifier: string
        }
        Returns: Json
      }
      publish_assessment_definition_version: {
        Args: { target_definition_version_id: string }
        Returns: string
      }
      publish_clinical_record_to_patient_link: {
        Args: {
          patient_link_id_input?: string
          safe_summary_input?: string
          safe_title_input: string
          target_record_id: string
          target_record_type: string
        }
        Returns: string
      }
      publish_clinical_template_version: {
        Args: { target_template_version_id: string }
        Returns: string
      }
      recalculate_invoice_payment_balance: {
        Args: { target_invoice_id: string }
        Returns: undefined
      }
      recalculate_invoice_totals: {
        Args: { target_invoice_id: string }
        Returns: undefined
      }
      recalculate_payment_allocation_totals: {
        Args: { target_payment_id: string }
        Returns: undefined
      }
      record_payment: {
        Args: {
          allocations_input?: Json
          amount_input: number
          bank_account_id_input?: string
          currency_code_input: string
          external_transaction_reference_input?: string
          financial_account_id_input: string
          notes_input?: string
          patient_id_input: string
          payer_name_input: string
          payment_date_input: string
          payment_method_input: string
          payment_reference_input?: string
          practice_location_id_input?: string
          primary_invoice_id_input: string
          responsible_party_id_input: string
          target_tenant_id: string
          therapist_profile_id_input?: string
        }
        Returns: {
          allocated_amount: number
          payment_id: string
          payment_status: string
          receipt_id: string
          unallocated_amount: number
        }[]
      }
      reopen_completed_session: {
        Args: { reopen_reason_input: string; target_session_id: string }
        Returns: {
          reopened_session: boolean
          session_id: string
          session_status: string
        }[]
      }
      request_patient_link_public_verification: {
        Args: {
          delivery_method_input: string
          expires_in_minutes?: number
          target_public_identifier: string
        }
        Returns: Json
      }
      request_patient_link_verification: {
        Args: {
          access_grant_id_input: string
          delivery_method_input: string
          destination_hash_input: string
          expires_in_minutes?: number
          target_public_identifier: string
          verification_code_input: string
        }
        Returns: {
          challenge_id: string
          challenge_status: string
          expires_at: string
        }[]
      }
      reset_patient_link_credentials: {
        Args: { target_patient_link_id: string }
        Returns: {
          credential_reset_at: string
          patient_link_id: string
          public_identifier: string
          reset_credentials: boolean
        }[]
      }
      retire_assessment_definition_version: {
        Args: {
          retirement_reason_input?: string
          target_definition_version_id: string
        }
        Returns: string
      }
      retire_clinical_template_version: {
        Args: {
          retirement_reason_input?: string
          target_template_version_id: string
        }
        Returns: string
      }
      retry_workflow_dead_letter: {
        Args: { target_dead_letter_id: string }
        Returns: string
      }
      reverse_payment: {
        Args: { reversal_reason_input: string; target_payment_id: string }
        Returns: {
          payment_id: string
          payment_status: string
          reversed_payment: boolean
        }[]
      }
      revoke_clinical_patient_link_publication: {
        Args: { revoke_reason_input?: string; target_publication_id: string }
        Returns: string
      }
      revoke_patient_link_session: {
        Args: { revocation_reason_input?: string; target_session_token: string }
        Returns: {
          revoked: boolean
          session_id: string
          session_status: string
        }[]
      }
      run_clinical_template_validation: {
        Args: {
          target_template_version_id: string
          validation_scope_input?: string
        }
        Returns: Json
      }
      sanitise_storage_filename: {
        Args: { input_filename: string }
        Returns: string
      }
      save_clinical_assessment_response: {
        Args: {
          expected_lock_version?: number
          idempotency_key_input?: string
          repeat_index_input?: number
          response_payload: Json
          target_assessment_definition_item_id: string
          target_clinical_assessment_id: string
        }
        Returns: string
      }
      save_clinical_note_free_text_draft: {
        Args: {
          expected_draft_lock_version?: number
          free_text_content_input: string
          idempotency_key_input?: string
          target_note_version_id: string
        }
        Returns: string
      }
      save_clinical_note_structured_response: {
        Args: {
          expected_lock_version?: number
          idempotency_key_input?: string
          response_payload: Json
          target_note_version_id: string
          target_template_field_id: string
        }
        Returns: string
      }
      share_document_file_to_patient_link: {
        Args: { target_document_file_id: string }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by_profile_id: string | null
          bucket_id: string
          checksum_sha256: string | null
          clinical_attachment_id: string | null
          clinical_encounter_id: string | null
          clinical_note_id: string | null
          content_type: string
          created_at: string
          created_by_profile_id: string | null
          deleted_at: string | null
          document_category: string
          document_status: string
          file_size_bytes: number
          id: string
          invoice_id: string | null
          metadata: Json
          object_path: string
          original_filename: string
          patient_id: string | null
          patient_link_shared_at: string | null
          patient_link_shared_by_profile_id: string | null
          patient_link_visible: boolean
          payment_id: string | null
          practice_branding_id: string | null
          practice_profile_id: string | null
          receipt_id: string | null
          responsible_party_id: string | null
          safe_filename: string
          sharing_scope: string
          tenant_id: string
          updated_at: string
          updated_by_profile_id: string | null
          upload_completed_at: string | null
          upload_intent_created_at: string
          uploaded_by_profile_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "document_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sign_clinical_assessment: {
        Args: {
          signature_statement_input?: string
          target_clinical_assessment_id: string
        }
        Returns: string
      }
      sign_clinical_note_version: {
        Args: {
          signature_statement_input?: string
          target_note_version_id: string
        }
        Returns: string
      }
      touch_clinical_template_draft_state: {
        Args: {
          idempotency_key_input?: string
          target_template_version_id: string
        }
        Returns: undefined
      }
      update_clinical_template_draft_metadata: {
        Args: {
          description_input?: string
          discipline_tags_input?: string[]
          expected_template_lock_version?: number
          expected_version_lock_version?: number
          idempotency_key_input?: string
          release_notes_input?: string
          target_template_version_id: string
          template_name_input: string
        }
        Returns: string
      }
      upsert_assessment_assignment: {
        Args: {
          assessment_phase_input?: string
          assignment_id_input?: string
          assignment_priority_input?: number
          assignment_scope_input?: string
          discipline_input?: string
          effective_from_input?: string
          effective_until_input?: string
          encounter_type_input?: string
          expected_lock_version?: number
          is_default_input?: boolean
          is_recommended_input?: boolean
          patient_reported_eligible_input?: boolean
          practice_location_id_input?: string
          session_type_input?: string
          target_definition_version_id: string
          therapist_profile_id_input?: string
        }
        Returns: string
      }
      upsert_clinical_template_assignment: {
        Args: {
          assignment_id_input?: string
          assignment_priority_input?: number
          assignment_scope_input?: string
          discipline_input?: string
          effective_from_input?: string
          effective_until_input?: string
          encounter_type_input?: string
          expected_lock_version?: number
          is_default_input?: boolean
          practice_location_id_input?: string
          session_type_input?: string
          target_template_version_id: string
          therapist_profile_id_input?: string
        }
        Returns: string
      }
      upsert_clinical_template_calculation_rule: {
        Args: {
          calculation_config_input?: Json
          calculation_key_input?: string
          calculation_rule_id_input?: string
          calculation_type_input?: string
          expected_lock_version?: number
          idempotency_key_input?: string
          input_field_keys_input?: string[]
          is_required_for_finalise_input?: boolean
          result_unit_input?: string
          result_value_type_input?: string
          target_field_id?: string
          target_template_version_id: string
        }
        Returns: string
      }
      upsert_clinical_template_field: {
        Args: {
          allowed_units_input?: string[]
          display_order_input?: number
          expected_lock_version?: number
          field_id_input?: string
          field_key_input?: string
          field_label_input?: string
          field_type_input?: string
          idempotency_key_input?: string
          is_required_input?: boolean
          is_required_on_finalise_input?: boolean
          patient_visible_eligible_input?: boolean
          practitioner_only_input?: boolean
          target_section_id: string
          target_template_version_id: string
        }
        Returns: string
      }
      upsert_clinical_template_field_option: {
        Args: {
          display_order_input?: number
          expected_lock_version?: number
          idempotency_key_input?: string
          is_default_input?: boolean
          option_id_input?: string
          option_key_input?: string
          option_label_input?: string
          target_field_id: string
          target_template_version_id: string
        }
        Returns: string
      }
      upsert_clinical_template_section: {
        Args: {
          display_order_input?: number
          expected_lock_version?: number
          idempotency_key_input?: string
          patient_visible_eligible_input?: boolean
          practitioner_only_input?: boolean
          section_id_input?: string
          section_key_input?: string
          section_label_input?: string
          section_type_input?: string
          target_template_version_id: string
        }
        Returns: string
      }
      upsert_clinical_template_validation_rule: {
        Args: {
          applies_on_input?: string
          expected_lock_version?: number
          idempotency_key_input?: string
          is_active_input?: boolean
          message_input?: string
          rule_config_input?: Json
          rule_id_input?: string
          rule_key_input?: string
          rule_type_input?: string
          severity_input?: string
          target_field_id?: string
          target_section_id?: string
          target_template_version_id: string
        }
        Returns: string
      }
      validate_assessment_definition_version_ready_for_publish: {
        Args: { target_definition_version_id: string }
        Returns: Json
      }
      validate_assessment_stable_key: {
        Args: { key_input: string }
        Returns: boolean
      }
      validate_clinical_assessment_ready_for_completion: {
        Args: { target_clinical_assessment_id: string }
        Returns: Json
      }
      validate_clinical_note_version_ready_for_finalisation: {
        Args: { target_note_version_id: string }
        Returns: Json
      }
      validate_clinical_structured_response_payload: {
        Args: {
          field_record: Database["public"]["Tables"]["clinical_template_fields"]["Row"]
          response_payload: Json
        }
        Returns: undefined
      }
      validate_clinical_template_stable_key: {
        Args: { key_input: string }
        Returns: boolean
      }
      validate_clinical_template_version_ready_for_publish: {
        Args: { target_template_version_id: string }
        Returns: Json
      }
      validate_clinical_template_visibility_rule_references: {
        Args: { rules_input: Json; target_template_version_id: string }
        Returns: boolean
      }
      validate_workflow_definition_version: {
        Args: { target_version_id: string }
        Returns: Json
      }
      verify_patient_link: {
        Args: { target_challenge_id: string; verification_code_input: string }
        Returns: {
          access_grant_id: string
          challenge_status: string
          patient_link_id: string
          verified: boolean
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
