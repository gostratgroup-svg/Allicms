import { Card, StatusBadge } from '../components/ui'

const settingsSections = [
  {
    title: 'My Profile',
    description: 'Personal profile details, contact preferences and user-specific display information.',
    status: 'Personal settings',
  },
  {
    title: 'Notifications',
    description: 'Personal notification preferences for booking, finance, patient and platform updates.',
    status: 'Notification setup',
  },
  {
    title: 'Password & Security',
    description: 'Password reset, account security and future authentication preferences.',
    status: 'Security',
  },
  {
    title: 'Appearance',
    description: 'Personal display preferences, theme options and interface density settings.',
    status: 'Display',
  },
  {
    title: 'Calendar Preferences',
    description: 'Personal calendar defaults, working hours display and reminder preferences.',
    status: 'Calendar',
  },
]

export function SettingsPage() {
  return (
    <div className="settings-framework">
      <Card className="settings-framework-intro">
        <div>
          <span>User settings</span>
          <h3>Personal settings</h3>
          <p>
            This static settings framework prepares personal preferences. Practice administration now lives
            in the Practice area.
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
