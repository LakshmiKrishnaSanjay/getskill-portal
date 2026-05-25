'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type Mentor = {
  id: string
  mentor_code: string | null
  manual_mentor_code: string | null
  specialization: string | null
  profiles: {
    full_name: string
    email: string
  } | null
}

type Cohort = {
  id: string
  name: string
  cohort_code: string | null
  description: string | null
  duration_months: number | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'inactive' | 'completed' | string
  course_id: string | null
  mentor_id: string | null
  batch_mode: 'online' | 'offline' | string | null
  batch_start_time: string | null
  batch_end_time: string | null
  max_seats: number | null
  courses: {
    name: string
    code: string
  } | null
  mentors: {
    mentor_code: string | null
    manual_mentor_code: string | null
    profiles: {
      full_name: string
      email: string
    } | null
  } | null
}

type CurrentProfile = {
  id: string
  role: string
}

type BatchMode = 'online' | 'offline'
type CohortStatus = 'active' | 'inactive' | 'completed'

const calculateEndDateFromDuration = (
  startDateValue: string,
  durationMonthValue: string
) => {
  if (!startDateValue || !durationMonthValue) return ''

  const monthCount = Number(durationMonthValue)

  if (!monthCount || monthCount < 1) return ''

  const date = new Date(`${startDateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) return ''

  date.setMonth(date.getMonth() + monthCount)
  date.setDate(date.getDate() - 1)

  return date.toISOString().split('T')[0]
}

export default function EditCohortPage() {
  const params = useParams()
  const router = useRouter()
  const cohortId = String(params.id || '')

  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null)
  const [cohort, setCohort] = useState<Cohort | null>(null)
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [enrolledCount, setEnrolledCount] = useState(0)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mentorId, setMentorId] = useState('')
  const [durationMonths, setDurationMonths] = useState('1')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [batchMode, setBatchMode] = useState<BatchMode>('offline')
  const [batchStartTime, setBatchStartTime] = useState('07:00')
  const [batchEndTime, setBatchEndTime] = useState('09:00')
  const [maxSeats, setMaxSeats] = useState('20')
  const [status, setStatus] = useState<CohortStatus>('active')

  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const mutedTextClass = 'text-[#153e90]/70 dark:text-white/60'

  const inputClass =
    'w-full border border-[#153e90]/25 bg-white/80 px-3 py-2 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-white/10 dark:bg-transparent dark:text-white dark:placeholder:text-white/30 dark:[color-scheme:dark]'

  const labelClass =
    'mb-2 block text-sm font-medium text-[#153e90]/70 dark:text-white/70'

  const stateBoxClass =
    'border border-[#153e90]/25 bg-white/70 p-6 text-sm text-[#153e90]/70 dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white/70'

  const optionClass =
    'bg-white text-[#153e90] dark:bg-[#111827] dark:text-white'

  useEffect(() => {
    const calculatedEndDate = calculateEndDateFromDuration(
      startDate,
      durationMonths
    )

    if (calculatedEndDate) {
      setEndDate(calculatedEndDate)
    }
  }, [startDate, durationMonths])

  const fetchPageData = async () => {
    setPageLoading(true)
    setError('')
    setMessage('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.replace('/login')
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profileData) {
      router.replace('/login')
      return
    }

    const profile = profileData as CurrentProfile
    setCurrentProfile(profile)

    const canManage =
      profile.role === 'admin' ||
      profile.role === 'superadmin' ||
      profile.role === 'super admin'

    if (!canManage) {
      router.replace('/cohorts')
      return
    }

    const [mentorsResult, cohortResult, studentsResult] =
      await Promise.all([
        supabase
          .from('mentors')
          .select(
            `
            id,
            mentor_code,
            manual_mentor_code,
            specialization,
            profiles!mentors_profile_id_fkey (
              full_name,
              email
            )
          `
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('cohorts')
          .select(
            `
            id,
            name,
            cohort_code,
            description,
            duration_months,
            start_date,
            end_date,
            status,
            course_id,
            mentor_id,
            batch_mode,
            batch_start_time,
            batch_end_time,
            max_seats,
            courses (
              name,
              code
            ),
            mentors!cohorts_mentor_id_fkey (
              mentor_code,
              manual_mentor_code,
              profiles!mentors_profile_id_fkey (
                full_name,
                email
              )
            )
          `
          )
          .eq('id', cohortId)
          .maybeSingle(),
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('cohort_id', cohortId),
      ])

    if (mentorsResult.error) {
      setError(mentorsResult.error.message)
      setPageLoading(false)
      return
    }

    if (cohortResult.error || !cohortResult.data) {
      setError(cohortResult.error?.message || 'Cohort not found.')
      setPageLoading(false)
      return
    }

    setMentors((mentorsResult.data || []) as unknown as Mentor[])
    setEnrolledCount(studentsResult.count || 0)

    const selectedCohort = cohortResult.data as unknown as Cohort
    setCohort(selectedCohort)

    setName(selectedCohort.name || '')
    setDescription(selectedCohort.description || '')
    setMentorId(selectedCohort.mentor_id || '')
    setDurationMonths(String(selectedCohort.duration_months || 1))
    setStartDate(selectedCohort.start_date || '')
    setEndDate(selectedCohort.end_date || '')
    setBatchMode(selectedCohort.batch_mode === 'online' ? 'online' : 'offline')
    setBatchStartTime(selectedCohort.batch_start_time || '07:00')
    setBatchEndTime(selectedCohort.batch_end_time || '09:00')
    setMaxSeats(String(selectedCohort.max_seats || 20))
    setStatus(
      selectedCohort.status === 'completed' || selectedCohort.status === 'inactive'
        ? selectedCohort.status
        : 'active'
    )

    setPageLoading(false)
  }

  useEffect(() => {
    if (cohortId) {
      fetchPageData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    if (!currentProfile || !cohort) {
      setError('Cohort data not found.')
      setSaving(false)
      return
    }

    if (!name.trim()) {
      setError('Cohort name is required.')
      setSaving(false)
      return
    }

    if (!mentorId) {
      setError('Please select a mentor.')
      setSaving(false)
      return
    }

    if (!durationMonths || Number(durationMonths) < 1) {
      setError('Please select batch duration.')
      setSaving(false)
      return
    }

    if (!endDate) {
      setError('Please select batch end date.')
      setSaving(false)
      return
    }

    const seatCount = Number(maxSeats)

    if (!seatCount || seatCount < 1) {
      setError('Maximum seats should be at least 1.')
      setSaving(false)
      return
    }

    if (seatCount < enrolledCount) {
      setError(`Maximum seats cannot be less than enrolled students (${enrolledCount}).`)
      setSaving(false)
      return
    }

    if (!['active', 'inactive', 'completed'].includes(status)) {
      setError('Please select a valid status.')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('cohorts')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        duration_months: Number(durationMonths),
        start_date: startDate,
        end_date: endDate,
        status,
        mentor_id: mentorId,
        batch_end_time: batchEndTime,
        max_seats: seatCount,
      })
      .eq('id', cohort.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setMessage('Cohort updated successfully.')
    setSaving(false)

    router.push('/cohorts')
    router.refresh()
  }

  if (pageLoading) {
    return (
      <AppShell>
        <div className="space-y-6 text-[#153e90] dark:text-white">
          <Button asChild variant="outline" size="sm">
            <Link href="/cohorts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cohorts
            </Link>
          </Button>

          <Card>
            <CardContent>
              <p className={`text-sm ${mutedTextClass}`}>Loading cohort edit page...</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (error && !cohort) {
    return (
      <AppShell>
        <div className="space-y-6 text-[#153e90] dark:text-white">
          <Button asChild variant="outline" size="sm">
            <Link href="/cohorts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cohorts
            </Link>
          </Button>

          <Card>
            <CardContent>
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/cohorts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cohorts
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#153e90] dark:text-white">
            Edit Cohort
          </h1>
          <p className={`mt-2 ${mutedTextClass}`}>
            Update batch information without changing the generated Batch ID.
          </p>
        </div>

        {message && (
          <p className="border border-[#54e346]/40 bg-[#54e346]/10 px-3 py-2 text-sm text-[#1c7c18] dark:text-[#54e346]">
            {message}
          </p>
        )}

        {error && cohort && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-[#153e90] dark:text-white">
              Cohort Information
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Batch ID</label>
                  <input
                    value={cohort?.cohort_code || 'No Batch ID'}
                    className={`${inputClass} cursor-not-allowed opacity-75`}
                    disabled
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Batch ID is kept unchanged to protect existing student codes.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as CohortStatus)}
                    className={inputClass}
                  >
                    <option value="active" className={optionClass}>
                      Active
                    </option>
                    <option value="inactive" className={optionClass}>
                      Inactive
                    </option>
                    <option value="completed" className={optionClass}>
                      Completed
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Cohort Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  placeholder="Cohort name"
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${inputClass} min-h-24 resize-y`}
                  placeholder="Short description about this batch"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Course</label>
                  <input
                    value={
                      cohort?.courses
                        ? `${cohort.courses.name} (${cohort.courses.code})`
                        : 'No course assigned'
                    }
                    className={`${inputClass} cursor-not-allowed opacity-75`}
                    disabled
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Course is locked because it is part of the generated Batch ID.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Mentor</label>
                  <select
                    value={mentorId}
                    onChange={(event) => setMentorId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="" className={optionClass}>
                      Select mentor
                    </option>
                    {mentors.map((mentor) => (
                      <option key={mentor.id} value={mentor.id} className={optionClass}>
                        {mentor.profiles?.full_name || 'No name'}
                        {mentor.manual_mentor_code ? ` (${mentor.manual_mentor_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Batch Duration</label>
                  <select
                    value={durationMonths}
                    onChange={(event) => setDurationMonths(event.target.value)}
                    className={inputClass}
                  >
                    <option value="1" className={optionClass}>1 Month</option>
                    <option value="2" className={optionClass}>2 Months</option>
                    <option value="3" className={optionClass}>3 Months</option>
                    <option value="4" className={optionClass}>4 Months</option>
                    <option value="5" className={optionClass}>5 Months</option>
                    <option value="6" className={optionClass}>6 Months</option>
                    <option value="12" className={optionClass}>12 Months</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Online / Offline Mode</label>
                  <input
                    value={batchMode === 'online' ? 'Online' : 'Offline'}
                    className={`${inputClass} cursor-not-allowed opacity-75`}
                    disabled
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Mode is locked because it is part of the generated Batch ID.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Batch Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    className={`${inputClass} cursor-not-allowed opacity-75`}
                    disabled
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Start date is locked because month and year are part of the generated Batch ID.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Batch End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Batch Start Time</label>
                  <input
                    type="time"
                    value={batchStartTime}
                    className={`${inputClass} cursor-not-allowed opacity-75`}
                    disabled
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Start time is locked because it is part of the generated Batch ID.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Batch End Time</label>
                  <input
                    type="time"
                    value={batchEndTime}
                    onChange={(event) => setBatchEndTime(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Maximum Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={maxSeats}
                    onChange={(event) => setMaxSeats(event.target.value)}
                    className={inputClass}
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Current enrolled students: {enrolledCount}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/cohorts">Cancel</Link>
                </Button>

                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
