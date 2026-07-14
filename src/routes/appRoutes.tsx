import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthorization, type AccessArea } from '../auth/permissions'
import { PageHeader, type BreadcrumbItem } from '../components/PageHeader'
import { AccessDeniedState } from '../components/UiState'
import { BookingsPage } from '../pages/Bookings'
import { FinancePage } from '../pages/Finance'
import { FinancePriceListsPage } from '../pages/FinancePriceLists'
import { OverviewPage } from '../pages/Overview'
import { PatientsPage } from '../pages/Patients'
import { PracticeBankingPage } from '../pages/PracticeBanking'
import { PracticeBillingPage } from '../pages/PracticeBilling'
import { PracticeBrandingPage } from '../pages/PracticeBranding'
import { PracticeCommunicationTemplatesPage } from '../pages/PracticeCommunicationTemplates'
import { PracticePage } from '../pages/Practice'
import { PracticeLocationsPage } from '../pages/PracticeLocations'
import { PracticeProfilePage } from '../pages/PracticeProfile'
import { PracticeTherapistsPage } from '../pages/PracticeTherapists'
import { SettingsPage } from '../pages/Settings'
import { SessionsPage } from '../pages/Sessions'

export type AppRoute = {
  path: string
  label: string
  title: string
  description: string
  accessArea: AccessArea
  placeholderPattern: 'overview' | 'bookings' | 'sessions' | 'patients' | 'finance' | 'financePriceLists' | 'practice' | 'practiceProfile' | 'practiceLocations' | 'practiceBanking' | 'practiceBilling' | 'practiceBranding' | 'practiceCommunicationTemplates' | 'practiceTherapists' | 'settings'
  showInNav?: boolean
}

export const appRoutes: AppRoute[] = [
  {
    path: '/overview',
    label: 'Overview',
    title: 'Overview',
    accessArea: 'overview',
    description: 'Future permission-driven command centre for daily bookings, billing tasks, patient actions and follow-ups.',
    placeholderPattern: 'overview',
  },
  {
    path: '/bookings',
    label: 'Bookings',
    title: 'Bookings',
    accessArea: 'bookings',
    description: 'Calendar, new booking, location calendar, therapist calendar and booking queue structure.',
    placeholderPattern: 'bookings',
  },
  {
    path: '/bookings/sessions',
    label: 'Sessions',
    title: 'Sessions',
    accessArea: 'bookings',
    description: 'Create, view, start, complete and reopen sessions from eligible bookings.',
    placeholderPattern: 'sessions',
    showInNav: false,
  },
  {
    path: '/patients',
    label: 'Patients',
    title: 'Patients',
    accessArea: 'patients',
    description: 'Patient database, onboarding, history, Patient Link and document structure.',
    placeholderPattern: 'patients',
  },
  {
    path: '/finance',
    label: 'Finance',
    title: 'Finance',
    accessArea: 'finance',
    description: 'Billing queue, invoices, payments, statements, price lists and finance reports structure.',
    placeholderPattern: 'finance',
  },
  {
    path: '/finance/price-lists',
    label: 'Price Lists',
    title: 'Price Lists',
    accessArea: 'practice_billing',
    description: 'Create and maintain tenant price lists and procedure line items.',
    placeholderPattern: 'financePriceLists',
    showInNav: false,
  },
  {
    path: '/practice',
    label: 'Practice',
    title: 'Practice',
    accessArea: 'settings',
    description: 'Practice administration, locations, team, therapists, branding, banking and configuration structure.',
    placeholderPattern: 'practice',
  },
  {
    path: '/practice/profile',
    label: 'Practice Profile',
    title: 'Practice Profile',
    accessArea: 'settings',
    description: 'Create and maintain the current tenant practice profile.',
    placeholderPattern: 'practiceProfile',
    showInNav: false,
  },
  {
    path: '/practice/locations',
    label: 'Locations',
    title: 'Practice Locations',
    accessArea: 'settings',
    description: 'Create and maintain active tenant practice locations.',
    placeholderPattern: 'practiceLocations',
    showInNav: false,
  },
  {
    path: '/practice/therapists',
    label: 'Therapists',
    title: 'Therapist Profiles',
    accessArea: 'practice_team',
    description: 'Create and maintain therapist profiles and professional registrations.',
    placeholderPattern: 'practiceTherapists',
    showInNav: false,
  },
  {
    path: '/practice/banking',
    label: 'Banking Details',
    title: 'Banking Details',
    accessArea: 'practice_banking',
    description: 'Create and maintain tenant-owned practice bank accounts.',
    placeholderPattern: 'practiceBanking',
    showInNav: false,
  },
  {
    path: '/practice/billing',
    label: 'Billing Configuration',
    title: 'Billing Configuration',
    accessArea: 'practice_billing',
    description: 'Create and maintain tenant billing defaults.',
    placeholderPattern: 'practiceBilling',
    showInNav: false,
  },
  {
    path: '/practice/branding',
    label: 'Branding',
    title: 'Practice Branding',
    accessArea: 'settings',
    description: 'Create and maintain tenant branding configuration.',
    placeholderPattern: 'practiceBranding',
    showInNav: false,
  },
  {
    path: '/practice/communication-templates',
    label: 'Communication Templates',
    title: 'Communication Templates',
    accessArea: 'settings',
    description: 'Create and maintain manual message templates for future automation.',
    placeholderPattern: 'practiceCommunicationTemplates',
    showInNav: false,
  },
  {
    path: '/settings',
    label: 'Settings',
    title: 'Settings',
    accessArea: 'overview',
    description: 'Personal user settings for profile, notifications, password, appearance and calendar preferences.',
    placeholderPattern: 'settings',
  },
]

const legacyRouteRedirects: Record<string, string> = {
  '/dashboard': '/overview',
  '/appointments': '/bookings',
  '/calendar': '/bookings',
  '/clinical-notes': '/patients',
  '/documents': '/patients',
  '/billing': '/finance',
  '/reports': '/finance',
  '/team': '/practice',
}

export function getRouteForPath(pathname: string) {
  const redirectedPath = legacyRouteRedirects[pathname] ?? pathname
  return appRoutes.find((route) => route.path === redirectedPath) ?? appRoutes[0]
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      {Object.entries(legacyRouteRedirects).map(([from, to]) => (
        <Route path={from} element={<Navigate to={to} replace />} key={from} />
      ))}
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
      <Route path="*" element={<Navigate to="/overview" replace />} />
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
      {route.placeholderPattern === 'overview' && <OverviewPage />}
      {route.placeholderPattern === 'bookings' && <BookingsPage />}
      {route.placeholderPattern === 'sessions' && <SessionsPage />}
      {route.placeholderPattern === 'patients' && <PatientsPage />}
      {route.placeholderPattern === 'finance' && <FinancePage />}
      {route.placeholderPattern === 'financePriceLists' && <FinancePriceListsPage />}
      {route.placeholderPattern === 'practice' && <PracticePage />}
      {route.placeholderPattern === 'practiceBanking' && <PracticeBankingPage />}
      {route.placeholderPattern === 'practiceBilling' && <PracticeBillingPage />}
      {route.placeholderPattern === 'practiceBranding' && <PracticeBrandingPage />}
      {route.placeholderPattern === 'practiceCommunicationTemplates' && <PracticeCommunicationTemplatesPage />}
      {route.placeholderPattern === 'practiceProfile' && <PracticeProfilePage />}
      {route.placeholderPattern === 'practiceLocations' && <PracticeLocationsPage />}
      {route.placeholderPattern === 'practiceTherapists' && <PracticeTherapistsPage />}
      {route.placeholderPattern === 'settings' && <SettingsPage />}
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
  if (route.path.startsWith('/practice/') && route.path !== '/practice') {
    return [
      { label: 'Workspace', to: '/overview' },
      { label: 'Practice', to: '/practice' },
      { label: route.label },
    ]
  }

  if (route.path.startsWith('/finance/') && route.path !== '/finance') {
    return [
      { label: 'Workspace', to: '/overview' },
      { label: 'Finance', to: '/finance' },
      { label: route.label },
    ]
  }

  if (route.path.startsWith('/bookings/') && route.path !== '/bookings') {
    return [
      { label: 'Workspace', to: '/overview' },
      { label: 'Bookings', to: '/bookings' },
      { label: route.label },
    ]
  }

  return [
    { label: 'Workspace', to: '/overview' },
    { label: route.label },
  ]
}
