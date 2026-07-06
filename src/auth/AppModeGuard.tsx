import App from '../App'
import Login from '../pages/Login'
import { useAuth } from './AuthContext'

export default function AppModeGuard() {
  const {
    user,
    profile,
    tenantMemberships,
    activeTenant,
    activeRole,
    identityLoading,
    identityError,
  } = useAuth()

  if (!user) {
    return <Login />
  }

  if (identityLoading) {
    return <IdentityLoading />
  }

  if (!profile) {
    return (
      <IdentityState
        eyebrow="Authentication verified"
        title="Profile not created yet"
        message={identityError || 'Your sign-in works, but no AlliDesk profile has been created for this user yet.'}
      />
    )
  }

  if (profile.is_super_admin || activeRole === 'super_admin') {
    return <App />
  }

  if (identityError && tenantMemberships.length > 0) {
    return (
      <IdentityState
        eyebrow="Workspace unavailable"
        title="Identity could not be resolved"
        message={identityError}
      />
    )
  }

  if (tenantMemberships.length === 0) {
    return (
      <IdentityState
        eyebrow="Authentication verified"
        title="No workspace assigned yet"
        message={identityError || 'Your profile exists, but you have not been added to an AlliDesk tenant workspace yet.'}
      />
    )
  }

  if (tenantMemberships.length > 1 && !activeTenant) {
    return <TenantSelection />
  }

  if (!activeTenant || !activeRole) {
    return (
      <IdentityState
        eyebrow="Workspace unavailable"
        title="Workspace could not be resolved"
        message="Your tenant membership was found, but the tenant shell could not be loaded yet."
      />
    )
  }

  return <App />
}

function IdentityLoading() {
  return (
    <div className="auth-resolving-screen" role="status" aria-live="polite">
      <span>Resolving workspace...</span>
    </div>
  )
}

function IdentityState({ eyebrow, title, message }: { eyebrow: string; title: string; message: string }) {
  const { signOut } = useAuth()

  return (
    <main className="identity-state-shell">
      <section className="identity-state-panel">
        <img src="/assets/Allidesk_Main_Logo%20copy.png" alt="AlliDesk" />
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{message}</span>
        <button type="button" className="identity-secondary-action" onClick={() => void signOut()}>
          Logout
        </button>
      </section>
    </main>
  )
}

function TenantSelection() {
  const { profile, tenantMemberships, selectActiveTenant, signOut } = useAuth()
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'AlliDesk user'

  return (
    <main className="identity-state-shell">
      <section className="identity-state-panel tenant-selection-panel">
        <img src="/assets/Allidesk_Main_Logo%20copy.png" alt="AlliDesk" />
        <p>Choose workspace</p>
        <h1>{displayName}</h1>
        <div className="tenant-selection-list">
          {tenantMemberships.map((membership) => (
            <button type="button" key={membership.id} onClick={() => selectActiveTenant(membership.tenant_id)}>
              <strong>{membership.tenant?.practice_name ?? 'Tenant unavailable'}</strong>
              <span>{membership.role}</span>
            </button>
          ))}
        </div>
        <button type="button" className="identity-secondary-action" onClick={() => void signOut()}>
          Logout
        </button>
      </section>
    </main>
  )
}
