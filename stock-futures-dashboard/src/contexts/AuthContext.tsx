'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AuthApiError, User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthApiError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthApiError | null }>
  signOut: () => Promise<void>
  isTrialExpired: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isTrialExpired: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const router = useRouter()

  // Function to fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setProfile(data)
        // Check if trial is expired
        const trialEnd = new Date(data.trial_end_date)
        const now = new Date()
        setIsTrialExpired(now > trialEnd)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check active session and set up auth state listener
  useEffect(() => {
    let mounted = true
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Periodically refresh session to prevent unexpected logout
  useEffect(() => {
    if (!user) return

    // Refresh session every 30 minutes to keep it alive
    const interval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession()
        
        if (error) {
          console.error('Session refresh error:', error)
          // If refresh fails, try to get current session
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (!currentSession) {
            // Session definitely expired, redirect to login
            router.push('/login')
          }
        } else if (session?.user) {
          setUser(session.user)
          // Re-fetch profile to ensure data is current
          await fetchProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error during session refresh:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    return () => clearInterval(interval)
  }, [user, router, fetchProfile])

  const signUp: AuthContextType['signUp'] = async (
    email: string,
    password: string,
    fullName?: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) return { error: error as AuthApiError }

      // If user is created, update profile with full name
      if (data.user && fullName) {
        await supabase
          .from('user_profiles')
          .update({ full_name: fullName })
          .eq('id', data.user.id)
      }

      return { error: null }
    } catch (error: unknown) {
      console.error('Error during sign up:', error)
      return { error: error as AuthApiError }
    }
  }

  const signIn: AuthContextType['signIn'] = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        // Set session to persist for 6 hours
        options: {
          captchaToken: undefined,
        }
      })

      if (error) {
        return { error: error as AuthApiError }
      }

      // Successfully signed in
      if (data.user) {
        setUser(data.user)
        await fetchProfile(data.user.id)
      }

      return { error: null }
    } catch (error: unknown) {
      console.error('Error during sign in:', error)
      return { error: error as AuthApiError }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.push('/login')
    } catch (error) {
      console.error('Error during sign out:', error)
      router.push('/login')
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isTrialExpired,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}