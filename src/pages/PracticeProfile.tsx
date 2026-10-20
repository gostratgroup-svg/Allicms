import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EditableField } from '../components/EditableField'
import { EditSaveControls } from '../components/EditSaveControls'
import { ErrorState, LoadingState } from '../components/UiState'
import { Button, Card } from '../components/ui'
import { showErrorNotice, showSuccessNotice } from '../lib/appNotice'
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
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const hasExistingProfile = Boolean(profile?.id)
  const showEditableFields = !hasExistingProfile || isEditing
  const isReadOnly = !canEditPracticeProfile || saving || (hasExistingProfile && !isEditing)

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
      setIsEditing(!nextProfile)
      setLoading(false)
    }

    loadPracticeProfile()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = (field: keyof PracticeProfileFormState, value: string) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
  }

  const savePracticeProfile = async () => {
    if (!activeTenant?.id || !supabase || !canEditPracticeProfile) return

    setSaving(true)

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
      showErrorNotice(`Practice profile could not be saved: ${result.error.message}`)
      setSaving(false)
      return
    }

    const savedProfile = result.data as PracticeProfileRow
    setProfile(savedProfile)
    setFormState(formFromProfile(savedProfile))
    showSuccessNotice(hasExistingProfile ? 'Practice profile updated.' : 'Practice profile created.')
    setIsEditing(false)
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
            <h3>{hasExistingProfile ? (isEditing ? 'Edit practice profile' : 'Practice profile') : 'Create practice profile'}</h3>
          </div>
          {canEditPracticeProfile && hasExistingProfile && (
            <EditSaveControls
              isEditing={isEditing}
              isSaving={saving}
              onEdit={() => {
                setIsEditing(true)
              }}
              onSave={savePracticeProfile}
              editLabel="Edit practice profile"
              saveLabel="Save practice profile"
            />
          )}
          {canEditPracticeProfile && !hasExistingProfile && (
            <Button disabled={saving} onClick={savePracticeProfile}>
              {saving ? 'Saving' : 'Save Profile'}
            </Button>
          )}
        </div>

        <div className="settings-form-grid practice-profile-form">
          <EditableField label="Legal name" isEditing={showEditableFields} value={formState.legal_name}>
            <input value={formState.legal_name} disabled={isReadOnly} onChange={(event) => updateField('legal_name', event.target.value)} />
          </EditableField>
          <EditableField label="Trading name" isEditing={showEditableFields} value={formState.trading_name}>
            <input value={formState.trading_name} disabled={isReadOnly} onChange={(event) => updateField('trading_name', event.target.value)} />
          </EditableField>
          <EditableField label="Business registration number" isEditing={showEditableFields} value={formState.business_registration_number}>
            <input value={formState.business_registration_number} disabled={isReadOnly} onChange={(event) => updateField('business_registration_number', event.target.value)} />
          </EditableField>
          <EditableField label="Tax number" isEditing={showEditableFields} value={formState.tax_number}>
            <input value={formState.tax_number} disabled={isReadOnly} onChange={(event) => updateField('tax_number', event.target.value)} />
          </EditableField>
          <EditableField label="VAT number" isEditing={showEditableFields} value={formState.vat_number}>
            <input value={formState.vat_number} disabled={isReadOnly} onChange={(event) => updateField('vat_number', event.target.value)} />
          </EditableField>
          <EditableField label="Main email" isEditing={showEditableFields} value={formState.main_email}>
            <input type="email" value={formState.main_email} disabled={isReadOnly} onChange={(event) => updateField('main_email', event.target.value)} />
          </EditableField>
          <EditableField label="Main phone" isEditing={showEditableFields} value={formState.main_phone}>
            <input value={formState.main_phone} disabled={isReadOnly} onChange={(event) => updateField('main_phone', event.target.value)} />
          </EditableField>
          <EditableField label="Website" isEditing={showEditableFields} value={formState.website}>
            <input type="url" value={formState.website} disabled={isReadOnly} onChange={(event) => updateField('website', event.target.value)} />
          </EditableField>
          <EditableField label="Default timezone" isEditing={showEditableFields} value={formState.default_time_zone}>
            <select value={formState.default_time_zone} disabled={isReadOnly} onChange={(event) => updateField('default_time_zone', event.target.value)}>
              {timeZoneOptions.map((timeZone) => <option value={timeZone} key={timeZone}>{timeZone}</option>)}
            </select>
          </EditableField>
          <EditableField label="Default country" isEditing={showEditableFields} value={formState.default_country}>
            <select value={formState.default_country} disabled={isReadOnly} onChange={(event) => updateField('default_country', event.target.value)}>
              {countryOptions.map((country) => <option value={country} key={country}>{country}</option>)}
            </select>
          </EditableField>
          <EditableField label="Default currency" isEditing={showEditableFields} value={formState.default_currency}>
            <select value={formState.default_currency} disabled={isReadOnly} onChange={(event) => updateField('default_currency', event.target.value)}>
              {currencyOptions.map((currency) => <option value={currency} key={currency}>{currency}</option>)}
            </select>
          </EditableField>
          <EditableField label="Status" isEditing={showEditableFields} value={formState.profile_status}>
            <select value={formState.profile_status} disabled={isReadOnly} onChange={(event) => updateField('profile_status', event.target.value)}>
              {profileStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
            </select>
          </EditableField>
        </div>
      </Card>
    </div>
  )
}
