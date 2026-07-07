import { Card, StatusBadge } from '../components/ui'

const settingsSections = [
  {
    title: 'Practice profile',
    description: 'Practice identity, locations, contact details and operating defaults will be configured here.',
    status: 'Profile setup',
  },
  {
    title: 'Team & roles',
    description: 'Tenant users, role assignments and therapist profile settings will be managed here.',
    status: 'Access setup',
  },
  {
    title: 'Billing settings',
    description: 'Procedure lists, ICD-10 defaults, payment terms and invoicing preferences will be configured here.',
    status: 'Finance setup',
  },
  {
    title: 'Clinical settings',
    description: 'Clinical note types, intake templates and practice-specific clinical defaults will be configured here.',
    status: 'Clinical setup',
  },
  {
    title: 'Communication settings',
    description: 'Email, SMS, WhatsApp and patient-link message templates will be configured here later.',
    status: 'Comms setup',
  },
  {
    title: 'Security & access',
    description: 'Workspace access rules, audit visibility and future security preferences will be managed here.',
    status: 'Security setup',
  },
]

export function SettingsPage() {
  return (
    <div className="settings-framework">
      <Card className="settings-framework-intro">
        <div>
          <span>Tenant configuration</span>
          <h3>Settings framework</h3>
          <p>
            This static settings framework prepares the configuration areas that will later control the
            tenant workspace defaults and production setup.
          </p>
        </div>
        <StatusBadge tone="info">Static placeholder</StatusBadge>
      </Card>

      <section className="settings-framework-grid" aria-label="Settings placeholder sections">
        {settingsSections.map((section) => (
          <Card className="settings-framework-card" key={section.title}>
            <div>
              <span>{section.status}</span>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>
            <StatusBadge>Not connected</StatusBadge>
          </Card>
        ))}
      </section>
    </div>
  )
}
