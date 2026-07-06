import { Navigate, Route, Routes } from 'react-router-dom'

export type AppRoute = {
  path: string
  label: string
  title: string
  description: string
}

export const appRoutes: AppRoute[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'A routed dashboard placeholder for tenant workspace metrics, tasks and daily operating context.',
  },
  {
    path: '/patients',
    label: 'Patients',
    title: 'Patients',
    description: 'A routed patients placeholder for the future live patient database and patient profile workspace.',
  },
  {
    path: '/appointments',
    label: 'Appointments',
    title: 'Appointments',
    description: 'A routed appointments placeholder for booking workflows, attendance status and session lifecycle actions.',
  },
  {
    path: '/calendar',
    label: 'Calendar',
    title: 'Calendar',
    description: 'A routed calendar placeholder for weekly, daily and blocked-time scheduling views.',
  },
  {
    path: '/clinical-notes',
    label: 'Clinical Notes',
    title: 'Clinical Notes',
    description: 'A routed clinical notes placeholder for versioned notes, session feedback and internal process notes.',
  },
  {
    path: '/documents',
    label: 'Documents',
    title: 'Documents',
    description: 'A routed documents placeholder for generated reports, uploaded files and future Supabase storage records.',
  },
  {
    path: '/billing',
    label: 'Billing',
    title: 'Billing',
    description: 'A routed billing placeholder for procedures, ICD-10 codes, invoice creation and billing configuration workflows.',
  },
  {
    path: '/finance',
    label: 'Finance',
    title: 'Finance',
    description: 'A routed finance placeholder for payments, statements, outstanding balances and financial reporting.',
  },
  {
    path: '/reports',
    label: 'Reports',
    title: 'Reports',
    description: 'A routed reports placeholder for operational, financial and clinical reporting views.',
  },
  {
    path: '/team',
    label: 'Team',
    title: 'Team',
    description: 'A routed team placeholder for tenant users, therapists, receptionists and finance staff.',
  },
  {
    path: '/settings',
    label: 'Settings',
    title: 'Settings',
    description: 'A routed settings placeholder for practice, patient, billing, guide and release-note configuration.',
  },
]

export function getRouteForPath(pathname: string) {
  return appRoutes.find((route) => route.path === pathname) ?? appRoutes[0]
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {appRoutes.map((route) => (
        <Route
          path={route.path}
          element={<PlaceholderPage title={route.title} description={route.description} />}
          key={route.path}
        />
      ))}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="route-placeholder-panel">
      <p>Phase 3 routed workspace</p>
      <h2>{title}</h2>
      <span>{description}</span>
    </section>
  )
}
