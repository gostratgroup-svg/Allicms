import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAuthorization } from '../auth/permissions'
import { EmptyState, ErrorState, LoadingState } from '../components/UiState'
import { Button, Card, StatusBadge } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type PracticeLocationRow = Database['public']['Tables']['practice_locations']['Row']
type PracticeLocationInsert = Database['public']['Tables']['practice_locations']['Insert']
type PracticeLocationUpdate = Database['public']['Tables']['practice_locations']['Update']

type PracticeLocationFormState = {
  location_name: string
  location_type: string
  address_line_1: string
  address_line_2: string
  suburb: string
  city: string
  province: string
  postal_code: string
  country: string
  contact_email: string
  contact_phone: string
  room_venue_notes: string
  is_main_location: boolean
  is_active: boolean
}

const emptyLocationForm: PracticeLocationFormState = {
  location_name: '',
  location_type: 'practice',
  address_line_1: '',
  address_line_2: '',
  suburb: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'South Africa',
  contact_email: '',
  contact_phone: '',
  room_venue_notes: '',
  is_main_location: false,
  is_active: true,
}

const locationTypeOptions = ['practice', 'satellite', 'telehealth', 'partner', 'other']
const countryOptions = ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'United Kingdom', 'United States']

function emptyToNull(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function formFromLocation(location: PracticeLocationRow | null): PracticeLocationFormState {
  if (!location) return emptyLocationForm

  return {
    location_name: location.location_name,
    location_type: location.location_type,
    address_line_1: location.address_line_1 ?? '',
    address_line_2: location.address_line_2 ?? '',
    suburb: location.suburb ?? '',
    city: location.city ?? '',
    province: location.province ?? '',
    postal_code: location.postal_code ?? '',
    country: location.country,
    contact_email: location.contact_email ?? '',
    contact_phone: location.contact_phone ?? '',
    room_venue_notes: location.room_venue_notes ?? '',
    is_main_location: location.is_main_location,
    is_active: location.is_active,
  }
}

function toLocationPayload(formState: PracticeLocationFormState): Omit<PracticeLocationInsert, 'tenant_id'> {
  return {
    location_name: formState.location_name.trim(),
    location_type: formState.location_type,
    address_line_1: emptyToNull(formState.address_line_1),
    address_line_2: emptyToNull(formState.address_line_2),
    suburb: emptyToNull(formState.suburb),
    city: emptyToNull(formState.city),
    province: emptyToNull(formState.province),
    postal_code: emptyToNull(formState.postal_code),
    country: formState.country,
    contact_email: emptyToNull(formState.contact_email),
    contact_phone: emptyToNull(formState.contact_phone),
    room_venue_notes: emptyToNull(formState.room_venue_notes),
    is_main_location: formState.is_main_location,
    is_active: formState.is_active,
  }
}

function formatLocationType(locationType: string) {
  return locationType.replaceAll('_', ' ')
}

function formatAddress(location: PracticeLocationRow) {
  return [
    location.address_line_1,
    location.address_line_2,
    location.suburb,
    location.city,
    location.province,
    location.postal_code,
    location.country,
  ].filter(Boolean).join(', ')
}

export function PracticeLocationsPage() {
  const { activeTenant } = useAuth()
  const authorization = useAuthorization()
  const canEditLocations = authorization.hasPermission('tenant.practice.configure')
  const [locations, setLocations] = useState<PracticeLocationRow[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [formState, setFormState] = useState<PracticeLocationFormState>(emptyLocationForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  )
  const isCreating = !selectedLocationId
  const isReadOnly = !canEditLocations || saving

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

    async function loadLocations() {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      setSuccessMessage('')

      const { data, error } = await supabaseClient
        .from('practice_locations')
        .select(`
          id,
          tenant_id,
          practice_profile_id,
          location_name,
          location_type,
          address_line_1,
          address_line_2,
          suburb,
          city,
          province,
          postal_code,
          country,
          contact_email,
          contact_phone,
          room_venue_notes,
          is_main_location,
          is_active,
          metadata,
          created_at,
          updated_at,
          deleted_at
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('is_main_location', { ascending: false })
        .order('location_name', { ascending: true })

      if (!isMounted) return

      if (error) {
        setLoadError(error.message)
        setLocations([])
        setSelectedLocationId(null)
        setFormState(emptyLocationForm)
        setLoading(false)
        return
      }

      setLocations((data ?? []) as PracticeLocationRow[])
      setSelectedLocationId(null)
      setFormState(emptyLocationForm)
      setLoading(false)
    }

    loadLocations()

    return () => {
      isMounted = false
    }
  }, [activeTenant?.id])

  const updateField = <Field extends keyof PracticeLocationFormState>(field: Field, value: PracticeLocationFormState[Field]) => {
    setFormState((currentFormState) => ({ ...currentFormState, [field]: value }))
    setSaveError('')
    setSuccessMessage('')
  }

  const startCreateLocation = () => {
    setSelectedLocationId(null)
    setFormState(emptyLocationForm)
    setSaveError('')
    setSuccessMessage('')
  }

  const startEditLocation = (location: PracticeLocationRow) => {
    setSelectedLocationId(location.id)
    setFormState(formFromLocation(location))
    setSaveError('')
    setSuccessMessage('')
  }

  const saveLocation = async () => {
    if (!activeTenant?.id || !supabase || !canEditLocations) return

    if (!formState.location_name.trim()) {
      setSaveError('Location name is required.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSuccessMessage('')

    const payload = toLocationPayload(formState)

    const result = selectedLocation?.id
      ? await supabase
          .from('practice_locations')
          .update(payload satisfies PracticeLocationUpdate)
          .eq('id', selectedLocation.id)
          .eq('tenant_id', activeTenant.id)
          .select()
          .single()
      : await supabase
          .from('practice_locations')
          .insert({ ...payload, tenant_id: activeTenant.id })
          .select()
          .single()

    if (result.error) {
      setSaveError(result.error.message)
      setSaving(false)
      return
    }

    const savedLocation = result.data as PracticeLocationRow
    setLocations((currentLocations) => {
      const nextLocations = selectedLocation?.id
        ? currentLocations.map((location) => (location.id === savedLocation.id ? savedLocation : location))
        : [...currentLocations, savedLocation]

      return nextLocations.sort((a, b) => Number(b.is_main_location) - Number(a.is_main_location) || a.location_name.localeCompare(b.location_name))
    })
    setSelectedLocationId(savedLocation.id)
    setFormState(formFromLocation(savedLocation))
    setSuccessMessage(selectedLocation?.id ? 'Location updated.' : 'Location created.')
    setSaving(false)
  }

  if (loading) {
    return <LoadingState title="Loading practice locations" description="Checking active tenant practice locations." />
  }

  if (loadError) {
    return (
      <ErrorState
        title="Practice locations unavailable"
        description={loadError}
        actions={!isSupabaseConfigured ? undefined : <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="practice-locations-page">
      <Card className="practice-profile-summary">
        <div>
          <span>Practice locations</span>
          <h3>{activeTenant?.practice_name ?? 'Tenant workspace'}</h3>
          <p>
            Manage the tenant locations used by future booking, calendar, document and billing workflows.
            Rooms remain simple notes for now and are not a separate module in this step.
          </p>
        </div>
        <div className="practice-profile-summary-actions">
          <StatusBadge tone="info">{locations.length} locations</StatusBadge>
          {!canEditLocations && <StatusBadge tone="warning">Read only</StatusBadge>}
        </div>
      </Card>

      <div className="practice-locations-layout">
        <Card className="practice-locations-list-card">
          <div className="practice-locations-list-header">
            <div>
              <span>Location list</span>
              <h3>Locations</h3>
            </div>
            {canEditLocations && (
              <Button variant="secondary" onClick={startCreateLocation}>
                New Location
              </Button>
            )}
          </div>

          {locations.length === 0 ? (
            <EmptyState
              title="No locations yet"
              description="Create the first practice location for this tenant."
            />
          ) : (
            <div className="practice-location-cards">
              {locations.map((location) => (
                <button
                  className={selectedLocationId === location.id ? 'active' : ''}
                  type="button"
                  onClick={() => startEditLocation(location)}
                  key={location.id}
                >
                  <div>
                    <strong>{location.location_name}</strong>
                    <span>{formatAddress(location) || 'No address captured'}</span>
                  </div>
                  <div className="practice-location-card-badges">
                    {location.is_main_location && <StatusBadge tone="info">Main</StatusBadge>}
                    <StatusBadge tone={location.is_active ? 'success' : 'neutral'}>
                      {location.is_active ? 'Active' : 'Inactive'}
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
              <span>{isCreating ? 'Create location' : 'Edit location'}</span>
              <h3>{isCreating ? 'New location' : formState.location_name || 'Location details'}</h3>
            </div>
            {canEditLocations && (
              <Button disabled={saving} onClick={saveLocation}>
                {saving ? 'Saving' : 'Save Location'}
              </Button>
            )}
          </div>

          <div className="settings-form-grid practice-location-form">
            <label>
              <span>Location name</span>
              <input value={formState.location_name} disabled={isReadOnly} onChange={(event) => updateField('location_name', event.target.value)} />
            </label>
            <label>
              <span>Location type</span>
              <select value={formState.location_type} disabled={isReadOnly} onChange={(event) => updateField('location_type', event.target.value)}>
                {locationTypeOptions.map((locationType) => (
                  <option value={locationType} key={locationType}>{formatLocationType(locationType)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Contact email</span>
              <input type="email" value={formState.contact_email} disabled={isReadOnly} onChange={(event) => updateField('contact_email', event.target.value)} />
            </label>
            <label>
              <span>Contact phone</span>
              <input value={formState.contact_phone} disabled={isReadOnly} onChange={(event) => updateField('contact_phone', event.target.value)} />
            </label>
            <label>
              <span>Address line 1</span>
              <input value={formState.address_line_1} disabled={isReadOnly} onChange={(event) => updateField('address_line_1', event.target.value)} />
            </label>
            <label>
              <span>Address line 2</span>
              <input value={formState.address_line_2} disabled={isReadOnly} onChange={(event) => updateField('address_line_2', event.target.value)} />
            </label>
            <label>
              <span>Suburb / area</span>
              <input value={formState.suburb} disabled={isReadOnly} onChange={(event) => updateField('suburb', event.target.value)} />
            </label>
            <label>
              <span>City</span>
              <input value={formState.city} disabled={isReadOnly} onChange={(event) => updateField('city', event.target.value)} />
            </label>
            <label>
              <span>Province</span>
              <input value={formState.province} disabled={isReadOnly} onChange={(event) => updateField('province', event.target.value)} />
            </label>
            <label>
              <span>Postal code</span>
              <input value={formState.postal_code} disabled={isReadOnly} onChange={(event) => updateField('postal_code', event.target.value)} />
            </label>
            <label>
              <span>Country</span>
              <select value={formState.country} disabled={isReadOnly} onChange={(event) => updateField('country', event.target.value)}>
                {countryOptions.map((country) => <option value={country} key={country}>{country}</option>)}
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
              <input type="checkbox" checked={formState.is_main_location} disabled={isReadOnly} onChange={(event) => updateField('is_main_location', event.target.checked)} />
              <span>Main location</span>
            </label>
            <label className="wide-field">
              <span>Room / venue notes</span>
              <textarea value={formState.room_venue_notes} disabled={isReadOnly} onChange={(event) => updateField('room_venue_notes', event.target.value)} />
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
