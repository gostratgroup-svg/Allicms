import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthorization } from '../auth/permissions'
import { PracticeBrandingPage } from './PracticeBranding'
import { PracticeLocationsPage } from './PracticeLocations'
import { PracticeProfilePage } from './PracticeProfile'
import { PracticeTherapistsPage } from './PracticeTherapists'

type PracticeSetupSection = 'profile' | 'locations' | 'therapists' | 'branding'

export function PracticeSetupConfigurationPage() {
  const authorization = useAuthorization()
  const [searchParams, setSearchParams] = useSearchParams()
  const sections = useMemo(() => [
    authorization.hasPermission('tenant.practice.configure') && { id: 'profile' as const, label: 'Practice Profile' },
    authorization.hasPermission('tenant.practice.configure') && { id: 'locations' as const, label: 'Locations' },
    authorization.hasPermission('tenant.team.view', 'tenant.practice.configure') && { id: 'therapists' as const, label: 'Therapists & Team' },
    authorization.hasPermission('tenant.practice.configure') && { id: 'branding' as const, label: 'Branding' },
  ].filter((section): section is { id: PracticeSetupSection; label: string } => Boolean(section)), [authorization])

  const requestedSection = searchParams.get('section') as PracticeSetupSection | null
  const activeSection = sections.some((section) => section.id === requestedSection)
    ? requestedSection as PracticeSetupSection
    : sections[0]?.id ?? 'profile'

  const selectSection = (section: PracticeSetupSection) => {
    setSearchParams(section === 'profile' ? {} : { section }, { replace: true })
  }

  return (
    <div className="practice-setup-configuration-workspace">
      <div className="segmented practice-setup-configuration-tabs" role="tablist" aria-label="Practice setup sections">
        {sections.map((section) => (
          <button
            type="button"
            className={activeSection === section.id ? 'active' : ''}
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => selectSection(section.id)}
            key={section.id}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSection === 'profile' && <PracticeProfilePage />}
      {activeSection === 'locations' && <PracticeLocationsPage />}
      {activeSection === 'therapists' && <PracticeTherapistsPage />}
      {activeSection === 'branding' && <PracticeBrandingPage />}
    </div>
  )
}
