'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'
import { TrendingUp, Zap, LineChart, Clock, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signUp, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, fullName)

    if (error) {
      toast.error('Signup failed', {
        description: error.message || 'An error occurred during signup',
      })
      setLoading(false)
    } else {
      toast.success('Account created successfully!', {
        description: 'Your 7-day free trial has started. Please check your email to verify your account.',
      })
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 p-4">
      <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 py-8">
        {/* Info Section */}
        <div className="flex-1 space-y-6 max-w-xl">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-10 w-10 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">Futures Watch</h1>
            </div>
            <p className="text-xl text-gray-700 font-medium">
              Smart Algo Trading Platform for NSE Futures
            </p>
            <p className="text-gray-600 leading-relaxed">
              Real-time arbitrage opportunities between spot prices and futures contracts. 
              Make data-driven trading decisions with live market analysis.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Live Data</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Real-time price updates every 500ms from NSE F&O market
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <LineChart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Profit Analysis</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Calculate arbitrage opportunities between spot & futures
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 rounded-lg p-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Multiple Expiries</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Track Near, Next & Far month futures contracts
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="bg-orange-100 rounded-lg p-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Alerts</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Get notified for high-profit opportunities (≥3%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3 text-lg">📊 How It Works</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2 text-blue-600">1.</span>
                <span>Monitor live price difference between spot and futures contracts</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2 text-blue-600">2.</span>
                <span>Identify profitable arbitrage opportunities in real-time</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2 text-blue-600">3.</span>
                <span>Execute trades based on calculated profit percentages & lot sizes</span>
              </li>
            </ul>
          </div>

          {/* Trial Badge */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 shadow-lg">
            <p className="font-bold text-lg">🎁 7-Day Free Trial</p>
            <p className="text-sm text-blue-100 mt-1">
              Full access to all features • No credit card required
            </p>
          </div>
        </div>

        {/* Signup Card */}
        <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Start your 7-day free trial today
          </CardDescription>
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-center font-medium">
              ✨ 7 Days Free Trial • No Credit Card Required
            </p>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Start Free Trial'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      </div>
    </div>
  )
}
