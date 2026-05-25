'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Mail, Phone, Plus, Search, UserRound, Users, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type CurrentProfile = {
  id: string
  role: string
}

type Cohort = {
  id: string
  name: string
  cohort_code: string | null
  description: string | null
  duration_months: number | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  created_by: string | null
  course_id: string | null
  mentor_id: string | null
  batch_mode: string | null
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
    specialization: string | null
    profiles: {
      full_name: string
      email: string
    } | null
  } | null
}

type Student = {
  id: string
  profile_id: string
  cohort_id: string
  student_code: string
  phone: string | null
  status: string
  joining_date: string | null
  created_at: string
  profile_picture_url: string | null
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
  } | null
}

type StudentForm = {
  fullName: string
  email: string
  password: string
  phone: string
  joiningDate: string
  status: string
}

const isAdminRole = (role: string | null | undefined) => {
  return role === 'admin' || role === 'superadmin' || role === 'super admin'
}

const formatDate = (dateValue: string | null | undefined) => {
  if (!dateValue) return 'Not added'

  const date = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) return 'Not added'

  return date.toLocaleDateString()
}

const formatTime = (timeValue: string | null | undefined) => {
  if (!timeValue) return 'Not added'

  const [hourValue, minuteValue] = timeValue.split(':')
  const hour = Number(hourValue)
  const minute = Number(minuteValue || '0')

  if (Number.isNaN(hour)) return 'Not added'

  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12

  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}


export default function CohortDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const cohortId = String(params.id || '')

  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null)
  const [cohort, setCohort] = useState<Cohort | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')

  const [pageLoading, setPageLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState('')

  const [studentForm, setStudentForm] = useState<StudentForm>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'active',
  })

  const mutedTextClass = 'text-[#153e90]/70 dark:text-white/60'

  const inputClass =
    'w-full border border-[#153e90]/25 bg-white/80 px-3 py-2 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-white/10 dark:bg-transparent dark:text-white dark:placeholder:text-white/30 dark:[color-scheme:dark]'

  const labelClass =
    'mb-2 block text-sm font-medium text-[#153e90]/70 dark:text-white/70'

  const optionClass =
    'bg-white text-[#153e90] dark:bg-[#111827] dark:text-white'

  const stateBoxClass =
    'border border-[#153e90]/25 bg-white/70 p-6 text-sm text-[#153e90]/70 dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white/70'

  const canCreateStudent = isAdminRole(currentProfile?.role)
  const enrolledCount = students.length
  const maxSeats = cohort?.max_seats || 0
  const availableSeats = maxSeats > 0 ? Math.max(maxSeats - enrolledCount, 0) : null
  const isCohortFull = maxSeats > 0 && enrolledCount >= maxSeats

  const nextStudentCode = useMemo(() => {
    if (!cohort?.cohort_code) return 'Batch ID not generated'

    const highestStudentNumber = students.reduce((highest, student) => {
      const match = student.student_code?.match(/-ST(\d+)$/)
      const currentNumber = match ? Number(match[1]) : 0

      return currentNumber > highest ? currentNumber : highest
    }, 0)

    return `${cohort.cohort_code}-ST${String(highestStudentNumber + 1).padStart(3, '0')}`
  }, [cohort?.cohort_code, students])

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return students

    return students.filter((student) => {
      return (
        student.profiles?.full_name?.toLowerCase().includes(keyword) ||
        student.profiles?.email?.toLowerCase().includes(keyword) ||
        student.student_code?.toLowerCase().includes(keyword) ||
        student.phone?.toLowerCase().includes(keyword) ||
        student.status?.toLowerCase().includes(keyword)
      )
    })
  }, [students, search])

  const resetForm = () => {
    setStudentForm({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
    })
    setProfileImage(null)
    setProfileImagePreview('')
  }

  const fetchStudents = async () => {
    if (!cohortId) return

    setStudentsLoading(true)

    const { data, error: studentsError } = await supabase
      .from('students')
      .select(
        `
        id,
        profile_id,
        cohort_id,
        student_code,
        phone,
        status,
        joining_date,
        created_at,
        profile_picture_url,
        profiles!students_profile_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq('cohort_id', cohortId)
      .order('created_at', { ascending: false })

    if (studentsError) {
      setError(studentsError.message)
      setStudentsLoading(false)
      return
    }

    setStudents((data || []) as unknown as Student[])
    setStudentsLoading(false)
  }

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

    setCurrentProfile(profileData as CurrentProfile)

    const { data: cohortData, error: cohortError } = await supabase
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
        created_at,
        created_by,
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
          specialization,
          profiles!mentors_profile_id_fkey (
            full_name,
            email
          )
        )
      `
      )
      .eq('id', cohortId)
      .maybeSingle()

    if (cohortError || !cohortData) {
      setError(cohortError?.message || 'Cohort not found.')
      setPageLoading(false)
      return
    }

    setCohort(cohortData as unknown as Cohort)
    await fetchStudents()
    setPageLoading(false)
  }

  useEffect(() => {
    if (cohortId) {
      fetchPageData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId])

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null

    setError('')

    if (!file) {
      setProfileImage(null)
      setProfileImagePreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      setProfileImage(null)
      setProfileImagePreview('')
      return
    }

    setProfileImage(file)
    setProfileImagePreview(URL.createObjectURL(file))
  }

  const handleCreateStudent = async () => {
    if (!cohort) return

    setError('')
    setMessage('')

    if (!canCreateStudent) {
      setError('Only Admin and Super Admin can create students.')
      return
    }

    if (!studentForm.fullName.trim() || !studentForm.email.trim() || !studentForm.password.trim()) {
      setError('Full name, email, and password are required.')
      return
    }

    if (!cohort.cohort_code) {
      setError('This cohort does not have a Batch ID. Please add a Batch ID before creating students.')
      return
    }

    if (cohort.status !== 'active') {
      setError('Students can only be added to an active cohort.')
      return
    }

    if (isCohortFull) {
      setError('This cohort is already full. Enrollment is stopped.')
      return
    }

    setSaving(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      setError('Session expired. Please login again.')
      setSaving(false)
      return
    }

    const formData = new FormData()
    formData.append('fullName', studentForm.fullName.trim())
    formData.append('email', studentForm.email.trim().toLowerCase())
    formData.append('password', studentForm.password.trim())
    formData.append('phone', studentForm.phone.trim())
    formData.append('cohortId', cohort.id)
    formData.append('joiningDate', studentForm.joiningDate)
    formData.append('status', studentForm.status)

    if (profileImage) {
      formData.append('profileImage', profileImage)
    }

    const response = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      setError(result.error || 'Failed to create student.')
      setSaving(false)
      return
    }

    setMessage(`Student created successfully. Student code: ${result.studentCode}`)
    resetForm()
    setIsModalOpen(false)
    await fetchStudents()
    setSaving(false)
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
              <p className={`text-sm ${mutedTextClass}`}>Loading cohort details...</p>
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

          {canCreateStudent && (
            <Button
              type="button"
              onClick={() => {
                setError('')
                setMessage('')
                resetForm()
                setIsModalOpen(true)
              }}
              disabled={isCohortFull || cohort?.status !== 'active'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Student to This Cohort
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#153e90] dark:text-white">
            {cohort?.name || 'Cohort Details'}
          </h1>
          <p className={`mt-2 ${mutedTextClass}`}>
            Manage students enrolled in this cohort.
          </p>
        </div>

        {message && (
          <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        {error && cohort && (
          <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Enrolled Students</p>
                  <p className="text-2xl font-bold text-[#153e90] dark:text-white">{enrolledCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Maximum Seats</p>
                  <p className="text-2xl font-bold text-[#153e90] dark:text-white">{maxSeats || 'No limit'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Available Seats</p>
                  <p className="text-2xl font-bold text-[#153e90] dark:text-white">
                    {availableSeats === null ? 'No limit' : availableSeats}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-xs ${mutedTextClass}`}>Mentor</p>
                  <p className="text-sm font-bold text-[#153e90] dark:text-white">
                    {cohort?.mentors?.profiles?.full_name || 'Not assigned'}
                  </p>
                  <p className={`text-xs ${mutedTextClass}`}>
                    Code: {cohort?.mentors?.manual_mentor_code || 'Not added'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-[#153e90] dark:text-white">Students in This Cohort</CardTitle>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#153e90]/50 dark:text-white/40" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students..."
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
          </CardHeader>

<CardContent>
  {studentsLoading ? (
    <div className={stateBoxClass}>Loading students...</div>
  ) : filteredStudents.length === 0 ? (
    <div className={stateBoxClass}>
      {students.length === 0
        ? 'No students enrolled in this cohort yet.'
        : 'No students match your search.'}
    </div>
  ) : (
    <div className="overflow-hidden border border-[#153e90]/25 bg-white/75 dark:border-[#153e90]/35 dark:bg-[#111827]/45">
      <div className="hidden border-b border-[#153e90]/25 bg-[#153e90] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white/70 md:grid md:grid-cols-[1.5fr_1.5fr_1.3fr_1fr_100px] md:gap-4">
        <div>Student</div>
        <div>Email</div>
        <div>Phone</div>
        <div>Status</div>
        <div>Action</div>
      </div>

      <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
        {filteredStudents.map((student) => {
          const avatarUrl =
            student.profile_picture_url || student.profiles?.avatar_url || '/avatar.svg'

          return (
            <div
              key={student.id}
              className="grid gap-4 bg-white/60 px-5 py-4 text-sm text-[#153e90] transition hover:bg-[#153e90]/10 dark:bg-[#111827]/40 dark:text-white dark:hover:bg-[#153e90]/10 md:grid-cols-[1.5fr_1.5fr_1.3fr_1fr_100px] md:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                  <img
                    src={avatarUrl}
                    alt={student.profiles?.full_name || 'Student'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-[#153e90] dark:text-white">
                    {student.profiles?.full_name || 'No name'}
                  </p>
                  <p className={`text-xs ${mutedTextClass}`}>
                    Joined {formatDate(student.joining_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 break-all">
                <Mail className="h-4 w-4 opacity-60" />
                {student.profiles?.email || 'No email'}
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 opacity-60" />
                {student.phone || 'Not added'}
              </div>

              <div>
                <span className="inline-flex border border-[#153e90]/20 bg-white/70 px-2.5 py-1 text-xs font-medium capitalize text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                  {student.status}
                </span>
              </div>

              <div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/students/${student.id}`}>View</Link>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )}
</CardContent>
        </Card>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[#153e90]/25 bg-white p-6 shadow-2xl dark:border-[#153e90]/35 dark:bg-[#0b1120]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#153e90] dark:text-white">
                    Add Student to This Cohort
                  </h2>
                  <p className={`mt-1 text-sm ${mutedTextClass}`}>
                    The student code will be generated from this batch automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="text-[#153e90]/70 transition hover:text-[#153e90] dark:text-white/60 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    value={studentForm.fullName}
                    onChange={(event) =>
                      setStudentForm((previous) => ({
                        ...previous,
                        fullName: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Student full name"
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(event) =>
                      setStudentForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="student@email.com"
                  />
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    value={studentForm.password}
                    onChange={(event) =>
                      setStudentForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Temporary password"
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    value={studentForm.phone}
                    onChange={(event) =>
                      setStudentForm((previous) => ({
                        ...previous,
                        phone: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input
                    type="date"
                    value={studentForm.joiningDate}
                    onChange={(event) =>
                      setStudentForm((previous) => ({
                        ...previous,
                        joiningDate: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={studentForm.status}
                    onChange={(event) =>
                      setStudentForm((previous) => ({
                        ...previous,
                        status: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="active" className={optionClass}>
                      active
                    </option>
                    <option value="pending" className={optionClass}>
                      pending
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className={inputClass}
                  />
                  {profileImagePreview && (
                    <div className="mt-3 h-20 w-20 overflow-hidden border border-[#153e90]/25 dark:border-white/10">
                      <img
                        src={profileImagePreview}
                        alt="Student preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button type="button" onClick={handleCreateStudent} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Student'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
