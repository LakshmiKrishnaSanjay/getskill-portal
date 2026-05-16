'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, Plus, Search, X, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Cohort = {
  id: string
  name: string
  cohort_code: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [name, setName] = useState('')
  const [cohortCode, setCohortCode] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

const generateCohortCode = (cohortName?: string) => {
  const words =
    cohortName
      ?.trim()
      .split(' ')
      .filter((word) => !/^\d+$/.test(word))
      .filter(Boolean) || []

  const base =
    words.length > 0
      ? words
          .map((word) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 4)
      : 'COH'

  const yearMatch = cohortName?.match(/\b(20\d{2})\b/)
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

  const nextNumber = String(cohorts.length + 1).padStart(3, '0')

  return `${base}-${year}-${nextNumber}`
}

  const fetchCohorts = async () => {
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    setCohorts(data || [])
  }

  useEffect(() => {
    fetchCohorts()
  }, [])

  const filteredCohorts = useMemo(() => {
    return cohorts.filter((cohort) => {
      const keyword = search.toLowerCase()

      return (
        cohort.name.toLowerCase().includes(keyword) ||
        cohort.cohort_code?.toLowerCase().includes(keyword) ||
        cohort.description?.toLowerCase().includes(keyword) ||
        cohort.status.toLowerCase().includes(keyword)
      )
    })
  }, [cohorts, search])

  const openAddModal = () => {
    setName('')
    setCohortCode(generateCohortCode())
    setDescription('')
    setStartDate('')
    setEndDate('')
    setMessage('')
    setError('')
    setIsModalOpen(true)
  }

  const handleCreateCohort = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError('User not logged in.')
      setLoading(false)
      return
    }

    const finalCode = cohortCode || generateCohortCode(name)

    const { error: insertError } = await supabase.from('cohorts').insert({
      name,
      cohort_code: finalCode,
      description: description || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'active',
      created_by: userData.user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setMessage('Cohort created successfully.')
    setName('')
    setCohortCode('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setLoading(false)
    setIsModalOpen(false)

    fetchCohorts()
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cohorts</h1>
            <p className="text-muted-foreground">
              Create and manage student batches.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none sm:w-72"
                placeholder="Search cohorts..."
              />
            </div>

            <Button onClick={openAddModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cohort
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              All Cohorts
            </CardTitle>
          </CardHeader>

          <CardContent>
            {filteredCohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No cohorts found.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredCohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{cohort.name}</h3>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {cohort.cohort_code || 'No code'}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">
                        {cohort.description || 'No description'}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {cohort.start_date || 'No start date'} to{' '}
                        {cohort.end_date || 'No end date'}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {cohort.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add New Cohort</h2>
                <p className="text-sm text-muted-foreground">
                  Create a new batch for students.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Cohort Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Example: Full Stack Batch 01"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cohort Code</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={cohortCode}
                    onChange={(e) => setCohortCode(e.target.value.toUpperCase())}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Example: FSB-2026-1234"
                    required
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCohortCode(generateCohortCode(name))}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Short description about this batch"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Cohort'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}