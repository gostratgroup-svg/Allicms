import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type PracticeProfileRow = Database['public']['Tables']['practice_profiles']['Row']
type PracticeProfileInsert = Database['public']['Tables']['practice_profiles']['Insert']
type PracticeProfileUpdate = Database['public']['Tables']['practice_profiles']['Update']

type PracticeProfileFormState = {
  legal_name: string
  trading_name: string
  business_registration_number: string
  tax_number: string
  vat_number: string
  main_email: string
  main_phone: string
  website: string
  default_time_zone: string
  default_country: string
  default_currency: string
  profile_status: string
}

const emptyPracticeProfileForm: PracticeProfileFormState = {
  legal_name: '',
  trading_name: '',
  business_registration_number: '',
  tax_number: '',
  vat_number: '',
  main_email: '',
  main_phone: '',
  website: '',
  default_time_zone: 'Africa/Johannesburg',
  default_country: 'South Africa',
  default_currency: 'ZAR',
  profile_status: 'draft',
}

const profileStatusOptions = ['draft', 'active', 'incomplete', 'archived']
const currencyOptions = ['ZAR', 'USD', 'EUR', 'GBP']
const countryOptions = ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'United Kingdom', 'United States']
const timeZoneOptions = ['Africa/Johannesburg', 'Africa/Windhoek', 'Europe/London', 'UTC']

function formFromProfile(profile: PracticeProfileRow | null): PracticeProfileFormState {
  if (!profile) return emptyPracticeProfileForm

  return {
    legal_name: profile.legal_name ?? '',
    trading_name: profile.trading_name ?? '',
    business_registration_number: profile.business_registration_number ?? '',
    tax_number: profile.tax_number ?? '',
    vat_number: profile.vat_number ?? '',
    main_email: profile.main_email ?? '',
    main_phone: profile.main_phone ?? '',
    website: profile.website ?? '',
    default_time_zone: profile.default_time_zone,
    default_country: profile.default_country,
    default_currency: profile.default_currency,
    profile_status: profile.profile_status,
  }
}

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function toPracticeProfilePayload(formState: PracticeProfileFormState): Omit<PracticeProfileInsert, 'tenant_id'> {
  return {
    legal_name: emptyToNull(formState.legal_name),
    trading_name: emptyToNull(formState.trading_name),
    business_registration_number: emptyToNull(formState.business_registration_number),
    tax_number: emptyToNull(formState.tax_number),
    vat_number: emptyToNull(formState.vat_number),
    main_email: emptyToNull(formState.main_email),
    main_phone: emptyToNull(formState.main_phone),
    website: emptyToNull(formState.website),
    default_time_zone: formState.default_time_zone,
    default_country: formState.default_country,
    default_currency: formState.default_currency.trim().toUpperCase(),
    profile_status: formState.profile_status,
  }
}

export function PracticeProfilePage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditPracticeProfile = authorization.hasPermission('tenant.practice.configure')
  const [profile, setProfile] = useState<PracticeProfileRow | null>(null)
  const [formState, setFormState] = useState<PracticeProfileFormState>(emptyPracticeProfileForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const hasExistingProfile = Boolean(profile?.id)
  const isReadOnly = !canEditPracticeProfile || saving

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

    async function loadPracticeProfile() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const { data, error } = await supabaseClient
        .from('practice_profiles')
        .select(`
          id,
          tenant_id,
          legal_name,
          trading_name,
          business_registration_number,
          tax_number,
          vat_number,
          main_email,
          main_phone,
          website,
          default_time_zone,
          default_country,
          default_currency,
          profile_status,
          metadata,
          created_at,
          updated_at,
          deleted_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setProfile(null)
        setFormState(emptyPracticeProfileForm)
        setLoading(false)
        return
      }

      const nextProfile = data as PracticeProfileRow | null
      setProfile(nextProfile)
      setFormState(formFromProfile(nextProfile))
      setLoading(false)
    }

    loadPracticeProfile()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const statusTone = useMemo(() => {
    if (formState.profile_status === 'active') return 'success'
    if (formState.profile_status === 'incomplete') return 'warning'
    if (formState.profile_status === 'archived') return 'neutral'
    return 'info'
  }, [formState.profile_status])

  const updateField = (field: keyof PracticeProfileFormState, value: string) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSuccessMessage('')
    setSaveError('')
  }

  const savePracticeProfile = async () => {
    if (!activeTenant?.id || !supabase || !canEditPracticeProfile) return

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const payload = toPracticeProfilePayload(formState)

    const result = profile?.id
      ? await supabase
          .from('practice_profiles')
          .update(payload satisfies PracticeProfileUpdate)
          .eq('id', profile.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('practice_profiles')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedProfile = result.data as PracticeProfileRow
    setProfile(savedProfile)
    setFormState(formFromProfile(savedProfile))
    setSuccessMessage(hasExistingProfile ? 'Practice profile updated.' : 'Practice profile created.')
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading practice profile" description="Checking the active tenant practice profile." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Practice profile unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-profile-page">
      <Card className="practice-profile-summary">
        <div>
          <span>{hasExistingProfile ? 'Active tenant profile' : 'No profile yet'}</span>
          <h3>{formState.trading_name || formState.legal_name || activeTenant?.practice_name || 'Practice profile'}</h3>
          <p>
            This is the tenant-level practice profile. It will later feed documents, communication defaults,
            invoices and patient-facing practice details.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone={statusTone}>{formState.profile_status}</StatusBadge>
          {!canEditPracticeProfile && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      {!hasExistingProfile && (
        <Card className="practice-profile-notice">
          <strong>Practice profile not created yet.</strong>
          <span>Complete the fields below and save to create the first practice profile for this tenant.</span>
        </Card>
      )}

      <Card className="practice-profile-form-card">
        <div className="practice-profile-form-header">
          <div>
            <span>Practice details</span>
            <h3>{hasExistingProfile ? 'Edit practice profile' : 'Create practice profile'}</h3>
          </div>
          {canEditPracticeProfile && (
            <Button disabled={saving} onClick={savePracticeProfile}>
              {saving ? 'Saving' : 'Save Profile'}
            </Button>
          )}
        </div>

        <div className="settings-form-grid practice-profile-form">
          <label>
            <span>Legal name</span>
            <input value={formState.legal_name} disabled={isReadOnly} onChange={(event) => updateField('legal_name', event.target.value)} />
          </label>
          <label>
            <span>Trading name</span>
            <input value={formState.trading_name} disabled={isReadOnly} onChange={(event) => updateField('trading_name', event.target.value)} />
          </label>
          <label>
            <span>Business registration number</span>
            <input value={formState.business_registration_number} disabled={isReadOnly} onChange={(event) => updateField('business_registration_number', event.target.value)} />
          </label>
          <label>
            <span>Tax number</span>
            <input value={formState.tax_number} disabled={isReadOnly} onChange={(event) => updateField('tax_number', event.target.value)} />
          </label>
          <label>
            <span>VAT number</span>
            <input value={formState.vat_number} disabled={isReadOnly} onChange={(event) => updateField('vat_number', event.target.value)} />
          </label>
          <label>
            <span>Main email</span>
            <input type="email" value={formState.main_email} disabled={isReadOnly} onChange={(event) => updateField('main_email', event.target.value)} />
          </label>
          <label>
            <span>Main phone</span>
            <input value={formState.main_phone} disabled={isReadOnly} onChange={(event) => updateField('main_phone', event.target.value)} />
          </label>
          <label>
            <span>Website</span>
            <input type="url" value={formState.website} disabled={isReadOnly} onChange={(event) => updateField('website', event.target.value)} />
          </label>
          <label>
            <span>Default timezone</span>
            <select value={formState.default_time_zone} disabled={isReadOnly} onChange={(event) => updateField('default_time_zone', event.target.value)}>
              {timeZoneOptions.map((timeZone) => <option value={timeZone} key={timeZone}>{timeZone}</option>)}
            </select>
          </label>
          <label>
            <span>Default country</span>
            <select value={formState.default_country} disabled={isReadOnly} onChange={(event) => updateField('default_country', event.target.value)}>
              {countryOptions.map((country) => <option value={country} key={country}>{country}</option>)}
            </select>
          </label>
          <label>
            <span>Default currency</span>
            <select value={formState.default_currency} disabled={isReadOnly} onChange={(event) => updateField('default_currency', event.target.value)}>
              {currencyOptions.map((currency) => <option value={currency} key={currency}>{currency}</option>)}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={formState.profile_status} disabled={isReadOnly} onChange={(event) => updateField('profile_status', event.target.value)}>
              {profileStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {(saveError || successMessage) && (
          <div className={`practice-profile-message ${saveError ? 'error' : 'success'}`}>
            {saveError || successMessage}
          </div>
        )}
      </Card>
    </div>
  )
}
