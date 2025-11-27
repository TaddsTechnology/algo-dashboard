'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
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
  }

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { error: error as AuthApiError | null }
    } catch (error: unknown) {
      console.error('Error during sign in:', error)
      return { error: error as AuthApiError }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
