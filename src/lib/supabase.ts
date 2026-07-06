import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export type SupabaseConnectionTestResult = {
  configured: boolean
  ok: boolean
  status: 'not_configured' | 'connected' | 'error'
  message: string
}

export async function testSupabaseConnection(): Promise<SupabaseConnectionTestResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      configured: false,
      ok: false,
      status: 'not_configured',
      message: 'Supabase env variables are not configured.',
    }
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    if (response.ok) {
      return {
        configured: true,
        ok: true,
        status: 'connected',
        message: 'Supabase connection test passed.',
      }
    }

    return {
      configured: true,
      ok: false,
      status: 'error',
      message: `Supabase responded with HTTP ${response.status}.`,
    }
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Supabase connection test failed.',
    }
  }
}
