'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StockFuturesDashboard from "@/components/StockFuturesDashboard";
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { user, profile, loading, signOut, isTrialExpired } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (isTrialExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-lg border">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold mb-4">Trial Expired</h1>
          <p className="text-gray-600 mb-6">
            Your 7-day free trial has ended. To continue using the Stock Futures Dashboard, please upgrade to a paid plan.
          </p>
          <div className="space-y-3">
            <Button className="w-full" size="lg">
              Upgrade Now
            </Button>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getRemainingDays = () => {
    if (!profile) return 0
    const trialEnd = new Date(profile.trial_end_date)
    const now = new Date()
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  return (
    <div>
      {/* Trial banner moved to StockFuturesDashboard component */}
      <StockFuturesDashboard />
    </div>
  )
}
