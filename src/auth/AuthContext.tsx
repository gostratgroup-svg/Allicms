import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TenantShell = {
  id: string
  practice_name: string
  trading_name: string | null
  primary_contact_email: string | null
  country: string
  time_zone: string
  tenant_status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TenantRole = 'admin' | 'receptionist' | 'therapist' | 'finance'

export type TenantMembership = {
  id: string
  tenant_id: string
  profile_id: string
  role: TenantRole
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
  tenant?: TenantShell | null
}

export type ActiveRole = TenantRole | 'super_admin' | null

type SignInResult = {
  error: AuthError | null
}

type SignOutResult = {
  error: AuthError | null
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  tenantMemberships: TenantMembership[]
  activeTenant: TenantShell | null
  activeRole: ActiveRole
  identityLoading: boolean
  identityError: string
  selectActiveTenant: (tenantId: string) => void
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<SignOutResult>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([])
  const [activeTenant, setActiveTenant] = useState<TenantShell | null>(null)
  const [activeRole, setActiveRole] = useState<ActiveRole>(null)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityError, setIdentityError] = useState('')

  const resetIdentity = () => {
    setProfile(null)
    setTenantMemberships([])
    setActiveTenant(null)
    setActiveRole(null)
    setIdentityLoading(false)
    setIdentityError('')
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setSession(null)
        setUser(null)
      } else {
        setSession(data.session)
        setUser(data.session?.user ?? null)
      }
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      resetIdentity()
      return undefined
    }

    const supabaseClient = supabase
    let isMounted = true

    const loadIdentity = async () => {
      setIdentityLoading(true)
      setIdentityError('')
      setProfile(null)
      setTenantMemberships([])
      setActiveTenant(null)
      setActiveRole(null)

      const { data: profileRow, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, email, phone, is_super_admin, created_at, updated_at, deleted_at')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!isMounted) return

      if (profileError) {
        setIdentityError(profileError.message)
        setIdentityLoading(false)
        return
      }

      if (!profileRow) {
        setIdentityError('Profile not created yet.')
        setIdentityLoading(false)
        return
      }

      const nextProfile = profileRow as Profile
      setProfile(nextProfile)

      if (nextProfile.is_super_admin) {
        setActiveRole('super_admin')
        setIdentityLoading(false)
        return
      }

      const { data: membershipRows, error: membershipsError } = await supabaseClient
        .from('tenant_users')
        .select(`
          id,
          tenant_id,
          profile_id,
          role,
          is_active,
          created_at,
          updated_at,
          deleted_at,
          tenant:tenants (
            id,
            practice_name,
            trading_name,
            primary_contact_email,
            country,
            time_zone,
            tenant_status,
            created_at,
            updated_at,
            deleted_at
          )
        `)
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .is('deleted_at', null)

      if (!isMounted) return

      if (membershipsError) {
        setIdentityError(membershipsError.message)
        setIdentityLoading(false)
        return
      }

      const activeMemberships = (membershipRows ?? []) as TenantMembership[]
      setTenantMemberships(activeMemberships)

      if (activeMemberships.length === 0) {
        setIdentityError('No workspace assigned yet.')
        setIdentityLoading(false)
        return
      }

      if (activeMemberships.length === 1) {
        const membership = activeMemberships[0]
        setActiveTenant(membership.tenant ?? null)
        setActiveRole(membership.role)
      }

      setIdentityLoading(false)
    }

    void loadIdentity()

    return () => {
      isMounted = false
    }
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    profile,
    tenantMemberships,
    activeTenant,
    activeRole,
    identityLoading,
    identityError,
    selectActiveTenant: (tenantId: string) => {
      const membership = tenantMemberships.find((item) => item.tenant_id === tenantId)
      if (!membership) return
      setActiveTenant(membership.tenant ?? null)
      setActiveRole(membership.role)
      setIdentityError('')
    },
    signIn: async (email: string, password: string) => {
      if (!supabase) {
        return {
          error: {
            name: 'SupabaseNotConfigured',
            message: 'Supabase env variables are not configured.',
          } as AuthError,
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    signOut: async () => {
      if (!supabase) {
        setSession(null)
        setUser(null)
        resetIdentity()
        return { error: null }
      }

      const { error } = await supabase.auth.signOut()
      if (!error) {
        setSession(null)
        setUser(null)
        resetIdentity()
      }
      return { error }
    },
  }), [activeRole, activeTenant, identityError, identityLoading, loading, profile, session, tenantMemberships, user])

  if (loading) {
    return (
      <div className="auth-resolving-screen" role="status" aria-live="polite">
        <span>Loading AlliDesk...</span>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
