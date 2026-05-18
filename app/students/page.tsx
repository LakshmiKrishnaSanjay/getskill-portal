'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  X,
  User,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'

type Cohort = {
  id: string
  name: string
}

type Student = {
  id: string
  student_code: string
  phone: string | null
  status: string
  joining_date: string | null
  profile_picture_url: string | null
  cohort_id: string
  profiles: {
    full_name: string
    email: string
  } | null
  cohorts: {
    name: string
  } | null
}

type AttendanceRecord = {
  student_id: string
  status: string
}

type ReviewRecord = {
  score: number | null
  submissions: {
    student_id: string
  } | null
}

type Profile = {
  id: string
  role: Role
}

type Mentor = {
  id: string
  profile_id: string
}

export default function StudentsPage() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])

  const [search, setSearch] = useState('')
  const [cohortFilter, setCohortFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [phone, setPhone] = useState('')
  const [cohortId, setCohortId] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchCurrentProfile = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError('User not logged in.')
      return null
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profileData) {
      setError('Profile not found.')
      return null
    }

    const profile = profileData as Profile
    setCurrentRole(profile.role)

    return profile
  }

  const fetchAdminCohorts = async () => {
    const { data, error } = await supabase
      .from('cohorts')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return []
    }

    const realCohorts = (data || []) as Cohort[]
    setCohorts(realCohorts)

    if (realCohorts.length > 0) {
      setCohortId(realCohorts[0].id)
    }

    return realCohorts
  }

  const fetchMentorCohorts = async (profileId: string) => {
    const { data: mentorData, error: mentorError } = await supabase
      .from('mentors')
      .select('id, profile_id')
      .eq('profile_id', profileId)
      .single()

    if (mentorError || !mentorData) {
      setError('Mentor record not found.')
      setCohorts([])
      return []
    }

    const mentor = mentorData as Mentor

    const { data, error } = await supabase
      .from('cohort_mentors')
      .select(`
        cohorts (
          id,
          name
        )
      `)
      .eq('mentor_id', mentor.id)

    if (error) {
      setError(error.message)
      setCohorts([])
      return []
    }

    const realCohorts =
      data?.map((item: any) => item.cohorts).filter(Boolean) || []

    setCohorts(realCohorts)

    if (realCohorts.length > 0) {
      setCohortId(realCohorts[0].id)
    }

    return realCohorts as Cohort[]
  }

  const fetchStudents = async (role: Role, allowedCohortIds: string[]) => {
    if (role === 'mentor' && allowedCohortIds.length === 0) {
      setStudents([])
      return
    }

    let query = supabase
      .from('students')
      .select(`
        id,
        student_code,
        phone,
        status,
        joining_date,
        profile_picture_url,
        cohort_id,
        profiles (
          full_name,
          email
        ),
        cohorts (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (role === 'mentor') {
      query = query.in('cohort_id', allowedCohortIds)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      return
    }

    setStudents((data || []) as Student[])
  }

  const fetchAttendance = async (role: Role, allowedCohortIds: string[]) => {
    if (role === 'mentor' && allowedCohortIds.length === 0) {
      setAttendanceRecords([])
      return
    }

    let query = supabase.from('attendance').select('student_id, status')

    if (role === 'mentor') {
      query = query.in('cohort_id', allowedCohortIds)
    }

    const { data, error } = await query

    if (error) {
      return
    }

    setAttendanceRecords(data || [])
  }

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        score,
        submissions (
          student_id
        )
      `)

    if (error) {
      return
    }

    setReviews((data || []) as ReviewRecord[])
  }

  const fetchAllData = async () => {
    setFetching(true)
    setError('')

    const profile = await fetchCurrentProfile()

    if (!profile) {
      setFetching(false)
      return
    }

    if (profile.role === 'student') {
      setStudents([])
      setCohorts([])
      setAttendanceRecords([])
      setReviews([])
      setFetching(false)
      return
    }

    let realCohorts: Cohort[] = []

    if (profile.role === 'admin') {
      realCohorts = await fetchAdminCohorts()
    }

    if (profile.role === 'mentor') {
      realCohorts = await fetchMentorCohorts(profile.id)
    }

    const allowedCohortIds = realCohorts.map((cohort) => cohort.id)

    await Promise.all([
      fetchStudents(profile.role, allowedCohortIds),
      fetchAttendance(profile.role, allowedCohortIds),
      fetchReviews(),
    ])

    setFetching(false)
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const getAttendanceRate = (studentId: string) => {
    const records = attendanceRecords.filter(
      (record) => record.student_id === studentId
    )

    if (records.length === 0) {
      return 0
    }

    const attended = records.filter(
      (record) => record.status === 'present' || record.status === 'late'
    ).length

    return Math.round((attended / records.length) * 100)
  }

  const getAverageGrade = (studentId: string) => {
    const studentReviews = reviews.filter(
      (review) =>
        review.submissions?.student_id === studentId &&
        typeof review.score === 'number'
    )

    if (studentReviews.length === 0) {
      return 0
    }

    const total = studentReviews.reduce(
      (sum, review) => sum + (review.score || 0),
      0
    )

    return Math.round(total / studentReviews.length)
  }

  const getEligibility = (attendanceRate: number, avgGrade: number) => {
    return {
      eligible: attendanceRate >= 75 && avgGrade >= 60,
    }
  }

  const enriched = useMemo(() => {
    return students.map((student) => {
      const attendanceRate = getAttendanceRate(student.id)
      const avgGrade = getAverageGrade(student.id)
      const eligibility = getEligibility(attendanceRate, avgGrade)

      return {
        ...student,
        attendanceRate,
        avgGrade,
        eligibility,
        name: student.profiles?.full_name || 'No name',
        email: student.profiles?.email || 'No email',
        cohortName: student.cohorts?.name || '—',
      }
    })
  }, [students, attendanceRecords, reviews])

  const filtered = useMemo(() => {
    return enriched.filter((student) => {
      const keyword = search.toLowerCase()

      const matchesSearch =
        student.name.toLowerCase().includes(keyword) ||
        student.email.toLowerCase().includes(keyword) ||
        student.student_code.toLowerCase().includes(keyword) ||
        student.phone?.toLowerCase().includes(keyword) ||
        student.cohortName.toLowerCase().includes(keyword)

      const matchesCohort =
        cohortFilter === 'all' || student.cohort_id === cohortFilter

      return matchesSearch && matchesCohort
    })
  }, [enriched, search, cohortFilter])

  const handleCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('phone', phone)
      formData.append('cohortId', cohortId)

      if (profileImage) {
        formData.append('profileImage', profileImage)
      }

      const response = await fetch('/api/admin/create-student', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create student.')
        return
      }

      setMessage(
        result.studentCode
          ? `Student created successfully. Code: ${result.studentCode}`
          : 'Student created successfully.'
      )

      setFullName('')
      setEmail('')
      setPassword('123456')
      setPhone('')
      setProfileImage(null)
      setIsModalOpen(false)

      await fetchAllData()
    } catch {
      setError('Something went wrong while creating student.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </AppShell>
    )
  }

  if (currentRole === 'student') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">
            Students directory is only available to mentors and admins.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Students</h1>
            <p className="text-muted-foreground mt-1">
              {students.length} students across {cohorts.length} cohorts
            </p>
          </div>

          {currentRole === 'admin' && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          )}
        </div>

        {message && (
          <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-500">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cohorts</SelectItem>
              {cohorts.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="text-2xl font-semibold mt-0.5">{students.length}</p>
          </div>

          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Internship Eligible</p>
            <p className="text-2xl font-semibold text-green-400 mt-0.5">
              {enriched.filter((student) => student.eligibility.eligible).length}
            </p>
          </div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Below 75% Attendance</p>
            <p className="text-2xl font-semibold text-yellow-400 mt-0.5">
              {enriched.filter((student) => student.attendanceRate < 75).length}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="col-span-4">Student</span>
            <span className="col-span-2">Cohort</span>
            <span className="col-span-2">Attendance</span>
            <span className="col-span-2">Avg Grade</span>
            <span className="col-span-1">Eligible</span>
            <span className="col-span-1" />
          </div>

          {filtered.map((student) => {
            const initials = student.name
              .split(' ')
              .map((name) => name[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <Link key={student.id} href={`/students/${student.id}`}>
                <div
                  className={cn(
                    'grid grid-cols-12 gap-3 items-center rounded-lg border px-3 py-3 hover:bg-accent/30 transition-colors cursor-pointer',
                    student.attendanceRate < 75
                      ? 'border-yellow-500/20'
                      : 'border-border'
                  )}
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={student.profile_picture_url || ''} />
                      <AvatarFallback className="text-xs">
                        {initials || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.student_code}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Badge variant="secondary" className="text-xs">
                      {student.cohortName}
                    </Badge>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      {student.attendanceRate < 75 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                      )}

                      <span
                        className={cn(
                          'text-sm font-medium',
                          student.attendanceRate >= 75
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        )}
                      >
                        {student.attendanceRate}%
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-sm">
                      {student.avgGrade > 0 ? `${student.avgGrade}%` : '—'}
                    </span>
                  </div>

                  <div className="col-span-1">
                    {student.eligibility.eligible ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            )
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No students found
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-background p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add New Student</h2>
                <p className="text-sm text-muted-foreground">
                  Create a student login and assign a cohort. Student code will be generated automatically.
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

            <form onSubmit={handleCreateStudent} className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter student name"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Temporary password"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Example: +971 50 000 0000"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Profile Picture</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Assign Cohort</label>
                <Select value={cohortId} onValueChange={setCohortId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {loading ? 'Creating...' : 'Create Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}