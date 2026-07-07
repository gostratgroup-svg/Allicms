import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthorization, type AccessArea } from '../auth/permissions'
import { ListPagePlaceholder } from '../components/ListPagePlaceholder'
import { PageHeader, type BreadcrumbItem } from '../components/PageHeader'
import { AccessDeniedState, EmptyState } from '../components/UiState'
import { DashboardPage } from '../pages/Dashboard'
import { SettingsPage } from '../pages/Settings'

export type AppRoute = {
  path: string
  label: string
  title: string
  description: string
  accessArea: AccessArea
  placeholderPattern?: 'dashboard' | 'list' | 'settings' | 'simple'
  searchPlaceholder?: string
  emptyState?: string
  primaryActionLabel?: string
}

export const appRoutes: AppRoute[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    accessArea: 'overview',
    description: 'A routed dashboard placeholder for tenant workspace metrics, tasks and daily operating context.',
    placeholderPattern: 'dashboard',
  },
  {
    path: '/patients',
    label: 'Patients',
    title: 'Patients',
    accessArea: 'patients',
    description: 'A routed patients placeholder for the future live patient database and patient profile workspace.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search patients',
    emptyState: 'No patients connected yet.',
    primaryActionLabel: 'New patient',
  },
  {
    path: '/appointments',
    label: 'Appointments',
    title: 'Appointments',
    accessArea: 'bookings',
    description: 'A routed appointments placeholder for booking workflows, attendance status and session lifecycle actions.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search appointments',
    emptyState: 'No appointments connected yet.',
    primaryActionLabel: 'New appointment',
  },
  {
    path: '/calendar',
    label: 'Calendar',
    title: 'Calendar',
    accessArea: 'bookings',
    description: 'A routed calendar placeholder for weekly, daily and blocked-time scheduling views.',
  },
  {
    path: '/clinical-notes',
    label: 'Clinical Notes',
    title: 'Clinical Notes',
    accessArea: 'clinical',
    description: 'A routed clinical notes placeholder for versioned notes, session feedback and internal process notes.',
  },
  {
    path: '/documents',
    label: 'Documents',
    title: 'Documents',
    accessArea: 'documents',
    description: 'A routed documents placeholder for generated reports, uploaded files and future Supabase storage records.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search documents',
    emptyState: 'No documents connected yet.',
    primaryActionLabel: 'Upload document',
  },
  {
    path: '/billing',
    label: 'Billing',
    title: 'Billing',
    accessArea: 'finance',
    description: 'A routed billing placeholder for procedures, ICD-10 codes, invoice creation and billing configuration workflows.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search billing items',
    emptyState: 'No billing records connected yet.',
    primaryActionLabel: 'New billing item',
  },
  {
    path: '/finance',
    label: 'Finance',
    title: 'Finance',
    accessArea: 'finance',
    description: 'A routed finance placeholder for payments, statements, outstanding balances and financial reporting.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search finance records',
    emptyState: 'No finance records connected yet.',
    primaryActionLabel: 'New statement',
  },
  {
    path: '/reports',
    label: 'Reports',
    title: 'Reports',
    accessArea: 'reports',
    description: 'A routed reports placeholder for operational, financial and clinical reporting views.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search reports',
    emptyState: 'No reports connected yet.',
    primaryActionLabel: 'New report',
  },
  {
    path: '/team',
    label: 'Team',
    title: 'Team',
    accessArea: 'settings',
    description: 'A routed team placeholder for tenant users, therapists, receptionists and finance staff.',
    placeholderPattern: 'list',
    searchPlaceholder: 'Search team members',
    emptyState: 'No team records connected yet.',
    primaryActionLabel: 'Invite user',
  },
  {
    path: '/settings',
    label: 'Settings',
    title: 'Settings',
    accessArea: 'settings',
    description: 'A routed settings placeholder for practice, patient, billing, guide and release-note configuration.',
    placeholderPattern: 'settings',
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
          element={(
            <ProtectedRoute route={route}>
              <PlaceholderPage route={route} />
            </ProtectedRoute>
          )}
          key={route.path}
        />
      ))}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function ProtectedRoute({ route, children }: { route: AppRoute; children: ReactNode }) {
  const authorization = useAuthorization()

  if (!authorization.canAccess(route.accessArea)) {
    return <AccessNotAllowed route={route} />
  }

  return children
}

function AccessNotAllowed({ route }: { route: AppRoute }) {
  return (
    <RoutedPageFrame route={route}>
      <AccessDeniedState title="Access not allowed" />
    </RoutedPageFrame>
  )
}

function PlaceholderPage({ route }: { route: AppRoute }) {
  return (
    <RoutedPageFrame route={route}>
      {route.placeholderPattern === 'dashboard' ? (
        <DashboardPage />
      ) : route.placeholderPattern === 'list' ? (
        <ListPagePlaceholder
          title={route.title}
          description={route.description}
          searchPlaceholder={route.searchPlaceholder ?? `Search ${route.label.toLowerCase()}`}
          emptyState={route.emptyState ?? `No ${route.label.toLowerCase()} records connected yet.`}
          primaryActionLabel={route.primaryActionLabel}
        />
      ) : route.placeholderPattern === 'settings' ? (
        <SettingsPage />
      ) : (
        <EmptyState
          title={`${route.title} module placeholder`}
          description="This routed workspace is ready for the production module implementation."
        />
      )}
    </RoutedPageFrame>
  )
}

function RoutedPageFrame({ route, children }: { route: AppRoute; children: ReactNode }) {
  return (
    <div className="routed-page-shell">
      <PageHeader
        title={route.title}
        description={route.description}
        breadcrumbs={getRouteBreadcrumbs(route)}
      />
      {children}
    </div>
  )
}

function getRouteBreadcrumbs(route: AppRoute): BreadcrumbItem[] {
  return [
    { label: 'Workspace', to: '/dashboard' },
    { label: route.label },
  ]
}
