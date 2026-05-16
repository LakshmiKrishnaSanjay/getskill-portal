'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, UserCheck, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Cohort = {
  id: string
  name: string
}

type Mentor = {
  id: string
  specialization: string | null
  status: string
  profile_picture_url: string | null
  profiles: {
    full_name: string
    email: string
  } | null
  cohort_mentors: {
    cohorts: {
      name: string
    } | null
  }[]
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [specialization, setSpecialization] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [cohortId, setCohortId] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchMentors = async () => {
    const { data, error } = await supabase
      .from('mentors')
      .select(`
        id,
        specialization,
        status,
        profile_picture_url,
        profiles (
          full_name,
          email
        ),
        cohort_mentors (
          cohorts (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    setMentors((data || []) as Mentor[])
  }

  const fetchCohorts = async () => {
    const { data, error } = await supabase
      .from('cohorts')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    setCohorts(data || [])

    if (data && data.length > 0) {
      setCohortId(data[0].id)
    }
  }

  useEffect(() => {
    fetchMentors()
    fetchCohorts()
  }, [])

  const filteredMentors = useMemo(() => {
    const keyword = search.toLowerCase()

    return mentors.filter((mentor) => {
      const name = mentor.profiles?.full_name?.toLowerCase() || ''
      const email = mentor.profiles?.email?.toLowerCase() || ''
      const spec = mentor.specialization?.toLowerCase() || ''
      const status = mentor.status?.toLowerCase() || ''
      const cohortName =
        mentor.cohort_mentors?.[0]?.cohorts?.name?.toLowerCase() || ''

      return (
        name.includes(keyword) ||
        email.includes(keyword) ||
        spec.includes(keyword) ||
        status.includes(keyword) ||
        cohortName.includes(keyword)
      )
    })
  }, [mentors, search])

  const handleCreateMentor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('specialization', specialization)
      formData.append('cohortId', cohortId)

      if (profileImage) {
        formData.append('profileImage', profileImage)
      }

      const response = await fetch('/api/admin/create-mentor', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create mentor.')
        return
      }

      setMessage('Mentor created successfully.')

      setFullName('')
      setEmail('')
      setPassword('123456')
      setSpecialization('')
      setProfileImage(null)
      setIsModalOpen(false)

      await fetchMentors()
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mentors</h1>
            <p className="text-muted-foreground">
              Manage teachers and assign them to batches.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none sm:w-72"
                placeholder="Search mentors..."
              />
            </div>

            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Mentor
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
              <UserCheck className="h-5 w-5" />
              All Mentors
            </CardTitle>
          </CardHeader>

          <CardContent>
            {filteredMentors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No mentors found.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredMentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
                        {mentor.profile_picture_url ? (
                          <img
                            src={mentor.profile_picture_url}
                            alt={mentor.profiles?.full_name || 'Mentor'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserCheck className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          {mentor.profiles?.full_name || 'No name'}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {mentor.profiles?.email || 'No email'}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {mentor.specialization || 'No specialization'}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Batch:{' '}
                          {mentor.cohort_mentors?.[0]?.cohorts?.name ||
                            'Not assigned'}
                        </p>
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      {mentor.status}
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
                <h2 className="text-xl font-bold">Add New Mentor</h2>
                <p className="text-sm text-muted-foreground">
                  Create a teacher login and assign a batch.
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

            <form onSubmit={handleCreateMentor} className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Enter mentor name"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="mentor@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Temporary password"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Specialization</label>
                <input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Example: Full Stack Development"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Assign Cohort</label>
                <select
                  value={cohortId}
                  onChange={(e) => setCohortId(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                >
                  {cohorts.length === 0 ? (
                    <option value="">No cohorts available</option>
                  ) : (
                    cohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={loading || cohorts.length === 0}>
                  {loading ? 'Creating...' : 'Create Mentor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}