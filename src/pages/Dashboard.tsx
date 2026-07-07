import { Button, Card, StatusBadge } from '../components/ui'

const dashboardKpis = [
  { label: 'Appointments today', value: '0', detail: 'production data not connected' },
  { label: 'Open To Do\'s', value: '0', detail: 'ready for tenant workflow data' },
  { label: 'Awaiting payment', value: 'R 0', detail: 'finance module placeholder' },
  { label: 'Notes due', value: '0', detail: 'clinical module placeholder' },
]

const upcomingAppointments = [
  { time: '08:30', title: 'Appointment placeholder', detail: 'Patient and therapist data will load here later.' },
  { time: '10:00', title: 'Assessment placeholder', detail: 'Booking status, room and duration will be shown here.' },
  { time: '14:15', title: 'Follow-up placeholder', detail: 'Calendar data is intentionally not connected yet.' },
]

const recentActivity = [
  'Booking activity will appear here after the scheduling module is connected.',
  'Patient profile updates will appear here after patient records move to live data.',
  'Invoice and payment activity will appear here after finance workflows are connected.',
]

const quickActions = [
  'New booking',
  'Open calendar',
  'Create patient profile',
  'Review finance queue',
]

export function DashboardPage() {
  return (
    <div className="dashboard-framework">
      <Card className="dashboard-welcome-card">
        <div>
          <span>Workspace summary</span>
          <h3>Today at a glance</h3>
          <p>
            This dashboard framework is ready for live tenant metrics, appointment context,
            activity feeds and action shortcuts.
          </p>
        </div>
        <StatusBadge tone="info">Static placeholder</StatusBadge>
      </Card>

      <section className="dashboard-kpi-grid" aria-label="Dashboard KPI placeholders">
        {dashboardKpis.map((item) => (
          <Card className="dashboard-kpi-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </Card>
        ))}
      </section>

      <div className="dashboard-framework-grid">
        <Card className="dashboard-framework-panel dashboard-upcoming-panel">
          <div className="dashboard-framework-heading">
            <span>Upcoming appointments</span>
            <StatusBadge>Placeholder list</StatusBadge>
          </div>
          <div className="dashboard-appointment-list">
            {upcomingAppointments.map((item) => (
              <article key={`${item.time}-${item.title}`}>
                <time>{item.time}</time>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card className="dashboard-framework-panel">
          <div className="dashboard-framework-heading">
            <span>Recent activity</span>
            <StatusBadge tone="info">Audit-ready structure</StatusBadge>
          </div>
          <ul className="dashboard-activity-list">
            {recentActivity.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card className="dashboard-framework-panel dashboard-quick-actions-panel">
          <div className="dashboard-framework-heading">
            <span>Quick actions</span>
            <StatusBadge>UI only</StatusBadge>
          </div>
          <div className="dashboard-action-grid">
            {quickActions.map((item) => (
              <Button variant="secondary" key={item}>
                {item}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
