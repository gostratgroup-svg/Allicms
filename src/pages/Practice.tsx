import { SectionHubPage, type SectionHubItem } from '../components/SectionHubPage'

const practiceSections: SectionHubItem[] = [
  {
    title: 'Practice Profile',
    description: 'Practice identity, contact details, registration details and default operating metadata.',
    status: 'Practice setup',
    to: '/practice/profile',
  },
  {
    title: 'Locations',
    description: 'Practice locations, rooms, contact details and future location-specific calendar defaults.',
    status: 'Locations',
    to: '/practice/locations',
  },
  {
    title: 'Team',
    description: 'Tenant staff, user membership and role assignment structure will be managed here.',
    status: 'Users',
  },
  {
    title: 'Therapists',
    description: 'Therapist professional details, registrations, practice numbers and discipline settings.',
    status: 'Professional profiles',
    to: '/practice/therapists',
  },
  {
    title: 'Branding',
    description: 'Practice logo, patient-facing display name and document branding preferences.',
    status: 'Brand setup',
    to: '/practice/branding',
  },
  {
    title: 'Banking Details',
    description: 'Practice bank accounts and future therapist or location banking configuration.',
    status: 'Bank accounts',
    to: '/practice/banking',
  },
  {
    title: 'Billing Configuration',
    description: 'Invoice numbers, statement numbers, payment terms and default billing behaviour.',
    status: 'Billing defaults',
    to: '/practice/billing',
  },
  {
    title: 'Communication Templates',
    description: 'Manual message templates now, ready for automated workflow triggers later.',
    status: 'Templates',
    to: '/practice/communication-templates',
  },
  {
    title: 'Security & Permissions',
    description: 'Practice-level access setup and future permission configuration for tenant administrators.',
    status: 'Access control',
  },
  {
    title: 'Integrations',
    description: 'Future email, SMS, WhatsApp, AI, medical aid and external service connections.',
    status: 'Future setup',
  },
]

export function PracticePage() {
  return (
    <SectionHubPage
      eyebrow="Practice foundation"
      title="Practice"
      description="This area contains practice administration and configuration, separate from personal user settings."
      sections={practiceSections}
      ariaLabel="Practice placeholder sections"
    />
  )
}
