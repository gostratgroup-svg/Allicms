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

type PriceListRelationship = {
  foreignKeyName: string
  columns: ['price_list_id']
  isOneToOne: false
  referencedRelation: 'price_lists'
  referencedColumns: ['id']
}

type PriceListItemRelationship = {
  foreignKeyName: string
  columns: ['price_list_item_id']
  isOneToOne: false
  referencedRelation: 'price_list_items'
  referencedColumns: ['id']
}

type PatientRelationship = {
  foreignKeyName: string
  columns: ['patient_id']
  isOneToOne: false
  referencedRelation: 'patients'
  referencedColumns: ['id']
}

type PracticeLocationRelationship = {
  foreignKeyName: string
  columns: ['practice_location_id']
  isOneToOne: false
  referencedRelation: 'practice_locations'
  referencedColumns: ['id']
}

type BookingRelationship = {
  foreignKeyName: string
  columns: ['booking_id']
  isOneToOne: false
  referencedRelation: 'bookings'
  referencedColumns: ['id']
}

type SessionRelationship = {
  foreignKeyName: string
  columns: ['session_id']
  isOneToOne: false
  referencedRelation: 'sessions'
  referencedColumns: ['id']
}

type BookingProcedureRelationship = {
  foreignKeyName: string
  columns: ['booking_procedure_id']
  isOneToOne: false
  referencedRelation: 'booking_procedures'
  referencedColumns: ['id']
}

type BookingRecurrenceRuleRelationship = {
  foreignKeyName: string
  columns: ['recurrence_rule_id']
  isOneToOne: false
  referencedRelation: 'booking_recurrence_rules'
  referencedColumns: ['id']
}

type ResponsiblePartyRelationship = {
  foreignKeyName: string
  columns: ['responsible_party_id']
  isOneToOne: false
  referencedRelation: 'responsible_parties'
  referencedColumns: ['id']
}

type FinancialAccountRelationship = {
  foreignKeyName: string
  columns: ['financial_account_id']
  isOneToOne: false
  referencedRelation: 'financial_accounts'
  referencedColumns: ['id']
}

type PaymentRelationship = {
  foreignKeyName: string
  columns: ['payment_id']
  isOneToOne: false
  referencedRelation: 'payments'
  referencedColumns: ['id']
}

type InvoiceRelationship = {
  foreignKeyName: string
  columns: ['invoice_id']
  isOneToOne: false
  referencedRelation: 'invoices'
  referencedColumns: ['id']
}

type ReceiptRelationship = {
  foreignKeyName: string
  columns: ['receipt_id']
  isOneToOne: false
  referencedRelation: 'receipts'
  referencedColumns: ['id']
}

type CreatedByProfileRelationship = {
  foreignKeyName: string
  columns: ['created_by_profile_id']
  isOneToOne: false
  referencedRelation: 'profiles'
  referencedColumns: ['id']
}

type UpdatedByProfileRelationship = {
  foreignKeyName: string
  columns: ['updated_by_profile_id']
  isOneToOne: false
  referencedRelation: 'profiles'
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
      financial_accounts: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string | null
          responsible_party_id: string | null
          account_type: string
          account_name: string
          account_reference: string | null
          currency_code: string
          account_status: string
          notes: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id?: string | null
          responsible_party_id?: string | null
          account_type?: string
          account_name: string
          account_reference?: string | null
          currency_code?: string
          account_status?: string
          notes?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string | null
          responsible_party_id?: string | null
          account_type?: string
          account_name?: string
          account_reference?: string | null
          currency_code?: string
          account_status?: string
          notes?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      payments: PublicTable<
        {
          id: string
          tenant_id: string
          financial_account_id: string | null
          patient_id: string | null
          responsible_party_id: string | null
          primary_invoice_id: string | null
          bank_account_id: string | null
          therapist_profile_id: string | null
          practice_location_id: string | null
          payer_name: string
          payer_email: string | null
          payer_phone: string | null
          payment_date: string
          amount: number
          allocated_amount: number
          unallocated_amount: number
          currency_code: string
          payment_method: string
          payment_reference: string | null
          external_transaction_reference: string | null
          payment_status: string
          reconciliation_status: string
          notes: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          reversal_reason: string | null
          refund_ready: boolean
          proof_document_id: string | null
          metadata: Json
          recorded_by_profile_id: string | null
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          primary_invoice_id?: string | null
          bank_account_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          payer_name: string
          payer_email?: string | null
          payer_phone?: string | null
          payment_date?: string
          amount: number
          allocated_amount?: number
          unallocated_amount?: number
          currency_code?: string
          payment_method: string
          payment_reference?: string | null
          external_transaction_reference?: string | null
          payment_status?: string
          reconciliation_status?: string
          notes?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          reversal_reason?: string | null
          refund_ready?: boolean
          proof_document_id?: string | null
          metadata?: Json
          recorded_by_profile_id?: string | null
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          primary_invoice_id?: string | null
          bank_account_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          payer_name?: string
          payer_email?: string | null
          payer_phone?: string | null
          payment_date?: string
          amount?: number
          allocated_amount?: number
          unallocated_amount?: number
          currency_code?: string
          payment_method?: string
          payment_reference?: string | null
          external_transaction_reference?: string | null
          payment_status?: string
          reconciliation_status?: string
          notes?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          reversal_reason?: string | null
          refund_ready?: boolean
          proof_document_id?: string | null
          metadata?: Json
          recorded_by_profile_id?: string | null
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          FinancialAccountRelationship,
          PatientRelationship,
          ResponsiblePartyRelationship,
          TherapistProfileRelationship,
          PracticeLocationRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      payment_allocations: PublicTable<
        {
          id: string
          tenant_id: string
          payment_id: string
          invoice_id: string
          financial_account_id: string | null
          patient_id: string | null
          responsible_party_id: string | null
          allocated_amount: number
          currency_code: string
          allocation_order: number
          allocation_status: string
          allocated_at: string
          allocated_by_profile_id: string | null
          reversed_at: string | null
          reversed_by_profile_id: string | null
          reversal_reason: string | null
          idempotency_key: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          payment_id: string
          invoice_id: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          allocated_amount: number
          currency_code?: string
          allocation_order?: number
          allocation_status?: string
          allocated_at?: string
          allocated_by_profile_id?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          reversal_reason?: string | null
          idempotency_key?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          payment_id?: string
          invoice_id?: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          allocated_amount?: number
          currency_code?: string
          allocation_order?: number
          allocation_status?: string
          allocated_at?: string
          allocated_by_profile_id?: string | null
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          reversal_reason?: string | null
          idempotency_key?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PaymentRelationship, InvoiceRelationship, FinancialAccountRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      account_credits: PublicTable<
        {
          id: string
          tenant_id: string
          financial_account_id: string | null
          patient_id: string | null
          responsible_party_id: string | null
          source_payment_id: string | null
          source_payment_allocation_id: string | null
          original_amount: number
          remaining_amount: number
          currency_code: string
          credit_status: string
          credit_reason: string
          expires_at: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          source_payment_id?: string | null
          source_payment_allocation_id?: string | null
          original_amount: number
          remaining_amount: number
          currency_code?: string
          credit_status?: string
          credit_reason: string
          expires_at?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          source_payment_id?: string | null
          source_payment_allocation_id?: string | null
          original_amount?: number
          remaining_amount?: number
          currency_code?: string
          credit_status?: string
          credit_reason?: string
          expires_at?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, FinancialAccountRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      invoice_number_sequences: PublicTable<
        {
          id: string
          tenant_id: string
          sequence_key: string
          prefix: string
          suffix: string | null
          next_number: number
          padding_length: number
          reset_strategy: string
          is_active: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          sequence_key?: string
          prefix?: string
          suffix?: string | null
          next_number?: number
          padding_length?: number
          reset_strategy?: string
          is_active?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          sequence_key?: string
          prefix?: string
          suffix?: string | null
          next_number?: number
          padding_length?: number
          reset_strategy?: string
          is_active?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      invoices: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          responsible_party_id: string | null
          booking_id: string | null
          session_id: string | null
          therapist_profile_id: string | null
          practice_location_id: string | null
          source_workflow_event_id: string | null
          source_type: string
          invoice_status: string
          draft_reference: string
          invoice_number: string | null
          invoice_prefix: string | null
          invoice_sequence_number: number | null
          invoice_sequence_key: string | null
          invoice_date: string
          service_date: string | null
          due_date: string | null
          payment_terms_days: number
          currency_code: string
          subtotal_amount: number
          discount_total: number
          adjustment_total: number
          taxable_amount: number
          tax_total: number
          rounding_adjustment: number
          total_amount: number
          amount_paid: number
          balance_due: number
          draft_created_at: string
          review_required_at: string | null
          review_required_reason: string | null
          ready_to_confirm_at: string | null
          confirmed_at: string | null
          confirmed_by_profile_id: string | null
          issued_at: string | null
          issued_by_profile_id: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          cancellation_reason: string | null
          voided_at: string | null
          voided_by_profile_id: string | null
          void_reason: string | null
          differs_from_source: boolean
          manually_edited: boolean
          manual_edit_reason: string | null
          reconciliation_required: boolean
          reconciliation_reason: string | null
          session_reopened_at: string | null
          patient_link_visible: boolean
          patient_link_update_ready: boolean
          payment_status: string
          collection_status: string
          payment_reconciliation_status: string
          last_payment_at: string | null
          overdue_since: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          responsible_party_id?: string | null
          booking_id?: string | null
          session_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          source_workflow_event_id?: string | null
          source_type?: string
          invoice_status?: string
          draft_reference: string
          invoice_number?: string | null
          invoice_prefix?: string | null
          invoice_sequence_number?: number | null
          invoice_sequence_key?: string | null
          invoice_date?: string
          service_date?: string | null
          due_date?: string | null
          payment_terms_days?: number
          currency_code?: string
          subtotal_amount?: number
          discount_total?: number
          adjustment_total?: number
          taxable_amount?: number
          tax_total?: number
          rounding_adjustment?: number
          total_amount?: number
          amount_paid?: number
          balance_due?: number
          draft_created_at?: string
          review_required_at?: string | null
          review_required_reason?: string | null
          ready_to_confirm_at?: string | null
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          issued_at?: string | null
          issued_by_profile_id?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          cancellation_reason?: string | null
          voided_at?: string | null
          voided_by_profile_id?: string | null
          void_reason?: string | null
          differs_from_source?: boolean
          manually_edited?: boolean
          manual_edit_reason?: string | null
          reconciliation_required?: boolean
          reconciliation_reason?: string | null
          session_reopened_at?: string | null
          patient_link_visible?: boolean
          patient_link_update_ready?: boolean
          payment_status?: string
          collection_status?: string
          payment_reconciliation_status?: string
          last_payment_at?: string | null
          overdue_since?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          responsible_party_id?: string | null
          booking_id?: string | null
          session_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          source_workflow_event_id?: string | null
          source_type?: string
          invoice_status?: string
          draft_reference?: string
          invoice_number?: string | null
          invoice_prefix?: string | null
          invoice_sequence_number?: number | null
          invoice_sequence_key?: string | null
          invoice_date?: string
          service_date?: string | null
          due_date?: string | null
          payment_terms_days?: number
          currency_code?: string
          subtotal_amount?: number
          discount_total?: number
          adjustment_total?: number
          taxable_amount?: number
          tax_total?: number
          rounding_adjustment?: number
          total_amount?: number
          amount_paid?: number
          balance_due?: number
          draft_created_at?: string
          review_required_at?: string | null
          review_required_reason?: string | null
          ready_to_confirm_at?: string | null
          confirmed_at?: string | null
          confirmed_by_profile_id?: string | null
          issued_at?: string | null
          issued_by_profile_id?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          cancellation_reason?: string | null
          voided_at?: string | null
          voided_by_profile_id?: string | null
          void_reason?: string | null
          differs_from_source?: boolean
          manually_edited?: boolean
          manual_edit_reason?: string | null
          reconciliation_required?: boolean
          reconciliation_reason?: string | null
          session_reopened_at?: string | null
          patient_link_visible?: boolean
          patient_link_update_ready?: boolean
          payment_status?: string
          collection_status?: string
          payment_reconciliation_status?: string
          last_payment_at?: string | null
          overdue_since?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          PatientRelationship,
          ResponsiblePartyRelationship,
          BookingRelationship,
          SessionRelationship,
          TherapistProfileRelationship,
          PracticeLocationRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      invoice_lines: PublicTable<
        {
          id: string
          tenant_id: string
          invoice_id: string
          source_session_procedure_id: string | null
          source_booking_procedure_id: string | null
          source_price_list_item_id: string | null
          therapist_profile_id: string | null
          practice_location_id: string | null
          line_type: string
          line_order: number
          service_date: string | null
          procedure_name: string
          procedure_code: string | null
          description: string | null
          icd10_code: string | null
          quantity: number
          unit_price: number
          discount_amount: number
          adjustment_amount: number
          tax_rate: number
          tax_amount: number
          line_subtotal: number
          line_total: number
          currency_code: string
          differs_from_source: boolean
          change_reason: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          invoice_id: string
          source_session_procedure_id?: string | null
          source_booking_procedure_id?: string | null
          source_price_list_item_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          line_type?: string
          line_order?: number
          service_date?: string | null
          procedure_name: string
          procedure_code?: string | null
          description?: string | null
          icd10_code?: string | null
          quantity?: number
          unit_price?: number
          discount_amount?: number
          adjustment_amount?: number
          tax_rate?: number
          tax_amount?: number
          line_subtotal?: number
          line_total?: number
          currency_code?: string
          differs_from_source?: boolean
          change_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          invoice_id?: string
          source_session_procedure_id?: string | null
          source_booking_procedure_id?: string | null
          source_price_list_item_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          line_type?: string
          line_order?: number
          service_date?: string | null
          procedure_name?: string
          procedure_code?: string | null
          description?: string | null
          icd10_code?: string | null
          quantity?: number
          unit_price?: number
          discount_amount?: number
          adjustment_amount?: number
          tax_rate?: number
          tax_amount?: number
          line_subtotal?: number
          line_total?: number
          currency_code?: string
          differs_from_source?: boolean
          change_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'invoice_lines_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          BookingProcedureRelationship,
          PriceListItemRelationship,
          TherapistProfileRelationship,
          PracticeLocationRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      invoice_party_snapshots: PublicTable<
        {
          id: string
          tenant_id: string
          invoice_id: string
          patient_id: string | null
          responsible_party_id: string | null
          patient_full_name: string
          patient_number: string | null
          patient_date_of_birth: string | null
          patient_id_number: string | null
          patient_icd10_code: string | null
          responsible_party_name: string | null
          responsible_party_type: string | null
          relationship_to_patient: string | null
          responsible_party_id_number: string | null
          billing_email: string | null
          billing_phone: string | null
          billing_address: Json
          organisation_name: string | null
          medical_aid_context: Json
          snapshot: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          invoice_id: string
          patient_id?: string | null
          responsible_party_id?: string | null
          patient_full_name: string
          patient_number?: string | null
          patient_date_of_birth?: string | null
          patient_id_number?: string | null
          patient_icd10_code?: string | null
          responsible_party_name?: string | null
          responsible_party_type?: string | null
          relationship_to_patient?: string | null
          responsible_party_id_number?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          billing_address?: Json
          organisation_name?: string | null
          medical_aid_context?: Json
          snapshot?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          invoice_id?: string
          patient_id?: string | null
          responsible_party_id?: string | null
          patient_full_name?: string
          patient_number?: string | null
          patient_date_of_birth?: string | null
          patient_id_number?: string | null
          patient_icd10_code?: string | null
          responsible_party_name?: string | null
          responsible_party_type?: string | null
          relationship_to_patient?: string | null
          responsible_party_id_number?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          billing_address?: Json
          organisation_name?: string | null
          medical_aid_context?: Json
          snapshot?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'invoice_party_snapshots_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          PatientRelationship,
          ResponsiblePartyRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      invoice_issuer_snapshots: PublicTable<
        {
          id: string
          tenant_id: string
          invoice_id: string
          practice_profile_id: string | null
          therapist_profile_id: string | null
          practice_location_id: string | null
          bank_account_id: string | null
          practice_legal_name: string | null
          practice_trading_name: string | null
          practice_registration_number: string | null
          practice_tax_number: string | null
          practice_vat_number: string | null
          practice_email: string | null
          practice_phone: string | null
          practice_website: string | null
          practice_address: Json
          therapist_name: string | null
          therapist_profession: string | null
          therapist_practice_number: string | null
          therapist_registration: Json
          location_name: string | null
          location_address: Json
          bank_account_holder: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_account_type: string | null
          branding: Json
          payment_instructions: string | null
          invoice_footer: string | null
          currency_code: string
          payment_terms_days: number
          snapshot: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          invoice_id: string
          practice_profile_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          bank_account_id?: string | null
          practice_legal_name?: string | null
          practice_trading_name?: string | null
          practice_registration_number?: string | null
          practice_tax_number?: string | null
          practice_vat_number?: string | null
          practice_email?: string | null
          practice_phone?: string | null
          practice_website?: string | null
          practice_address?: Json
          therapist_name?: string | null
          therapist_profession?: string | null
          therapist_practice_number?: string | null
          therapist_registration?: Json
          location_name?: string | null
          location_address?: Json
          bank_account_holder?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_account_type?: string | null
          branding?: Json
          payment_instructions?: string | null
          invoice_footer?: string | null
          currency_code?: string
          payment_terms_days?: number
          snapshot?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          invoice_id?: string
          practice_profile_id?: string | null
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          bank_account_id?: string | null
          practice_legal_name?: string | null
          practice_trading_name?: string | null
          practice_registration_number?: string | null
          practice_tax_number?: string | null
          practice_vat_number?: string | null
          practice_email?: string | null
          practice_phone?: string | null
          practice_website?: string | null
          practice_address?: Json
          therapist_name?: string | null
          therapist_profession?: string | null
          therapist_practice_number?: string | null
          therapist_registration?: Json
          location_name?: string | null
          location_address?: Json
          bank_account_holder?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_account_type?: string | null
          branding?: Json
          payment_instructions?: string | null
          invoice_footer?: string | null
          currency_code?: string
          payment_terms_days?: number
          snapshot?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'invoice_issuer_snapshots_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          PracticeProfileRelationship,
          TherapistProfileRelationship,
          PracticeLocationRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      invoice_status_history: PublicTable<
        {
          id: string
          tenant_id: string
          invoice_id: string
          session_id: string | null
          booking_id: string | null
          patient_id: string | null
          from_status: string | null
          to_status: string
          event_type: string
          event_reason: string | null
          is_patient_visible: boolean
          metadata: Json
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          invoice_id: string
          session_id?: string | null
          booking_id?: string | null
          patient_id?: string | null
          from_status?: string | null
          to_status: string
          event_type: string
          event_reason?: string | null
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          invoice_id?: string
          session_id?: string | null
          booking_id?: string | null
          patient_id?: string | null
          from_status?: string | null
          to_status?: string
          event_type?: string
          event_reason?: string | null
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'invoice_status_history_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          SessionRelationship,
          BookingRelationship,
          PatientRelationship,
          CreatedByProfileRelationship,
        ]
      >
      invoice_workflow_events: PublicTable<
        {
          id: string
          tenant_id: string
          invoice_id: string
          session_id: string | null
          booking_id: string | null
          patient_id: string | null
          event_type: string
          idempotency_key: string
          event_status: string
          payload: Json
          processed_at: string | null
          failed_at: string | null
          error_message: string | null
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          invoice_id: string
          session_id?: string | null
          booking_id?: string | null
          patient_id?: string | null
          event_type: string
          idempotency_key: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          invoice_id?: string
          session_id?: string | null
          booking_id?: string | null
          patient_id?: string | null
          event_type?: string
          idempotency_key?: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'invoice_workflow_events_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          SessionRelationship,
          BookingRelationship,
          PatientRelationship,
          CreatedByProfileRelationship,
        ]
      >
      receipt_number_sequences: PublicTable<
        {
          id: string
          tenant_id: string
          sequence_key: string
          prefix: string
          suffix: string | null
          next_number: number
          padding_length: number
          reset_strategy: string
          is_active: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          sequence_key?: string
          prefix?: string
          suffix?: string | null
          next_number?: number
          padding_length?: number
          reset_strategy?: string
          is_active?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          sequence_key?: string
          prefix?: string
          suffix?: string | null
          next_number?: number
          padding_length?: number
          reset_strategy?: string
          is_active?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      receipts: PublicTable<
        {
          id: string
          tenant_id: string
          payment_id: string
          financial_account_id: string | null
          patient_id: string | null
          responsible_party_id: string | null
          invoice_issuer_snapshot_id: string | null
          receipt_number: string
          receipt_prefix: string | null
          receipt_sequence_number: number | null
          receipt_sequence_key: string | null
          receipt_status: string
          receipt_date: string
          issued_at: string
          issued_by_profile_id: string | null
          payer_snapshot: Json
          issuer_snapshot: Json
          allocation_snapshot: Json
          payment_amount: number
          currency_code: string
          payment_reference: string | null
          payment_method: string | null
          patient_link_ready: boolean
          pdf_generation_ready: boolean
          communication_ready: boolean
          reversed_at: string | null
          reversed_by_profile_id: string | null
          reversal_reason: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          payment_id: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          invoice_issuer_snapshot_id?: string | null
          receipt_number: string
          receipt_prefix?: string | null
          receipt_sequence_number?: number | null
          receipt_sequence_key?: string | null
          receipt_status?: string
          receipt_date?: string
          issued_at?: string
          issued_by_profile_id?: string | null
          payer_snapshot?: Json
          issuer_snapshot?: Json
          allocation_snapshot?: Json
          payment_amount: number
          currency_code?: string
          payment_reference?: string | null
          payment_method?: string | null
          patient_link_ready?: boolean
          pdf_generation_ready?: boolean
          communication_ready?: boolean
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          reversal_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          payment_id?: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          invoice_issuer_snapshot_id?: string | null
          receipt_number?: string
          receipt_prefix?: string | null
          receipt_sequence_number?: number | null
          receipt_sequence_key?: string | null
          receipt_status?: string
          receipt_date?: string
          issued_at?: string
          issued_by_profile_id?: string | null
          payer_snapshot?: Json
          issuer_snapshot?: Json
          allocation_snapshot?: Json
          payment_amount?: number
          currency_code?: string
          payment_reference?: string | null
          payment_method?: string | null
          patient_link_ready?: boolean
          pdf_generation_ready?: boolean
          communication_ready?: boolean
          reversed_at?: string | null
          reversed_by_profile_id?: string | null
          reversal_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PaymentRelationship, FinancialAccountRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      payment_status_history: PublicTable<
        {
          id: string
          tenant_id: string
          payment_id: string
          financial_account_id: string | null
          patient_id: string | null
          responsible_party_id: string | null
          from_status: string | null
          to_status: string
          event_type: string
          event_reason: string | null
          metadata: Json
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          payment_id: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          from_status?: string | null
          to_status: string
          event_type: string
          event_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          payment_id?: string
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          from_status?: string | null
          to_status?: string
          event_type?: string
          event_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PaymentRelationship, FinancialAccountRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship]
      >
      payment_workflow_events: PublicTable<
        {
          id: string
          tenant_id: string
          payment_id: string | null
          payment_allocation_id: string | null
          invoice_id: string | null
          receipt_id: string | null
          financial_account_id: string | null
          patient_id: string | null
          responsible_party_id: string | null
          event_type: string
          idempotency_key: string
          event_status: string
          payload: Json
          processed_at: string | null
          failed_at: string | null
          error_message: string | null
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          payment_id?: string | null
          payment_allocation_id?: string | null
          invoice_id?: string | null
          receipt_id?: string | null
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          event_type: string
          idempotency_key: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          payment_id?: string | null
          payment_allocation_id?: string | null
          invoice_id?: string | null
          receipt_id?: string | null
          financial_account_id?: string | null
          patient_id?: string | null
          responsible_party_id?: string | null
          event_type?: string
          idempotency_key?: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PaymentRelationship, InvoiceRelationship, ReceiptRelationship, FinancialAccountRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship]
      >
      booking_notes: PublicTable<
        {
          id: string
          tenant_id: string
          booking_id: string
          note_type: string
          title: string | null
          body: string
          is_patient_visible: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          booking_id: string
          note_type?: string
          title?: string | null
          body: string
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          booking_id?: string
          note_type?: string
          title?: string | null
          body?: string
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, BookingRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      booking_occurrence_exceptions: PublicTable<
        {
          id: string
          tenant_id: string
          recurrence_rule_id: string
          booking_id: string | null
          original_start_at: string
          original_end_at: string | null
          exception_type: string
          new_start_at: string | null
          new_end_at: string | null
          cancellation_reason: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          recurrence_rule_id: string
          booking_id?: string | null
          original_start_at: string
          original_end_at?: string | null
          exception_type: string
          new_start_at?: string | null
          new_end_at?: string | null
          cancellation_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          recurrence_rule_id?: string
          booking_id?: string | null
          original_start_at?: string
          original_end_at?: string | null
          exception_type?: string
          new_start_at?: string | null
          new_end_at?: string | null
          cancellation_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          BookingRecurrenceRuleRelationship,
          BookingRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      booking_procedures: PublicTable<
        {
          id: string
          tenant_id: string
          booking_id: string
          price_list_id: string | null
          price_list_item_id: string | null
          procedure_name: string
          procedure_code: string | null
          description: string | null
          unit_price: number
          quantity: number
          discount_amount: number
          adjustment_amount: number
          line_total: number
          duration_minutes: number | null
          currency_code: string
          is_billable: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          booking_id: string
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_name: string
          procedure_code?: string | null
          description?: string | null
          unit_price?: number
          quantity?: number
          discount_amount?: number
          adjustment_amount?: number
          line_total?: number
          duration_minutes?: number | null
          currency_code?: string
          is_billable?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          booking_id?: string
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_name?: string
          procedure_code?: string | null
          description?: string | null
          unit_price?: number
          quantity?: number
          discount_amount?: number
          adjustment_amount?: number
          line_total?: number
          duration_minutes?: number | null
          currency_code?: string
          is_billable?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          BookingRelationship,
          PriceListRelationship,
          PriceListItemRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      booking_recurrence_rules: PublicTable<
        {
          id: string
          tenant_id: string
          series_booking_id: string
          recurrence_status: string
          rrule: string
          starts_on: string
          ends_on: string | null
          timezone: string
          edit_scope: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          series_booking_id: string
          recurrence_status?: string
          rrule: string
          starts_on: string
          ends_on?: string | null
          timezone?: string
          edit_scope?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          series_booking_id?: string
          recurrence_status?: string
          rrule?: string
          starts_on?: string
          ends_on?: string | null
          timezone?: string
          edit_scope?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          {
            foreignKeyName: 'booking_recurrence_rules_series_booking_id_fkey'
            columns: ['series_booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      booking_status_history: PublicTable<
        {
          id: string
          tenant_id: string
          booking_id: string
          from_status: string | null
          to_status: string
          event_type: string
          event_reason: string | null
          old_start_at: string | null
          old_end_at: string | null
          new_start_at: string | null
          new_end_at: string | null
          is_patient_visible: boolean
          metadata: Json
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          booking_id: string
          from_status?: string | null
          to_status: string
          event_type: string
          event_reason?: string | null
          old_start_at?: string | null
          old_end_at?: string | null
          new_start_at?: string | null
          new_end_at?: string | null
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          booking_id?: string
          from_status?: string | null
          to_status?: string
          event_type?: string
          event_reason?: string | null
          old_start_at?: string | null
          old_end_at?: string | null
          new_start_at?: string | null
          new_end_at?: string | null
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, BookingRelationship, CreatedByProfileRelationship]
      >
      booking_workflow_events: PublicTable<
        {
          id: string
          tenant_id: string
          booking_id: string
          event_type: string
          idempotency_key: string
          event_status: string
          payload: Json
          processed_at: string | null
          failed_at: string | null
          error_message: string | null
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          booking_id: string
          event_type: string
          idempotency_key: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          booking_id?: string
          event_type?: string
          idempotency_key?: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, BookingRelationship, CreatedByProfileRelationship]
      >
      bookings: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          therapist_profile_id: string | null
          practice_location_id: string | null
          price_list_id: string | null
          recurrence_rule_id: string | null
          booking_status: string
          booking_type: string
          booking_source: string
          appointment_mode: string
          start_at: string | null
          end_at: string | null
          duration_minutes: number | null
          timezone: string
          room_label: string | null
          patient_facing_title: string | null
          patient_facing_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          no_show_at: string | null
          checked_in_at: string | null
          in_progress_at: string | null
          completed_at: string | null
          rescheduled_from_booking_id: string | null
          session_ready: boolean
          draft_invoice_ready: boolean
          patient_link_visible: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          price_list_id?: string | null
          recurrence_rule_id?: string | null
          booking_status?: string
          booking_type?: string
          booking_source?: string
          appointment_mode?: string
          start_at?: string | null
          end_at?: string | null
          duration_minutes?: number | null
          timezone?: string
          room_label?: string | null
          patient_facing_title?: string | null
          patient_facing_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          no_show_at?: string | null
          checked_in_at?: string | null
          in_progress_at?: string | null
          completed_at?: string | null
          rescheduled_from_booking_id?: string | null
          session_ready?: boolean
          draft_invoice_ready?: boolean
          patient_link_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          price_list_id?: string | null
          recurrence_rule_id?: string | null
          booking_status?: string
          booking_type?: string
          booking_source?: string
          appointment_mode?: string
          start_at?: string | null
          end_at?: string | null
          duration_minutes?: number | null
          timezone?: string
          room_label?: string | null
          patient_facing_title?: string | null
          patient_facing_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          no_show_at?: string | null
          checked_in_at?: string | null
          in_progress_at?: string | null
          completed_at?: string | null
          rescheduled_from_booking_id?: string | null
          session_ready?: boolean
          draft_invoice_ready?: boolean
          patient_link_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          PatientRelationship,
          TherapistProfileRelationship,
          PracticeLocationRelationship,
          PriceListRelationship,
          BookingRecurrenceRuleRelationship,
          {
            foreignKeyName: 'bookings_rescheduled_from_booking_id_fkey'
            columns: ['rescheduled_from_booking_id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      session_notes: PublicTable<
        {
          id: string
          tenant_id: string
          session_id: string
          note_type: string
          visibility: string
          title: string | null
          body: string
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          session_id: string
          note_type?: string
          visibility?: string
          title?: string | null
          body: string
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          session_id?: string
          note_type?: string
          visibility?: string
          title?: string | null
          body?: string
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, SessionRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      session_procedures: PublicTable<
        {
          id: string
          tenant_id: string
          session_id: string
          booking_procedure_id: string | null
          price_list_id: string | null
          price_list_item_id: string | null
          procedure_name: string
          procedure_code: string | null
          description: string | null
          unit_price: number
          quantity: number
          discount_amount: number
          adjustment_amount: number
          line_total: number
          duration_minutes: number | null
          currency_code: string
          is_billable: boolean
          differs_from_booking: boolean
          change_reason: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          session_id: string
          booking_procedure_id?: string | null
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_name: string
          procedure_code?: string | null
          description?: string | null
          unit_price?: number
          quantity?: number
          discount_amount?: number
          adjustment_amount?: number
          line_total?: number
          duration_minutes?: number | null
          currency_code?: string
          is_billable?: boolean
          differs_from_booking?: boolean
          change_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          session_id?: string
          booking_procedure_id?: string | null
          price_list_id?: string | null
          price_list_item_id?: string | null
          procedure_name?: string
          procedure_code?: string | null
          description?: string | null
          unit_price?: number
          quantity?: number
          discount_amount?: number
          adjustment_amount?: number
          line_total?: number
          duration_minutes?: number | null
          currency_code?: string
          is_billable?: boolean
          differs_from_booking?: boolean
          change_reason?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          SessionRelationship,
          BookingProcedureRelationship,
          PriceListRelationship,
          PriceListItemRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
        ]
      >
      session_status_history: PublicTable<
        {
          id: string
          tenant_id: string
          session_id: string
          booking_id: string | null
          patient_id: string | null
          from_status: string | null
          to_status: string
          event_type: string
          event_reason: string | null
          actual_start_at: string | null
          actual_end_at: string | null
          is_patient_visible: boolean
          metadata: Json
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          session_id: string
          booking_id?: string | null
          patient_id?: string | null
          from_status?: string | null
          to_status: string
          event_type: string
          event_reason?: string | null
          actual_start_at?: string | null
          actual_end_at?: string | null
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          session_id?: string
          booking_id?: string | null
          patient_id?: string | null
          from_status?: string | null
          to_status?: string
          event_type?: string
          event_reason?: string | null
          actual_start_at?: string | null
          actual_end_at?: string | null
          is_patient_visible?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, SessionRelationship, BookingRelationship, PatientRelationship, CreatedByProfileRelationship]
      >
      session_workflow_events: PublicTable<
        {
          id: string
          tenant_id: string
          session_id: string
          booking_id: string | null
          patient_id: string | null
          event_type: string
          idempotency_key: string
          event_status: string
          payload: Json
          processed_at: string | null
          failed_at: string | null
          error_message: string | null
          created_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          session_id: string
          booking_id?: string | null
          patient_id?: string | null
          event_type: string
          idempotency_key: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          session_id?: string
          booking_id?: string | null
          patient_id?: string | null
          event_type?: string
          idempotency_key?: string
          event_status?: string
          payload?: Json
          processed_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, SessionRelationship, BookingRelationship, PatientRelationship, CreatedByProfileRelationship]
      >
      sessions: PublicTable<
        {
          id: string
          tenant_id: string
          booking_id: string
          patient_id: string
          therapist_profile_id: string | null
          practice_location_id: string | null
          session_status: string
          attendance_outcome: string
          session_type: string
          session_modality: string
          session_outcome: string | null
          scheduled_start_at: string | null
          scheduled_end_at: string | null
          actual_start_at: string | null
          actual_end_at: string | null
          actual_duration_minutes: number | null
          timezone: string
          room_label: string | null
          operational_summary: string | null
          completed_at: string | null
          completed_by_profile_id: string | null
          cancelled_at: string | null
          cancelled_by_profile_id: string | null
          cancellation_reason: string | null
          no_show_at: string | null
          reopened_at: string | null
          reopened_by_profile_id: string | null
          reopen_reason: string | null
          draft_invoice_requested_at: string | null
          draft_invoice_request_status: string
          patient_history_ready: boolean
          patient_link_update_ready: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          booking_id: string
          patient_id: string
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          session_status?: string
          attendance_outcome?: string
          session_type?: string
          session_modality?: string
          session_outcome?: string | null
          scheduled_start_at?: string | null
          scheduled_end_at?: string | null
          actual_start_at?: string | null
          actual_end_at?: string | null
          actual_duration_minutes?: number | null
          timezone?: string
          room_label?: string | null
          operational_summary?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          cancellation_reason?: string | null
          no_show_at?: string | null
          reopened_at?: string | null
          reopened_by_profile_id?: string | null
          reopen_reason?: string | null
          draft_invoice_requested_at?: string | null
          draft_invoice_request_status?: string
          patient_history_ready?: boolean
          patient_link_update_ready?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          booking_id?: string
          patient_id?: string
          therapist_profile_id?: string | null
          practice_location_id?: string | null
          session_status?: string
          attendance_outcome?: string
          session_type?: string
          session_modality?: string
          session_outcome?: string | null
          scheduled_start_at?: string | null
          scheduled_end_at?: string | null
          actual_start_at?: string | null
          actual_end_at?: string | null
          actual_duration_minutes?: number | null
          timezone?: string
          room_label?: string | null
          operational_summary?: string | null
          completed_at?: string | null
          completed_by_profile_id?: string | null
          cancelled_at?: string | null
          cancelled_by_profile_id?: string | null
          cancellation_reason?: string | null
          no_show_at?: string | null
          reopened_at?: string | null
          reopened_by_profile_id?: string | null
          reopen_reason?: string | null
          draft_invoice_requested_at?: string | null
          draft_invoice_request_status?: string
          patient_history_ready?: boolean
          patient_link_update_ready?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [
          TenantRelationship,
          BookingRelationship,
          PatientRelationship,
          TherapistProfileRelationship,
          PracticeLocationRelationship,
          CreatedByProfileRelationship,
          UpdatedByProfileRelationship,
          {
            foreignKeyName: 'sessions_completed_by_profile_id_fkey'
            columns: ['completed_by_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_cancelled_by_profile_id_fkey'
            columns: ['cancelled_by_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_reopened_by_profile_id_fkey'
            columns: ['reopened_by_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
      patient_addresses: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string | null
          responsible_party_id: string | null
          address_owner_type: string
          address_type: string
          address_line_1: string | null
          address_line_2: string | null
          suburb: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          country: string
          is_primary: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id?: string | null
          responsible_party_id?: string | null
          address_owner_type: string
          address_type?: string
          address_line_1?: string | null
          address_line_2?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string
          is_primary?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string | null
          responsible_party_id?: string | null
          address_owner_type?: string
          address_type?: string
          address_line_1?: string | null
          address_line_2?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          country?: string
          is_primary?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      patient_alerts: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          alert_type: string
          severity: string
          title: string
          description: string | null
          is_active: boolean
          is_patient_visible: boolean
          resolved_at: string | null
          resolved_by_profile_id: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          alert_type: string
          severity?: string
          title: string
          description?: string | null
          is_active?: boolean
          is_patient_visible?: boolean
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          alert_type?: string
          severity?: string
          title?: string
          description?: string | null
          is_active?: boolean
          is_patient_visible?: boolean
          resolved_at?: string | null
          resolved_by_profile_id?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      patient_consents: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          responsible_party_id: string | null
          consent_type: string
          consent_status: string
          consent_version: string | null
          consent_text: string | null
          signed_by_name: string | null
          signed_by_relationship: string | null
          signature_url: string | null
          accepted_at: string | null
          revoked_at: string | null
          source: string
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          responsible_party_id?: string | null
          consent_type: string
          consent_status?: string
          consent_version?: string | null
          consent_text?: string | null
          signed_by_name?: string | null
          signed_by_relationship?: string | null
          signature_url?: string | null
          accepted_at?: string | null
          revoked_at?: string | null
          source?: string
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          responsible_party_id?: string | null
          consent_type?: string
          consent_status?: string
          consent_version?: string | null
          consent_text?: string | null
          signed_by_name?: string | null
          signed_by_relationship?: string | null
          signature_url?: string | null
          accepted_at?: string | null
          revoked_at?: string | null
          source?: string
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, ResponsiblePartyRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      patient_emergency_contacts: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          full_name: string
          phone: string
          relationship_to_patient: string | null
          email: string | null
          notes: string | null
          is_primary: boolean
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          full_name: string
          phone: string
          relationship_to_patient?: string | null
          email?: string | null
          notes?: string | null
          is_primary?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          full_name?: string
          phone?: string
          relationship_to_patient?: string | null
          email?: string | null
          notes?: string | null
          is_primary?: boolean
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      patient_history_events: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          event_type: string
          event_title: string
          event_body: string | null
          source_table: string | null
          source_id: string | null
          is_patient_visible: boolean
          patient_visible_title: string | null
          patient_visible_body: string | null
          occurred_at: string
          created_by_profile_id: string | null
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          event_type: string
          event_title: string
          event_body?: string | null
          source_table?: string | null
          source_id?: string | null
          is_patient_visible?: boolean
          patient_visible_title?: string | null
          patient_visible_body?: string | null
          occurred_at?: string
          created_by_profile_id?: string | null
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          event_type?: string
          event_title?: string
          event_body?: string | null
          source_table?: string | null
          source_id?: string | null
          is_patient_visible?: boolean
          patient_visible_title?: string | null
          patient_visible_body?: string | null
          occurred_at?: string
          created_by_profile_id?: string | null
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, CreatedByProfileRelationship]
      >
      patient_links: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          link_token: string
          link_status: string
          requires_intake: boolean
          intake_started_at: string | null
          intake_completed_at: string | null
          last_accessed_at: string | null
          expires_at: string | null
          revoked_at: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          link_token: string
          link_status?: string
          requires_intake?: boolean
          intake_started_at?: string | null
          intake_completed_at?: string | null
          last_accessed_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          link_token?: string
          link_status?: string
          requires_intake?: boolean
          intake_started_at?: string | null
          intake_completed_at?: string | null
          last_accessed_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      patient_medical_information: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          has_medical_aid: boolean
          medical_aid_name: string | null
          medical_aid_number: string | null
          medical_aid_dependant_code: string | null
          medical_aid_plan: string | null
          main_member_name: string | null
          main_member_id_number: string | null
          referring_professional: string | null
          referring_practice: string | null
          medical_conditions: string | null
          current_medication: string | null
          medical_notes: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          has_medical_aid?: boolean
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          medical_aid_dependant_code?: string | null
          medical_aid_plan?: string | null
          main_member_name?: string | null
          main_member_id_number?: string | null
          referring_professional?: string | null
          referring_practice?: string | null
          medical_conditions?: string | null
          current_medication?: string | null
          medical_notes?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          has_medical_aid?: boolean
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          medical_aid_dependant_code?: string | null
          medical_aid_plan?: string | null
          main_member_name?: string | null
          main_member_id_number?: string | null
          referring_professional?: string | null
          referring_practice?: string | null
          medical_conditions?: string | null
          current_medication?: string | null
          medical_notes?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      patients: PublicTable<
        {
          id: string
          tenant_id: string
          patient_number: string | null
          patient_status: string
          patient_type: string
          title: string | null
          first_name: string
          last_name: string
          preferred_name: string | null
          date_of_birth: string | null
          id_number: string | null
          gender: string | null
          language: string | null
          email: string | null
          phone: string | null
          referral_source: string | null
          active_icd10_code: string | null
          assigned_therapist_profile_id: string | null
          intake_sent_at: string | null
          intake_started_at: string | null
          intake_completed_at: string | null
          reviewed_at: string | null
          archived_at: string | null
          archive_reason: string | null
          merged_into_patient_id: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_number?: string | null
          patient_status?: string
          patient_type?: string
          title?: string | null
          first_name: string
          last_name: string
          preferred_name?: string | null
          date_of_birth?: string | null
          id_number?: string | null
          gender?: string | null
          language?: string | null
          email?: string | null
          phone?: string | null
          referral_source?: string | null
          active_icd10_code?: string | null
          assigned_therapist_profile_id?: string | null
          intake_sent_at?: string | null
          intake_started_at?: string | null
          intake_completed_at?: string | null
          reviewed_at?: string | null
          archived_at?: string | null
          archive_reason?: string | null
          merged_into_patient_id?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_number?: string | null
          patient_status?: string
          patient_type?: string
          title?: string | null
          first_name?: string
          last_name?: string
          preferred_name?: string | null
          date_of_birth?: string | null
          id_number?: string | null
          gender?: string | null
          language?: string | null
          email?: string | null
          phone?: string | null
          referral_source?: string | null
          active_icd10_code?: string | null
          assigned_therapist_profile_id?: string | null
          intake_sent_at?: string | null
          intake_started_at?: string | null
          intake_completed_at?: string | null
          reviewed_at?: string | null
          archived_at?: string | null
          archive_reason?: string | null
          merged_into_patient_id?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, TherapistProfileRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
      >
      price_list_items: PublicTable<
        {
          id: string
          tenant_id: string
          price_list_id: string
          procedure_name: string
          procedure_code: string | null
          description: string | null
          price: number
          duration_minutes: number | null
          is_active: boolean
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          price_list_id: string
          procedure_name: string
          procedure_code?: string | null
          description?: string | null
          price?: number
          duration_minutes?: number | null
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          price_list_id?: string
          procedure_name?: string
          procedure_code?: string | null
          description?: string | null
          price?: number
          duration_minutes?: number | null
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PriceListRelationship]
      >
      price_lists: PublicTable<
        {
          id: string
          tenant_id: string
          name: string
          description: string | null
          list_type: string | null
          is_default: boolean
          is_active: boolean
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          list_type?: string | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          list_type?: string | null
          is_default?: boolean
          is_active?: boolean
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
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
      responsible_parties: PublicTable<
        {
          id: string
          tenant_id: string
          patient_id: string
          party_type: string
          relationship_to_patient: string | null
          full_name: string
          organisation_name: string | null
          id_number: string | null
          email: string | null
          phone: string | null
          is_primary: boolean
          is_billing_contact: boolean
          account_responsibility_status: string
          medical_aid_member_number: string | null
          medical_aid_dependant_code: string | null
          metadata: Json
          created_by_profile_id: string | null
          updated_by_profile_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: string
          tenant_id: string
          patient_id: string
          party_type?: string
          relationship_to_patient?: string | null
          full_name: string
          organisation_name?: string | null
          id_number?: string | null
          email?: string | null
          phone?: string | null
          is_primary?: boolean
          is_billing_contact?: boolean
          account_responsibility_status?: string
          medical_aid_member_number?: string | null
          medical_aid_dependant_code?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        {
          id?: string
          tenant_id?: string
          patient_id?: string
          party_type?: string
          relationship_to_patient?: string | null
          full_name?: string
          organisation_name?: string | null
          id_number?: string | null
          email?: string | null
          phone?: string | null
          is_primary?: boolean
          is_billing_contact?: boolean
          account_responsibility_status?: string
          medical_aid_member_number?: string | null
          medical_aid_dependant_code?: string | null
          metadata?: Json
          created_by_profile_id?: string | null
          updated_by_profile_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        },
        [TenantRelationship, PatientRelationship, CreatedByProfileRelationship, UpdatedByProfileRelationship]
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
      complete_session: {
        Args: {
          target_session_id: string
          actual_start_at_input: string
          actual_end_at_input: string
          attendance_outcome_input: string
          session_outcome_input: string
          operational_summary_input?: string | null
        }
        Returns: {
          session_id: string
          completed_session: boolean
          draft_invoice_requested: boolean
          session_status: string
        }[]
      }
      create_session_from_booking: {
        Args: {
          target_booking_id: string
        }
        Returns: {
          session_id: string
          created_session: boolean
          session_status: string
        }[]
      }
      create_draft_invoice_from_session: {
        Args: {
          target_session_id: string
        }
        Returns: {
          invoice_id: string
          created_invoice: boolean
          invoice_status: string
        }[]
      }
      confirm_invoice: {
        Args: {
          target_invoice_id: string
        }
        Returns: {
          invoice_id: string
          confirmed_invoice: boolean
          invoice_status: string
          invoice_number: string | null
        }[]
      }
      issue_invoice: {
        Args: {
          target_invoice_id: string
        }
        Returns: {
          invoice_id: string
          issued_invoice: boolean
          invoice_status: string
          issued_at: string
        }[]
      }
      record_payment: {
        Args: {
          target_tenant_id: string
          financial_account_id_input: string | null
          patient_id_input: string | null
          responsible_party_id_input: string | null
          primary_invoice_id_input: string | null
          payer_name_input: string
          payment_date_input: string
          amount_input: number
          currency_code_input: string
          payment_method_input: string
          payment_reference_input?: string | null
          external_transaction_reference_input?: string | null
          bank_account_id_input?: string | null
          therapist_profile_id_input?: string | null
          practice_location_id_input?: string | null
          notes_input?: string | null
          allocations_input?: Json
        }
        Returns: {
          payment_id: string
          receipt_id: string
          allocated_amount: number
          unallocated_amount: number
          payment_status: string
        }[]
      }
      allocate_payment: {
        Args: {
          target_payment_id: string
          allocations: Json
        }
        Returns: {
          payment_id: string
          allocated_amount: number
          unallocated_amount: number
          payment_status: string
        }[]
      }
      reverse_payment: {
        Args: {
          target_payment_id: string
          reversal_reason_input: string
        }
        Returns: {
          payment_id: string
          reversed_payment: boolean
          payment_status: string
        }[]
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
      reopen_completed_session: {
        Args: {
          target_session_id: string
          reopen_reason_input: string
        }
        Returns: {
          session_id: string
          reopened_session: boolean
          session_status: string
        }[]
      }
      recalculate_invoice_totals: {
        Args: {
          target_invoice_id: string
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
