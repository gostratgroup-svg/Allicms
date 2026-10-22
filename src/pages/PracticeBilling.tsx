import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EditableField } from '../components/EditableField'
import { EditSaveControls } from '../components/EditSaveControls'
import { FinanceIcon } from '../components/icons'
import { ErrorState, LoadingState } from '../components/UiState'
import { Button, Card } from '../components/ui'
import { showErrorNotice, showSuccessNotice } from '../lib/appNotice'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database, Json } from '../lib/database.types'

type BillingSettingsRow = Database['public']['Tables']['billing_settings']['Row']
type BillingSettingsInsert = Database['public']['Tables']['billing_settings']['Insert']
type BillingSettingsUpdate = Database['public']['Tables']['billing_settings']['Update']
type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row']
type BillingCycle = 'per_invoice' | 'per_statement'
type StatementSchedule = 'monthly' | 'custom'
const financeFlagCycleOptions = Array.from({ length: 12 }, (_, index) => String(index + 1))

type BillingSettingsFormState = {
  invoice_prefix: string
  next_invoice_number: string
  statement_prefix: string
  next_statement_number: string
  payment_terms_days: string
  default_bank_account_id: string
  allow_therapist_billing: boolean
  allow_therapist_bank_accounts: boolean
  allow_therapist_practice_number_overrides: boolean
  billing_cycle: BillingCycle
  statement_schedule: StatementSchedule
  orange_flag_cycles: string
  red_flag_cycles: string
  black_flag_cycles: string
}

const emptyBillingSettingsForm: BillingSettingsFormState = {
  invoice_prefix: 'INV',
  next_invoice_number: '1',
  statement_prefix: 'ST',
  next_statement_number: '1',
  payment_terms_days: '7',
  default_bank_account_id: '',
  allow_therapist_billing: false,
  allow_therapist_bank_accounts: false,
  allow_therapist_practice_number_overrides: false,
  billing_cycle: 'per_invoice',
  statement_schedule: 'monthly',
  orange_flag_cycles: '1',
  red_flag_cycles: '2',
  black_flag_cycles: '3',
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function formFromBillingSettings(settings: BillingSettingsRow | null): BillingSettingsFormState {
  if (!settings) return emptyBillingSettingsForm

  const metadata = isJsonObject(settings.metadata) ? settings.metadata : {}

  return {
    invoice_prefix: settings.invoice_prefix,
    next_invoice_number: String(settings.next_invoice_number),
    statement_prefix: settings.statement_prefix,
    next_statement_number: String(settings.next_statement_number),
    payment_terms_days: String(settings.payment_terms_days),
    default_bank_account_id: settings.default_bank_account_id ?? '',
    allow_therapist_billing: settings.allow_therapist_billing,
    allow_therapist_bank_accounts: settings.allow_therapist_bank_accounts,
    allow_therapist_practice_number_overrides: metadata.allow_therapist_practice_number_overrides === true,
    billing_cycle: metadata.billing_cycle === 'per_statement' ? 'per_statement' : 'per_invoice',
    statement_schedule: metadata.statement_schedule === 'custom' ? 'custom' : 'monthly',
    orange_flag_cycles: String(typeof metadata.orange_flag_cycles === 'number' ? metadata.orange_flag_cycles : 1),
    red_flag_cycles: String(typeof metadata.red_flag_cycles === 'number' ? metadata.red_flag_cycles : 2),
    black_flag_cycles: String(typeof metadata.black_flag_cycles === 'number' ? metadata.black_flag_cycles : 3),
  }
}

function formatBillingCycle(formState: BillingSettingsFormState) {
  if (formState.billing_cycle === 'per_invoice') return 'Per invoice'
  return formState.statement_schedule === 'monthly'
    ? 'Per statement · Monthly on the 27th'
    : 'Per statement · Custom'
}

function toPositiveInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

function validateBillingSettings(formState: BillingSettingsFormState) {
  const nextInvoiceNumber = toPositiveInteger(formState.next_invoice_number)
  const nextStatementNumber = toPositiveInteger(formState.next_statement_number)
  const paymentTermsDays = toPositiveInteger(formState.payment_terms_days)
  const orangeFlagCycles = toPositiveInteger(formState.orange_flag_cycles)
  const redFlagCycles = toPositiveInteger(formState.red_flag_cycles)
  const blackFlagCycles = toPositiveInteger(formState.black_flag_cycles)

  if (!formState.invoice_prefix.trim()) return 'Invoice prefix cannot be empty.'
  if (!formState.statement_prefix.trim()) return 'Statement prefix cannot be empty.'
  if (!Number.isInteger(nextInvoiceNumber) || nextInvoiceNumber <= 0) return 'Next invoice number must be a positive integer.'
  if (!Number.isInteger(nextStatementNumber) || nextStatementNumber <= 0) return 'Next statement number must be a positive integer.'
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays <= 0) return 'Payment terms days must be a positive integer.'
  if (formState.billing_cycle === 'per_statement' && formState.statement_schedule === 'monthly') {
    if (![orangeFlagCycles, redFlagCycles, blackFlagCycles].every((cycles) => Number.isInteger(cycles) && cycles > 0)) return 'Finance flag cycles must be positive integers.'
    if (!(orangeFlagCycles < redFlagCycles && redFlagCycles < blackFlagCycles)) return 'Finance flag cycles must increase from orange to red to black.'
  }

  return ''
}

function toBillingSettingsPayload(formState: BillingSettingsFormState, existingSettings: BillingSettingsRow | null): Omit<BillingSettingsInsert, 'tenant_id'> {
  const existingMetadata = existingSettings && isJsonObject(existingSettings.metadata) ? existingSettings.metadata : {}

  return {
    invoice_prefix: formState.invoice_prefix.trim().toUpperCase(),
    next_invoice_number: toPositiveInteger(formState.next_invoice_number),
    statement_prefix: formState.statement_prefix.trim().toUpperCase(),
    next_statement_number: toPositiveInteger(formState.next_statement_number),
    payment_terms_days: toPositiveInteger(formState.payment_terms_days),
    default_bank_account_id: formState.default_bank_account_id || null,
    allow_therapist_billing: formState.allow_therapist_billing,
    allow_therapist_bank_accounts: formState.allow_therapist_bank_accounts,
    metadata: {
      ...existingMetadata,
      allow_therapist_practice_number_overrides: formState.allow_therapist_practice_number_overrides,
      billing_cycle: formState.billing_cycle,
      statement_schedule: formState.statement_schedule,
      monthly_statement_day: formState.statement_schedule === 'monthly' ? 27 : null,
      orange_flag_cycles: toPositiveInteger(formState.orange_flag_cycles),
      red_flag_cycles: toPositiveInteger(formState.red_flag_cycles),
      black_flag_cycles: toPositiveInteger(formState.black_flag_cycles),
    },
  }
}

function formatBankAccount(account: BankAccountRow) {
  const accountType = account.account_type ? ` · ${account.account_type}` : ''
  return `${account.bank_name} · ${account.account_holder}${accountType}`
}

export function PracticeBillingPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditBilling = authorization.hasPermission('tenant.finance.manage', 'tenant.practice.configure')
  const [billingSettings, setBillingSettings] = useState<BillingSettingsRow | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [formState, setFormState] = useState<BillingSettingsFormState>(emptyBillingSettingsForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const hasExistingSettings = Boolean(billingSettings?.id)
  const showEditableFields = !hasExistingSettings || isEditing
  const isReadOnly = !canEditBilling || saving || (hasExistingSettings && !isEditing)

  const defaultBankAccountLabel = useMemo(() => {
    const selectedBankAccount = bankAccounts.find((account) => account.id === formState.default_bank_account_id)
    return selectedBankAccount ? formatBankAccount(selectedBankAccount) : 'No default bank account selected'
  }, [bankAccounts, formState.default_bank_account_id])

  useEffect(() => {
    if (!activeTenant?.id) {
      setLoading(false)
      setLoadError('No active tenant workspace is selected.')
      return
    }

    if (!supabase) {
      setLoading(false)
      setLoadError('Supabase is not configured for this environment.')
      return
    }

    let isMounted = true
    const supabaseClient = supabase
    const tenantId = activeTenant.id

    async function loadBillingConfiguration() {
      setLoading(true)
      setLoadError('')

      const [settingsResult, bankAccountsResult] = await Promise.all([
        supabaseClient
          .from('billing_settings')
          .select(`
            id,
            tenant_id,
            practice_profile_id,
            invoice_prefix,
            next_invoice_number,
            statement_prefix,
            next_statement_number,
            payment_terms_days,
            default_bank_account_id,
            allow_therapist_billing,
            allow_therapist_bank_accounts,
            allow_price_override,
            metadata,
            created_at,
            updated_at,
            deleted_at
          `)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabaseClient
          .from('bank_accounts')
          .select(`
            id,
            tenant_id,
            owner_type,
            owner_id,
            account_label,
            bank_name,
            account_holder,
            account_number,
            branch_code,
            account_type,
            is_default,
            is_active,
            metadata,
            created_at,
            updated_at,
            deleted_at
          `)
          .eq('tenant_id', tenantId)
          .eq('owner_type', 'tenant')
          .is('owner_id', null)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('is_default', { ascending: false })
          .order('bank_name', { ascending: true }),
      ])

      if (!isMounted) return

      if (settingsResult.error) {
        setLoadError(settingsResult.error.message)
        setLoading(false)
        return
      }

      if (bankAccountsResult.error) {
        setLoadError(bankAccountsResult.error.message)
        setLoading(false)
        return
      }

      const nextSettings = settingsResult.data as BillingSettingsRow | null
      setBillingSettings(nextSettings)
      setBankAccounts((bankAccountsResult.data ?? []) as BankAccountRow[])
      setFormState(formFromBillingSettings(nextSettings))
      setIsEditing(!nextSettings)
      setLoading(false)
    }

    loadBillingConfiguration()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof BillingSettingsFormState>(field: Field, value: BillingSettingsFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
  }

  const saveBillingSettings = async () => {
    if (!activeTenant?.id || !supabase || !canEditBilling) return

    const validationError = validateBillingSettings(formState)
    if (validationError) {
      showErrorNotice(validationError)
      return
    }

    setSaving(true)

    const payload = toBillingSettingsPayload(formState, billingSettings)

    const result = billingSettings?.id
      ? await supabase
          .from('billing_settings')
          .update(payload satisfies BillingSettingsUpdate)
          .eq('id', billingSettings.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('billing_settings')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      showErrorNotice(result.error.message)
      setSaving(false)
      return
    }

    const savedSettings = result.data as BillingSettingsRow
    setBillingSettings(savedSettings)
    setFormState(formFromBillingSettings(savedSettings))
    showSuccessNotice(hasExistingSettings ? 'Billing configuration updated.' : 'Billing configuration created.')
    setIsEditing(false)
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading billing configuration" description="Checking tenant billing defaults and active bank accounts." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Billing configuration unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-billing-page">
      {!hasExistingSettings && (
        <Card className="practice-profile-notice">
          <strong>Billing configuration not created yet.</strong>
          <span>Review the sensible defaults below and save to create billing settings for this tenant.</span>
        </Card>
      )}

      <Card className="practice-profile-form-card">
        <div className="practice-profile-form-header">
          <div>
            <span>{hasExistingSettings ? (isEditing ? 'Edit billing defaults' : 'Saved billing defaults') : 'Create billing defaults'}</span>
            <h3>Invoice and statement setup</h3>
          </div>
          {canEditBilling && hasExistingSettings && (
            <EditSaveControls
              isEditing={isEditing}
              isSaving={saving}
              onEdit={() => setIsEditing(true)}
              onSave={saveBillingSettings}
              editLabel="Edit billing configuration"
              saveLabel="Save billing configuration"
            />
          )}
          {canEditBilling && !hasExistingSettings && (
            <Button disabled={saving} onClick={saveBillingSettings}>
              {saving ? 'Saving' : 'Save Billing'}
            </Button>
          )}
        </div>

        <div className="settings-form-grid practice-billing-form">
          <EditableField label="Invoice prefix" isEditing={showEditableFields} value={formState.invoice_prefix}>
            <input value={formState.invoice_prefix} disabled={isReadOnly} onChange={(event) => updateField('invoice_prefix', event.target.value)} />
          </EditableField>
          <EditableField label="Next invoice number" isEditing={showEditableFields} value={formState.next_invoice_number}>
            <input type="number" min="1" value={formState.next_invoice_number} disabled={isReadOnly} onChange={(event) => updateField('next_invoice_number', event.target.value)} />
          </EditableField>
          <EditableField label="Statement prefix" isEditing={showEditableFields} value={formState.statement_prefix}>
            <input value={formState.statement_prefix} disabled={isReadOnly} onChange={(event) => updateField('statement_prefix', event.target.value)} />
          </EditableField>
          <EditableField label="Next statement number" isEditing={showEditableFields} value={formState.next_statement_number}>
            <input type="number" min="1" value={formState.next_statement_number} disabled={isReadOnly} onChange={(event) => updateField('next_statement_number', event.target.value)} />
          </EditableField>
          <EditableField label="Payment terms days" isEditing={showEditableFields} value={formState.payment_terms_days}>
            <input type="number" min="1" value={formState.payment_terms_days} disabled={isReadOnly} onChange={(event) => updateField('payment_terms_days', event.target.value)} />
          </EditableField>
          <EditableField label="Default bank account" isEditing={showEditableFields} value={defaultBankAccountLabel}>
            <select value={formState.default_bank_account_id} disabled={isReadOnly || bankAccounts.length === 0} onChange={(event) => updateField('default_bank_account_id', event.target.value)}>
              <option value="">{bankAccounts.length ? 'No default account' : 'No active accounts available'}</option>
              {bankAccounts.map((account) => (
                <option value={account.id} key={account.id}>{formatBankAccount(account)}</option>
              ))}
            </select>
          </EditableField>
          <EditableField label="Billing cycle" isEditing={showEditableFields} value={formatBillingCycle(formState)}>
            <select value={formState.billing_cycle} disabled={isReadOnly} onChange={(event) => updateField('billing_cycle', event.target.value as BillingCycle)}>
              <option value="per_invoice">Per invoice</option>
              <option value="per_statement">Per statement</option>
            </select>
          </EditableField>
          {showEditableFields && formState.billing_cycle === 'per_statement' && (
            <EditableField label="Statement schedule" isEditing value={formatBillingCycle(formState)}>
              <select value={formState.statement_schedule} disabled={isReadOnly} onChange={(event) => updateField('statement_schedule', event.target.value as StatementSchedule)}>
                <option value="monthly">Monthly · available on the 27th</option>
                <option value="custom">Custom · create manually</option>
              </select>
            </EditableField>
          )}
          {formState.billing_cycle === 'per_statement' && formState.statement_schedule === 'monthly' && (
            <div className="billing-flag-rules" role="group" aria-label="Monthly finance flag rules">
              {([
                ['orange', 'Orange', 'orange_flag_cycles'],
                ['red', 'Red', 'red_flag_cycles'],
                ['black', 'Black', 'black_flag_cycles'],
              ] as const).map(([tone, label, field]) => (
                <div className="billing-flag-rule" key={tone}>
                  <strong>{label} Flag</strong>
                  <span className={`billing-flag-icon finance-flag-${tone}`} aria-hidden="true"><FinanceIcon size={16} /></span>
                  <span>after</span>
                  {showEditableFields ? (
                    <select aria-label={`${label} flag monthly cycle`} value={formState[field]} disabled={isReadOnly} onChange={(event) => updateField(field, event.target.value)}>
                      {financeFlagCycleOptions.map((cycle) => <option value={cycle} key={cycle}>{cycle}</option>)}
                    </select>
                  ) : (
                    <strong className="billing-flag-cycle-value">{formState[field]}</strong>
                  )}
                  <span>{formState[field] === '1' ? 'Month' : 'Months'}</span>
                </div>
              ))}
            </div>
          )}
          {!showEditableFields && (
            <>
              <EditableField label="Therapist billing overrides" isEditing={false} value={formState.allow_therapist_billing ? 'Allowed' : 'Not allowed'}>{null}</EditableField>
              <EditableField label="Therapist bank account overrides" isEditing={false} value={formState.allow_therapist_bank_accounts ? 'Allowed' : 'Not allowed'}>{null}</EditableField>
              <EditableField label="Therapist practice number overrides" isEditing={false} value={formState.allow_therapist_practice_number_overrides ? 'Allowed' : 'Not allowed'}>{null}</EditableField>
            </>
          )}
        </div>

        {showEditableFields && <div className="practice-billing-toggle-grid">
          <label className="practice-number-toggle">
            <input type="checkbox" checked={formState.allow_therapist_billing} disabled={isReadOnly} onChange={(event) => updateField('allow_therapist_billing', event.target.checked)} />
            <span>Allow therapist billing overrides</span>
          </label>
          <label className="practice-number-toggle">
            <input type="checkbox" checked={formState.allow_therapist_bank_accounts} disabled={isReadOnly} onChange={(event) => updateField('allow_therapist_bank_accounts', event.target.checked)} />
            <span>Allow therapist bank account overrides</span>
          </label>
          <label className="practice-number-toggle">
            <input type="checkbox" checked={formState.allow_therapist_practice_number_overrides} disabled={isReadOnly} onChange={(event) => updateField('allow_therapist_practice_number_overrides', event.target.checked)} />
            <span>Allow therapist practice number overrides</span>
          </label>
        </div>}

        <Card className="practice-billing-bank-preview">
          <span>Selected bank account</span>
          <strong>{defaultBankAccountLabel}</strong>
        </Card>

      </Card>
    </div>
  )
}
