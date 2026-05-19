'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      setError('Profile not found. Please contact admin.')
      setLoading(false)
      return
    }

    localStorage.setItem('getskill-user', JSON.stringify(profile))
    localStorage.setItem('getskill-role', profile.role)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#153e9066,transparent_35%),radial-gradient(circle_at_bottom_right,#153e9066,transparent_35%)]" />

      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-[10%] top-[15%] h-80 w-80 bg-[#153e90] blur-[140px]" />
        <div className="absolute left-[10%] bottom-[15%] h-80 w-80 bg-[#153e90] blur-[140px]" /> 
       {/* <div className="absolute right-[10%] top-[15%] h-80 w-80 bg-[#54e346] blur-[150px]" /> */}
      </div>

      <div className="relative z-10 w-full max-w-[720px]">
        <div className="group/card relative isolate grid grid-cols-1 overflow-hidden border border-[#153e90]/35 bg-[#111827]/60 text-white shadow-[0_0_80px_rgba(21,62,144,0.18)] backdrop-blur-2xl transition-all duration-500 lg:grid-cols-2">
          <span className="pointer-events-none absolute left-0 top-0 z-0 h-4 w-4 border-l-2 border-t-2 border-[#153e90]/80 transition-all duration-300 group-hover/card:h-7 group-hover/card:w-7" />
          <span className="pointer-events-none absolute right-0 top-0 z-0 h-4 w-4 border-r-2 border-t-2 border-[#54e346]/80 transition-all duration-300 group-hover/card:h-7 group-hover/card:w-7" />
          <span className="pointer-events-none absolute bottom-0 left-0 z-0 h-4 w-4 border-b-2 border-l-2 border-[#153e90]/80 transition-all duration-300 group-hover/card:h-7 group-hover/card:w-7" />
          <span className="pointer-events-none absolute bottom-0 right-0 z-0 h-4 w-4 border-b-2 border-r-2 border-[#153e90]/80 transition-all duration-300 group-hover/card:h-7 group-hover/card:w-7" />
<span className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(21,62,144,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(84,227,70,0.18),transparent_42%)] opacity-60 transition-opacity duration-300 group-hover/card:opacity-90" />
          <div className="relative z-10 hidden flex-col justify-between border-r border-white/10 p-7 text-white lg:flex">
            <div>
              <div className="mb-6 w-44 p-3">
                <Image
                  src="/pixel-pluz-logo.svg"
                  alt="Pixel Pluz Logo"
                  width={150}
                  height={55}
                  priority
                />
              </div>

              <h1 className="mb-4 text-3xl font-bold leading-tight">
                GetSkill Student Portal
              </h1>

              <p className="max-w-md text-base leading-7 text-white/70">
                A smart portal for students, mentors, and admins to manage
                learning progress, tasks, submissions, reviews, and attendance.
              </p>
            </div>
          </div>

          <div className="relative z-10 p-6 sm:p-8">
            <div className="mb-8 lg:hidden">
              <Image
                src="/pixel-pluz-logo.svg"
                alt="Pixel Pluz Logo"
                width={160}
                height={60}
                priority
              />
            </div>

            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold text-[#54e346]">
                Welcome Back
              </p>
              <h2 className="text-3xl font-bold text-white">
                Login to Portal
              </h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#153e90] focus:ring-2 focus:ring-[#153e90]/20"
                  placeholder="Enter email"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-white/10 bg-white/10 px-4 py-3 pr-12 text-white outline-none placeholder:text-white/30 focus:border-[#153e90] focus:ring-2 focus:ring-[#153e90]/20"
                    placeholder="Enter password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={20} strokeWidth={2} />
                    ) : (
                      <Eye size={20} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#153e90] px-4 py-3 font-semibold text-white transition hover:bg-[#1d4fb3] hover:shadow-[0_0_30px_rgba(21,62,144,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Login to Portal'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}