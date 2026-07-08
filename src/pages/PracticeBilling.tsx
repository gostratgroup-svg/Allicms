import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database, Json } from '../lib/database.types'

type BillingSettingsRow = Database['public']['Tables']['billing_settings']['Row']
type BillingSettingsInsert = Database['public']['Tables']['billing_settings']['Insert']
type BillingSettingsUpdate = Database['public']['Tables']['billing_settings']['Update']
type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row']

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
  }
}

function toPositiveInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

function validateBillingSettings(formState: BillingSettingsFormState) {
  const nextInvoiceNumber = toPositiveInteger(formState.next_invoice_number)
  const nextStatementNumber = toPositiveInteger(formState.next_statement_number)
  const paymentTermsDays = toPositiveInteger(formState.payment_terms_days)

  if (!formState.invoice_prefix.trim()) return 'Invoice prefix cannot be empty.'
  if (!formState.statement_prefix.trim()) return 'Statement prefix cannot be empty.'
  if (!Number.isInteger(nextInvoiceNumber) || nextInvoiceNumber <= 0) return 'Next invoice number must be a positive integer.'
  if (!Number.isInteger(nextStatementNumber) || nextStatementNumber <= 0) return 'Next statement number must be a positive integer.'
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays <= 0) return 'Payment terms days must be a positive integer.'

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
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const hasExistingSettings = Boolean(billingSettings?.id)
  const isReadOnly = !canEditBilling || saving

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
      setSaveError('')
      setSuccessMessage('')

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
      setLoading(false)
    }

    loadBillingConfiguration()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof BillingSettingsFormState>(field: Field, value: BillingSettingsFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const saveBillingSettings = async () => {
    if (!activeTenant?.id || !supabase || !canEditBilling) return

    const validationError = validateBillingSettings(formState)
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

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
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedSettings = result.data as BillingSettingsRow
    setBillingSettings(savedSettings)
    setFormState(formFromBillingSettings(savedSettings))
    setSuccessMessage(hasExistingSettings ? 'Billing configuration updated.' : 'Billing configuration created.')
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
      <Card className="practice-profile-summary">
        <div>
          <span>Billing defaults</span>
          <h3>{activeTenant?.practice_name ?? 'Billing configuration'}</h3>
          <p>
            Configure the tenant billing defaults that future invoice and statement workflows will use.
            This step does not create invoices, statements or live numbering yet.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone={hasExistingSettings ? 'success' : 'info'}>
            {hasExistingSettings ? 'Configured' : 'Not created'}
          </StatusBadge>
          {!canEditBilling && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      {!hasExistingSettings && (
        <Card className="practice-profile-notice">
          <strong>Billing configuration not created yet.</strong>
          <span>Review the sensible defaults below and save to create billing settings for this tenant.</span>
        </Card>
      )}

      <Card className="practice-profile-form-card">
        <div className="practice-profile-form-header">
          <div>
            <span>{hasExistingSettings ? 'Edit billing defaults' : 'Create billing defaults'}</span>
            <h3>Invoice and statement setup</h3>
          </div>
          {canEditBilling && (
            <Button disabled={saving} onClick={saveBillingSettings}>
              {saving ? 'Saving' : 'Save Billing'}
            </Button>
          )}
        </div>

        <div className="settings-form-grid practice-billing-form">
          <label>
            <span>Invoice prefix</span>
            <input value={formState.invoice_prefix} disabled={isReadOnly} onChange={(event) => updateField('invoice_prefix', event.target.value)} />
          </label>
          <label>
            <span>Next invoice number</span>
            <input type="number" min="1" value={formState.next_invoice_number} disabled={isReadOnly} onChange={(event) => updateField('next_invoice_number', event.target.value)} />
          </label>
          <label>
            <span>Statement prefix</span>
            <input value={formState.statement_prefix} disabled={isReadOnly} onChange={(event) => updateField('statement_prefix', event.target.value)} />
          </label>
          <label>
            <span>Next statement number</span>
            <input type="number" min="1" value={formState.next_statement_number} disabled={isReadOnly} onChange={(event) => updateField('next_statement_number', event.target.value)} />
          </label>
          <label>
            <span>Payment terms days</span>
            <input type="number" min="1" value={formState.payment_terms_days} disabled={isReadOnly} onChange={(event) => updateField('payment_terms_days', event.target.value)} />
          </label>
          <label>
            <span>Default bank account</span>
            <select value={formState.default_bank_account_id} disabled={isReadOnly || bankAccounts.length === 0} onChange={(event) => updateField('default_bank_account_id', event.target.value)}>
              <option value="">{bankAccounts.length ? 'No default account' : 'No active accounts available'}</option>
              {bankAccounts.map((account) => (
                <option value={account.id} key={account.id}>{formatBankAccount(account)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="practice-billing-toggle-grid">
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
        </div>

        <Card className="practice-billing-bank-preview">
          <span>Selected bank account</span>
          <strong>{defaultBankAccountLabel}</strong>
        </Card>

        {(saveError || successMessage) && (
          <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
            {saveError || successMessage}
          </div>
        )}
      </Card>
    </div>
  )
}
