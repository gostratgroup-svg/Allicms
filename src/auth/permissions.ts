import { useMemo } from 'react'
import { useAuth, type ActiveRole, type Profile, type TenantShell } from './AuthContext'

export type Permission =
  | 'platform.dashboard.view'
  | 'platform.tenants.manage'
  | 'platform.subscriptions.manage'
  | 'platform.support.manage'
  | 'platform.health.view'
  | 'platform.configuration.manage'
  | 'tenant.overview.view'
  | 'tenant.users.manage'
  | 'tenant.practice.configure'
  | 'tenant.patients.view'
  | 'tenant.patients.manage'
  | 'tenant.bookings.view'
  | 'tenant.bookings.manage'
  | 'tenant.clinical.view'
  | 'tenant.clinical.manage'
  | 'tenant.finance.view'
  | 'tenant.finance.manage'
  | 'tenant.reports.view'
  | 'tenant.reports.manage'
  | 'tenant.documents.view'
  | 'tenant.documents.manage'
  | 'tenant.communication.manage'

export type AccessArea =
  | 'platform'
  | 'platform_dashboard'
  | 'tenant_management'
  | 'subscription_management'
  | 'support_centre'
  | 'system_health'
  | 'platform_configuration'
  | 'overview'
  | 'patients'
  | 'bookings'
  | 'clinical'
  | 'finance'
  | 'reports'
  | 'documents'
  | 'settings'
  | 'communication'

type AuthorizationInput = {
  profile: Profile | null
  activeRole: ActiveRole
  activeTenant: TenantShell | null
}

export type Authorization = {
  role: ActiveRole
  isAuthenticated: boolean
  isSuperAdmin: boolean
  hasTenantContext: boolean
  permissions: Permission[]
  hasRole: (...roles: NonNullable<ActiveRole>[]) => boolean
  hasPermission: (...permissions: Permission[]) => boolean
  canAccess: (area: AccessArea) => boolean
}

const rolePermissions: Record<NonNullable<ActiveRole>, Permission[]> = {
  super_admin: [
    'platform.dashboard.view',
    'platform.tenants.manage',
    'platform.subscriptions.manage',
    'platform.support.manage',
    'platform.health.view',
    'platform.configuration.manage',
  ],
  admin: [
    'tenant.overview.view',
    'tenant.users.manage',
    'tenant.practice.configure',
    'tenant.patients.view',
    'tenant.patients.manage',
    'tenant.bookings.view',
    'tenant.bookings.manage',
    'tenant.clinical.view',
    'tenant.clinical.manage',
    'tenant.finance.view',
    'tenant.finance.manage',
    'tenant.reports.view',
    'tenant.reports.manage',
    'tenant.documents.view',
    'tenant.documents.manage',
    'tenant.communication.manage',
  ],
  therapist: [
    'tenant.overview.view',
    'tenant.patients.view',
    'tenant.bookings.view',
    'tenant.bookings.manage',
    'tenant.clinical.view',
    'tenant.clinical.manage',
    'tenant.reports.view',
    'tenant.reports.manage',
    'tenant.documents.view',
    'tenant.communication.manage',
  ],
  receptionist: [
    'tenant.overview.view',
    'tenant.patients.view',
    'tenant.patients.manage',
    'tenant.bookings.view',
    'tenant.bookings.manage',
    'tenant.finance.view',
    'tenant.documents.view',
    'tenant.documents.manage',
    'tenant.communication.manage',
  ],
  finance: [
    'tenant.overview.view',
    'tenant.patients.view',
    'tenant.bookings.view',
    'tenant.finance.view',
    'tenant.finance.manage',
    'tenant.documents.view',
    'tenant.documents.manage',
    'tenant.communication.manage',
  ],
}

const areaPermissions: Record<AccessArea, Permission[]> = {
  platform: ['platform.dashboard.view'],
  platform_dashboard: ['platform.dashboard.view'],
  tenant_management: ['platform.tenants.manage'],
  subscription_management: ['platform.subscriptions.manage'],
  support_centre: ['platform.support.manage'],
  system_health: ['platform.health.view'],
  platform_configuration: ['platform.configuration.manage'],
  overview: ['tenant.overview.view'],
  patients: ['tenant.patients.view'],
  bookings: ['tenant.bookings.view'],
  clinical: ['tenant.clinical.view'],
  finance: ['tenant.finance.view'],
  reports: ['tenant.reports.view'],
  documents: ['tenant.documents.view'],
  settings: ['tenant.practice.configure', 'tenant.users.manage'],
  communication: ['tenant.communication.manage'],
}

export function createAuthorization({ profile, activeRole, activeTenant }: AuthorizationInput): Authorization {
  const resolvedRole: ActiveRole = profile?.is_super_admin ? 'super_admin' : activeRole
  const permissions = resolvedRole ? rolePermissions[resolvedRole] : []
  const isSuperAdmin = resolvedRole === 'super_admin'
  const hasTenantContext = Boolean(activeTenant)

  const hasRole = (...roles: NonNullable<ActiveRole>[]) => Boolean(resolvedRole && roles.includes(resolvedRole))
  const hasPermission = (...requestedPermissions: Permission[]) => requestedPermissions.some((permission) => permissions.includes(permission))

  const canAccess = (area: AccessArea) => {
    const requestedPermissions = areaPermissions[area]
    const isPlatformArea = requestedPermissions.some((permission) => permission.startsWith('platform.'))

    if (isPlatformArea) {
      return isSuperAdmin && hasPermission(...requestedPermissions)
    }

    return hasTenantContext && !isSuperAdmin && hasPermission(...requestedPermissions)
  }

  return {
    role: resolvedRole,
    isAuthenticated: Boolean(profile),
    isSuperAdmin,
    hasTenantContext,
    permissions,
    hasRole,
    hasPermission,
    canAccess,
  }
}

export function useAuthorization() {
  const { profile, activeRole, activeTenant } = useAuth()

  return useMemo(
    () => createAuthorization({ profile, activeRole, activeTenant }),
    [activeRole, activeTenant, profile],
  )
}
