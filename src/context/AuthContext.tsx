import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AUTH_BYPASS, DEMO_EMAIL, DEMO_USER_ID, demoGet, demoSet } from '../lib/demoMode'
import { supabase } from '../lib/supabase'
import type { CoachingStyle, Profile } from '../types/database.types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  bypass: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function buildDemoProfile(): Profile {
  return demoGet<Profile>('profile', {
    id: DEMO_USER_ID,
    coaching_style: 'tropa',
    daily_calories: 2200,
    daily_protein: 170,
    target_weight: 70,
    created_at: new Date().toISOString(),
  })
}

function buildDemoUser(): User {
  return {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    app_metadata: {},
    user_metadata: { full_name: 'G Demo' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User
}

function buildDemoSession(user: User): Session {
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 60 * 60 * 24,
    token_type: 'bearer',
    user,
  } as Session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Profile fetch failed:', error.message)
      return null
    }
    return data as Profile | null
  }, [])

  const refreshProfile = useCallback(async () => {
    if (AUTH_BYPASS) {
      setProfile(buildDemoProfile())
      return
    }
    if (!session?.user?.id) {
      setProfile(null)
      return
    }
    const data = await fetchProfile(session.user.id)
    setProfile(data)
  }, [session?.user?.id, fetchProfile])

  useEffect(() => {
    let mounted = true

    if (AUTH_BYPASS) {
      const user = buildDemoUser()
      setSession(buildDemoSession(user))
      setProfile(buildDemoProfile())
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user?.id) {
        const p = await fetchProfile(data.session.user.id)
        if (mounted) setProfile(p)
      }
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next)
      if (next?.user?.id) {
        const p = await fetchProfile(next.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (AUTH_BYPASS) return { error: null }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (AUTH_BYPASS) return { error: null }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (AUTH_BYPASS) {
      // Stay in demo mode — ignore logout while bypass is on
      return
    }
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (AUTH_BYPASS) {
        const next = { ...buildDemoProfile(), ...updates, id: DEMO_USER_ID }
        demoSet('profile', next)
        setProfile(next)
        return { error: null }
      }

      if (!session?.user?.id) return { error: 'Not authenticated' }
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single()

      if (error) return { error: error.message }
      setProfile(data as Profile)
      return { error: null }
    },
    [session?.user?.id],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      bypass: AUTH_BYPASS,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCoachingStyle(): CoachingStyle {
  const { profile } = useAuth()
  return profile?.coaching_style ?? 'tropa'
}
