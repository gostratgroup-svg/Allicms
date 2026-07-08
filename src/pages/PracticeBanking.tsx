import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row']
type BankAccountInsert = Database['public']['Tables']['bank_accounts']['Insert']
type BankAccountUpdate = Database['public']['Tables']['bank_accounts']['Update']

type BankAccountFormState = {
  bank_name: string
  account_holder: string
  account_number: string
  branch_code: string
  account_type: string
  is_default: boolean
  is_active: boolean
}

const emptyBankAccountForm: BankAccountFormState = {
  bank_name: '',
  account_holder: '',
  account_number: '',
  branch_code: '',
  account_type: '',
  is_default: false,
  is_active: true,
}

const accountTypeOptions = ['', 'Current', 'Savings', 'Cheque', 'Transmission', 'Business']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formFromBankAccount(account: BankAccountRow | null): BankAccountFormState {
  if (!account) return emptyBankAccountForm

  return {
    bank_name: account.bank_name,
    account_holder: account.account_holder,
    account_number: account.account_number,
    branch_code: account.branch_code ?? '',
    account_type: account.account_type ?? '',
    is_default: account.is_default,
    is_active: account.is_active,
  }
}

function toBankAccountPayload(formState: BankAccountFormState): Omit<BankAccountInsert, 'tenant_id'> {
  return {
    owner_type: 'tenant',
    owner_id: null,
    bank_name: formState.bank_name.trim(),
    account_holder: formState.account_holder.trim(),
    account_number: formState.account_number.trim(),
    branch_code: emptyToNull(formState.branch_code),
    account_type: emptyToNull(formState.account_type),
    is_default: formState.is_default,
    is_active: formState.is_active,
  }
}

export function PracticeBankingPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditBanking = authorization.hasPermission('tenant.finance.manage', 'tenant.practice.configure')
  const [accounts, setAccounts] = useState<BankAccountRow[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [formState, setFormState] = useState<BankAccountFormState>(emptyBankAccountForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  )
  const isCreating = !selectedAccountId
  const isReadOnly = !canEditBanking || saving

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

    async function loadBankAccounts() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const { data, error } = await supabaseClient
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
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('bank_name', { ascending: true })

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setAccounts([])
        setSelectedAccountId(null)
        setFormState(emptyBankAccountForm)
        setLoading(false)
        return
      }

      setAccounts((data ?? []) as BankAccountRow[])
      setSelectedAccountId(null)
      setFormState(emptyBankAccountForm)
      setLoading(false)
    }

    loadBankAccounts()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof BankAccountFormState>(field: Field, value: BankAccountFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const startCreateAccount = () => {
    setSelectedAccountId(null)
    setFormState(emptyBankAccountForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const startEditAccount = (account: BankAccountRow) => {
    setSelectedAccountId(account.id)
    setFormState(formFromBankAccount(account))
    setSaveError('')
    setSuccessMessage('')
  }

  const clearOtherDefaults = async (tenantId: string, currentAccountId?: string) => {
    if (!supabase) return { error: null }

    let query = supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .eq('owner_type', 'tenant')
      .is('owner_id', null)
      .is('deleted_at', null)

    if (currentAccountId) {
      query = query.neq('id', currentAccountId)
    }

    return query
  }

  const saveBankAccount = async () => {
    if (!activeTenant?.id || !supabase || !canEditBanking) return

    if (!formState.bank_name.trim() || !formState.account_holder.trim() || !formState.account_number.trim()) {
      setSaveError('Bank name, account holder and account number are required.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const tenantId = activeTenant.id
    const payload = toBankAccountPayload(formState)

    if (formState.is_default) {
      const clearResult = await clearOtherDefaults(tenantId, selectedAccount?.id)

      if (clearResult.error) {
        setSaveError(`Could not clear the previous default account: ${clearResult.error.message}`)
        setSaving(false)
        return
      }
    }

    const result = selectedAccount?.id
      ? await supabase
          .from('bank_accounts')
          .update(payload satisfies BankAccountUpdate)
          .eq('id', selectedAccount.id)
          .eq('tenant_id', tenantId)
          .eq('owner_type', 'tenant')
          .is('owner_id', null)
          .select()
          .single()
      : await supabase
          .from('bank_accounts')
          .insert({ ...payload, tenant_id: tenantId })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedAccount = result.data as BankAccountRow
    setAccounts((currentAccounts) => {
      const nextAccounts = selectedAccount?.id
        ? currentAccounts.map((account) => (account.id === savedAccount.id ? savedAccount : formState.is_default ? { ...account, is_default: false } : account))
        : [...currentAccounts.map((account) => (formState.is_default ? { ...account, is_default: false } : account)), savedAccount]

      return nextAccounts.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.bank_name.localeCompare(b.bank_name))
    })
    setSelectedAccountId(savedAccount.id)
    setFormState(formFromBankAccount(savedAccount))
    setSuccessMessage(selectedAccount?.id ? 'Bank account updated.' : 'Bank account created.')
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading banking details" description="Checking tenant-owned practice bank accounts." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Banking details unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-banking-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Tenant-owned banking</span>
          <h3>{activeTenant?.practice_name ?? 'Practice banking details'}</h3>
          <p>
            Manage practice bank accounts used by future invoices, statements and payment instructions.
            Therapist-owned and location-owned accounts are intentionally not connected yet.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{accounts.length} accounts</StatusBadge>
          {!canEditBanking && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="practice-locations-layout">
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Account list</span>
              <h3>Bank accounts</h3>
            </div>
            {canEditBanking && (
              <Button variant="secondary" onClick={startCreateAccount}>
                New Account
              </Button>
            )}
          </div>

          {accounts.length === 0 ? (
            <EmptyState
              title="No bank accounts yet"
              description="Create the first tenant-owned practice bank account."
            />
          ) : (
            <div className="practice-location-cards">
              {accounts.map((account) => (
                <button
                  className={selectedAccountId === account.id ? 'active' : ''}
                  type="button"
                  onClick={() => startEditAccount(account)}
                  key={account.id}
                >
                  <div>
                    <strong>{account.bank_name}</strong>
                    <span>{account.account_holder} · {account.account_number}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    {account.is_default && <StatusBadge tone="info">Default</StatusBadge>}
                    <StatusBadge tone={account.is_active ? 'success' : 'neutral'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="practice-profile-form-card">
          <div className="practice-profile-form-header">
            <div>
              <span>{isCreating ? 'Create account' : 'Edit account'}</span>
              <h3>{isCreating ? 'New bank account' : formState.bank_name || 'Bank account details'}</h3>
            </div>
            {canEditBanking && (
              <Button disabled={saving} onClick={saveBankAccount}>
                {saving ? 'Saving' : 'Save Account'}
              </Button>
            )}
          </div>

          <div className="settings-form-grid practice-location-form">
            <label>
              <span>Bank name</span>
              <input value={formState.bank_name} disabled={isReadOnly} onChange={(event) => updateField('bank_name', event.target.value)} />
            </label>
            <label>
              <span>Account holder</span>
              <input value={formState.account_holder} disabled={isReadOnly} onChange={(event) => updateField('account_holder', event.target.value)} />
            </label>
            <label>
              <span>Account number</span>
              <input value={formState.account_number} disabled={isReadOnly} onChange={(event) => updateField('account_number', event.target.value)} />
            </label>
            <label>
              <span>Branch code</span>
              <input value={formState.branch_code} disabled={isReadOnly} onChange={(event) => updateField('branch_code', event.target.value)} />
            </label>
            <label>
              <span>Account type</span>
              <select value={formState.account_type} disabled={isReadOnly} onChange={(event) => updateField('account_type', event.target.value)}>
                {accountTypeOptions.map((accountType) => (
                  <option value={accountType} key={accountType}>{accountType || 'Not specified'}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={formState.is_active ? 'active' : 'inactive'} disabled={isReadOnly} onChange={(event) => updateField('is_active', event.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="practice-number-toggle">
              <input type="checkbox" checked={formState.is_default} disabled={isReadOnly} onChange={(event) => updateField('is_default', event.target.checked)} />
              <span>Default account</span>
            </label>
          </div>

          {(saveError || successMessage) && (
            <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
              {saveError || successMessage}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
