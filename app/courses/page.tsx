'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const createSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const splitLines = (value: string) => {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function AddCoursePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [durationWeeks, setDurationWeeks] = useState('12')
  const [workPackagesCount, setWorkPackagesCount] = useState('0')
  const [portfolioOutputsCount, setPortfolioOutputsCount] = useState('0')
  const [passMark, setPassMark] = useState('70')
  const [foundationWeeks, setFoundationWeeks] = useState('4')
  const [intermediateWeeks, setIntermediateWeeks] = useState('4')
  const [advancedWeeks, setAdvancedWeeks] = useState('4')
  const [tools, setTools] = useState('')
  const [portfolioOutputs, setPortfolioOutputs] = useState('')

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAccess = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()

      if (!profileData || !['admin', 'superadmin'].includes(profileData.role)) {
        router.replace('/dashboard')
        return
      }

      setPageLoading(false)
    }

    checkAccess()
  }, [router])

  const resetForm = () => {
    setName('')
    setCode('')
    setTagline('')
    setDescription('')
    setDurationWeeks('12')
    setWorkPackagesCount('0')
    setPortfolioOutputsCount('0')
    setPassMark('70')
    setFoundationWeeks('4')
    setIntermediateWeeks('4')
    setAdvancedWeeks('4')
    setTools('')
    setPortfolioOutputs('')
  }

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.replace('/login')
      return
    }

    const cleanName = name.trim()
    const cleanCode = code.trim().toUpperCase()
    const generatedSlug = createSlug(cleanName)

    const levels = [
      {
        name: 'Foundation',
        weeks: Number(foundationWeeks) || 0,
      },
      {
        name: 'Intermediate',
        weeks: Number(intermediateWeeks) || 0,
      },
      {
        name: 'Advanced',
        weeks: Number(advancedWeeks) || 0,
      },
    ]

    const { error } = await supabase.from('courses').insert({
      name: cleanName,
      code: cleanCode,
      slug: generatedSlug,
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      duration_weeks: Number(durationWeeks) || 0,
      work_packages_count: Number(workPackagesCount) || 0,
      portfolio_outputs_count: Number(portfolioOutputsCount) || 0,
      pass_mark: Number(passMark) || 70,
      levels,
      tools: splitLines(tools),
      portfolio_outputs: splitLines(portfolioOutputs),
      is_active: true,
      created_by: userData.user.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Course created successfully.')
    resetForm()
    setLoading(false)
  }

  const inputClass =
    'w-full border border-[#153e90]/25 bg-white/75 px-4 py-3 text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] focus:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#153e90]'

  const labelClass =
    'mb-2 block text-sm font-medium text-[#153e90] dark:text-white/70'

  if (pageLoading) {
    return (
      <AppShell>
        <div className="text-sm text-[#153e90]/70 dark:text-white/70">
          Loading...
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-4 inline-flex items-center gap-2 text-sm text-[#153e90]/70 hover:text-[#153e90] dark:text-white/60 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h1 className="text-3xl font-bold text-[#153e90] dark:text-white">
              Add Course
            </h1>
            <p className="mt-2 text-[#153e90]/70 dark:text-white/60">
              Create a course for mentor assignment and batch creation.
            </p>
          </div>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="border border-[#54e346]/40 bg-[#54e346]/10 px-4 py-3 text-sm text-[#1c7c18] dark:text-[#54e346]">
            {message}
          </div>
        )}

        <div className="group/card relative isolate overflow-hidden border border-[#153e90]/25 bg-white p-6 text-[#153e90] shadow-[0_0_30px_rgba(21,62,144,0.08)] backdrop-blur-xl transition-all duration-500 hover:border-[#153e90]/45 hover:shadow-[0_0_50px_rgba(21,62,144,0.16)] dark:border-[#153e90]/35 dark:bg-[#111827]/60 dark:text-white dark:shadow-[0_0_30px_rgba(21,62,144,0.10)] dark:hover:border-[#153e90]/60 dark:hover:shadow-[0_0_50px_rgba(21,62,144,0.22)]">
          <span className="pointer-events-none absolute left-0 top-0 z-0 h-3 w-3 border-l-2 border-t-2 border-[#153e90]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />
          <span className="pointer-events-none absolute right-0 top-0 z-0 h-3 w-3 border-r-2 border-t-2 border-[#54e346]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />
          <span className="pointer-events-none absolute bottom-0 left-0 z-0 h-3 w-3 border-b-2 border-l-2 border-[#153e90]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />
          <span className="pointer-events-none absolute bottom-0 right-0 z-0 h-3 w-3 border-b-2 border-r-2 border-[#153e90]/70 transition-all duration-300 group-hover/card:h-6 group-hover/card:w-6" />

          <span className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(21,62,144,0.22),transparent_40%),radial-gradient(circle_at_top_right,rgba(21,62,144,0.18),transparent_45%),radial-gradient(circle_at_center,rgba(84,227,70,0.04),transparent_55%)] opacity-100 dark:bg-[radial-gradient(circle_at_top_left,rgba(21,62,144,0.22),transparent_42%),radial-gradient(circle_at_top_right,rgba(84,227,70,0.20),transparent_42%)] dark:opacity-60" />

          <span className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
            <span className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#153e90]/35 to-[#54e346]/35 dark:via-[#153e90]/40 dark:to-[#54e346]/40" />
          </span>

          <form onSubmit={handleCreateCourse} className="relative z-10 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Course Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Digital Marketing"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Course Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className={`${inputClass} uppercase`}
                  placeholder="DM"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Tagline</label>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className={inputClass}
                placeholder="From zero to campaign-ready in 12 weeks."
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} min-h-32 resize-y`}
                placeholder="Write a short course description..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className={labelClass}>Duration Weeks</label>
                <input
                  type="number"
                  min="0"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Work Packages</label>
                <input
                  type="number"
                  min="0"
                  value={workPackagesCount}
                  onChange={(e) => setWorkPackagesCount(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Portfolio Outputs</label>
                <input
                  type="number"
                  min="0"
                  value={portfolioOutputsCount}
                  onChange={(e) => setPortfolioOutputsCount(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Pass Mark</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passMark}
                  onChange={(e) => setPassMark(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-[#153e90] dark:text-white">
                Course Levels
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Foundation Weeks</label>
                  <input
                    type="number"
                    min="0"
                    value={foundationWeeks}
                    onChange={(e) => setFoundationWeeks(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Intermediate Weeks</label>
                  <input
                    type="number"
                    min="0"
                    value={intermediateWeeks}
                    onChange={(e) => setIntermediateWeeks(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Advanced Weeks</label>
                  <input
                    type="number"
                    min="0"
                    value={advancedWeeks}
                    onChange={(e) => setAdvancedWeeks(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Tools</label>
                <textarea
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                  className={`${inputClass} min-h-40 resize-y`}
                  placeholder={`Google Ads\nMeta Ads\nCanva\nGoogle Analytics`}
                />
                <p className="mt-2 text-xs text-[#153e90]/60 dark:text-white/50">
                  Add one tool per line.
                </p>
              </div>

              <div>
                <label className={labelClass}>Portfolio Outputs</label>
                <textarea
                  value={portfolioOutputs}
                  onChange={(e) => setPortfolioOutputs(e.target.value)}
                  className={`${inputClass} min-h-40 resize-y`}
                  placeholder={`Campaign plan\nAd copy set\nSocial media calendar\nFinal portfolio case study`}
                />
                <p className="mt-2 text-xs text-[#153e90]/60 dark:text-white/50">
                  Add one portfolio output per line.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#153e90]/15 pt-6 dark:border-white/10 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                Reset
              </Button>

              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create Course'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}