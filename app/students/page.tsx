'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'

type CurrentRole = Role | 'superadmin' | 'super admin' | 'placement'

type CurrentProfile = {
  id: string
  role: CurrentRole
}

type MentorRecord = {
  id: string
  profile_id: string
}

type CohortSummary = {
  id: string
  name: string
  cohort_code: string | null
  mentor_id?: string | null
}

type Student = {
  id: string
  profile_id: string
  cohort_id: string | null
  student_code: string | null
  phone: string | null
  status: string | null
  joining_date: string | null
  profile_picture_url: string | null
  created_at: string | null
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
  } | null
  cohorts: {
    id: string
    name: string
    cohort_code: string | null
    batch_mode: string | null
    batch_start_time: string | null
    duration_months: number | null
    status: string | null
    courses: {
      id: string
      name: string
      code: string | null
    } | null
  } | null
}

type AttendanceRecord = {
  student_id: string
  cohort_id: string | null
  status: string
}

type ReviewRecord = {
  score: number | null
  submissions: {
    student_id: string
  } | null
}

type EnrichedStudent = Student & {
  attendanceRate: number
  avgGrade: number
  eligibility: {
    eligible: boolean
    attendanceOk: boolean
    gradeOk: boolean
  }
  name: string
  email: string
  cohortName: string
  courseName: string
}

type CustomIconName =
  | 'search'
  | 'patch'
  | 'students'
  | 'eligible'
  | 'attendance'
  | 'grade'
  | 'warning'
  | 'check'

const CustomIcon = ({
  name,
  className = 'h-4 w-4',
  alt = '',
}: {
  name: CustomIconName
  className?: string
  alt?: string
}) => {
  return (
    <>
      <img
        src={`/icons/dark-mode/${name}.svg`}
        alt={alt}
        className={`${className} dark:hidden`}
      />
      <img
        src={`/icons/light-mode/${name}.svg`}
        alt={alt}
        className={`hidden ${className} dark:block`}
      />
    </>
  )
}

const isAdminRole = (role: CurrentRole | null) => {
  return role === 'admin' || role === 'superadmin' || role === 'super admin'
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not added'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not added'

  return date.toLocaleDateString()
}

const formatTime = (value: string | null | undefined) => {
  if (!value) return 'Not added'

  const [hourValue, minuteValue] = value.split(':')
  const hour = Number(hourValue)
  const minute = Number(minuteValue || 0)

  if (Number.isNaN(hour)) return value

  const date = new Date()
  date.setHours(hour, minute, 0, 0)

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return 'ST'

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function StudentsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [cohortFilter, setCohortFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const mutedTextClass = 'text-[#153e90]/70 dark:text-white/60'

  const inputClass =
    'w-full border border-[#153e90]/25 bg-white/80 px-3 py-2 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white dark:placeholder:text-white/30'

  const selectClass =
    'w-full border border-[#153e90]/25 bg-white/80 px-3 py-2 text-sm text-[#153e90] outline-none focus:border-[#153e90] dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white'

  const optionClass = 'bg-white text-[#153e90] dark:bg-[#111827] dark:text-white'

  const stateBoxClass =
    'border border-[#153e90]/25 bg-white/70 p-6 text-sm text-[#153e90]/70 dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white/70'

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

    const profile = profileData as CurrentProfile
    setCurrentProfile(profile)

    return profile
  }

  const fetchMentorCohortIds = async (profileId: string) => {
    const { data: mentorData, error: mentorError } = await supabase
      .from('mentors')
      .select('id, profile_id')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (mentorError || !mentorData) {
      return [] as string[]
    }

    const mentor = mentorData as MentorRecord

    const [directCohortsResult, assignedCohortsResult] = await Promise.all([
      supabase
        .from('cohorts')
        .select('id, name, cohort_code, mentor_id')
        .eq('mentor_id', mentor.id),
      supabase
        .from('cohort_mentors')
        .select(
          `
          cohorts (
            id,
            name,
            cohort_code
          )
        `
        )
        .eq('mentor_id', mentor.id),
    ])

    const directCohorts = (directCohortsResult.data || []) as CohortSummary[]
    const assignedCohorts =
      assignedCohortsResult.data
        ?.map((item: any) => item.cohorts)
        .filter(Boolean) || []

    const ids = [...directCohorts, ...assignedCohorts].map(
      (cohort: CohortSummary) => cohort.id
    )

    return Array.from(new Set(ids))
  }

  const fetchStudents = async (profile: CurrentProfile, mentorCohortIds: string[]) => {
    let query = supabase
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
        profile_picture_url,
        created_at,
        profiles (
          full_name,
          email,
          avatar_url
        ),
        cohorts (
          id,
          name,
          cohort_code,
          batch_mode,
          batch_start_time,
          duration_months,
          status,
          courses (
            id,
            name,
            code
          )
        )
      `
      )
      .order('created_at', { ascending: false })

    if (profile.role === 'mentor') {
      if (mentorCohortIds.length === 0) {
        setStudents([])
        return
      }

      query = query.in('cohort_id', mentorCohortIds)
    }

    if (profile.role === 'student') {
      query = query.eq('profile_id', profile.id)
    }

    const { data, error: studentsError } = await query

    if (studentsError) {
      setError(studentsError.message)
      return
    }

    setStudents((data || []) as unknown as Student[])
  }

  const fetchAttendance = async (profile: CurrentProfile, mentorCohortIds: string[]) => {
    let query = supabase.from('attendance').select('student_id, cohort_id, status')

    if (profile.role === 'mentor') {
      if (mentorCohortIds.length === 0) {
        setAttendanceRecords([])
        return
      }

      query = query.in('cohort_id', mentorCohortIds)
    }

    if (profile.role === 'student') {
      const { data: ownStudentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)

      const ownStudentIds = (ownStudentData || []).map((student) => student.id)

      if (ownStudentIds.length === 0) {
        setAttendanceRecords([])
        return
      }

      query = query.in('student_id', ownStudentIds)
    }

    const { data, error: attendanceError } = await query

    if (attendanceError) {
      setAttendanceRecords([])
      return
    }

    setAttendanceRecords((data || []) as AttendanceRecord[])
  }

  const fetchReviews = async () => {
    const { data, error: reviewsError } = await supabase.from('reviews').select(
      `
      score,
      submissions (
        student_id
      )
    `
    )

    if (reviewsError) {
      setReviews([])
      return
    }

    setReviews((data || []) as unknown as ReviewRecord[])
  }

  const fetchPageData = async () => {
    setLoading(true)
    setError('')

    const profile = await fetchCurrentProfile()

    if (!profile) {
      setLoading(false)
      return
    }

    let mentorCohortIds: string[] = []

    if (profile.role === 'mentor') {
      mentorCohortIds = await fetchMentorCohortIds(profile.id)
    }

    await Promise.all([
      fetchStudents(profile, mentorCohortIds),
      fetchAttendance(profile, mentorCohortIds),
      fetchReviews(),
    ])

    setLoading(false)
  }

  useEffect(() => {
    fetchPageData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>()

    students.forEach((student) => {
      const course = student.cohorts?.courses
      if (course?.id) {
        map.set(course.id, `${course.name}${course.code ? ` (${course.code})` : ''}`)
      }
    })

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [students])

  const cohortOptions = useMemo(() => {
    const map = new Map<string, string>()

    students.forEach((student) => {
      if (student.cohorts?.id) {
        map.set(
          student.cohorts.id,
          `${student.cohorts.name}${
            student.cohorts.cohort_code ? ` (${student.cohorts.cohort_code})` : ''
          }`
        )
      }
    })

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [students])

  const getAttendanceRate = (studentId: string) => {
    const records = attendanceRecords.filter((record) => record.student_id === studentId)

    if (records.length === 0) return 100

    const present = records.filter((record) => record.status === 'present').length

    return Math.round((present / records.length) * 100)
  }

  const getAverageGrade = (studentId: string) => {
    const studentReviews = reviews.filter(
      (review) =>
        review.submissions?.student_id === studentId &&
        typeof review.score === 'number'
    )

    if (studentReviews.length === 0) return 0

    const total = studentReviews.reduce((sum, review) => sum + (review.score || 0), 0)

    return Math.round(total / studentReviews.length)
  }

  const enrichedStudents = useMemo<EnrichedStudent[]>(() => {
    return students.map((student) => {
      const attendanceRate = getAttendanceRate(student.id)
      const avgGrade = getAverageGrade(student.id)
      const attendanceOk = attendanceRate >= 75
      const gradeOk = avgGrade >= 60

      return {
        ...student,
        attendanceRate,
        avgGrade,
        eligibility: {
          eligible: attendanceOk && gradeOk,
          attendanceOk,
          gradeOk,
        },
        name: student.profiles?.full_name || 'No name',
        email: student.profiles?.email || 'No email',
        cohortName: student.cohorts?.name || 'No cohort',
        courseName: student.cohorts?.courses?.name || 'No course',
      }
    })
  }, [students, attendanceRecords, reviews])

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return enrichedStudents.filter((student) => {
      const name = student.name.toLowerCase()
      const email = student.email.toLowerCase()
      const phone = student.phone?.toLowerCase() || ''
      const studentCode = student.student_code?.toLowerCase() || ''
      const cohortName = student.cohortName.toLowerCase()
      const cohortCode = student.cohorts?.cohort_code?.toLowerCase() || ''
      const courseName = student.courseName.toLowerCase()
      const courseCode = student.cohorts?.courses?.code?.toLowerCase() || ''

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        studentCode.includes(query) ||
        cohortName.includes(query) ||
        cohortCode.includes(query) ||
        courseName.includes(query) ||
        courseCode.includes(query)

      const matchesCourse =
        courseFilter === 'all' || student.cohorts?.courses?.id === courseFilter

      const matchesCohort = cohortFilter === 'all' || student.cohorts?.id === cohortFilter

      const matchesMode =
        modeFilter === 'all' || student.cohorts?.batch_mode === modeFilter

      const matchesStatus = statusFilter === 'all' || student.status === statusFilter

      return matchesSearch && matchesCourse && matchesCohort && matchesMode && matchesStatus
    })
  }, [enrichedStudents, search, courseFilter, cohortFilter, modeFilter, statusFilter])

  const stats = useMemo(() => {
    const eligible = filteredStudents.filter((student) => student.eligibility.eligible).length
    const belowAttendance = filteredStudents.filter((student) => student.attendanceRate < 75).length

    const averageAttendance = filteredStudents.length
      ? Math.round(
          filteredStudents.reduce((sum, student) => sum + student.attendanceRate, 0) /
            filteredStudents.length
        )
      : 0

    const averageGrade = filteredStudents.length
      ? Math.round(
          filteredStudents.reduce((sum, student) => sum + student.avgGrade, 0) /
            filteredStudents.length
        )
      : 0

    return {
      total: filteredStudents.length,
      eligible,
      belowAttendance,
      averageAttendance,
      averageGrade,
    }
  }, [filteredStudents])

  const canManageStudents = isAdminRole(currentProfile?.role || null)

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#153e90] dark:text-white">
              Students
            </h1>
            <p className={`mt-2 ${mutedTextClass}`}>
              View student performance, attendance, grades, and eligibility from one directory.
            </p>
          </div>

          {canManageStudents && (
            <Button asChild>
              <Link href="/cohorts">
                Add Student from Cohort
                <CustomIcon name="patch" className="ml-2 h-4 w-4" alt="" />
              </Link>
            </Button>
          )}
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-[#153e90] dark:text-white">Filters</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#153e90]/70 dark:text-white/60">
                  Search
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <CustomIcon name="search" className="h-4 w-4 opacity-60" alt="" />
                  </div>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, phone, code, cohort or course"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#153e90]/70 dark:text-white/60">
                  Course
                </label>
                <select
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  className={selectClass}
                >
                  <option value="all" className={optionClass}>
                    All Courses
                  </option>
                  {courseOptions.map((course) => (
                    <option key={course.id} value={course.id} className={optionClass}>
                      {course.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#153e90]/70 dark:text-white/60">
                  Cohort
                </label>
                <select
                  value={cohortFilter}
                  onChange={(event) => setCohortFilter(event.target.value)}
                  className={selectClass}
                >
                  <option value="all" className={optionClass}>
                    All Cohorts
                  </option>
                  {cohortOptions.map((cohort) => (
                    <option key={cohort.id} value={cohort.id} className={optionClass}>
                      {cohort.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#153e90]/70 dark:text-white/60">
                  Mode
                </label>
                <select
                  value={modeFilter}
                  onChange={(event) => setModeFilter(event.target.value)}
                  className={selectClass}
                >
                  <option value="all" className={optionClass}>
                    All Modes
                  </option>
                  <option value="online" className={optionClass}>
                    Online
                  </option>
                  <option value="offline" className={optionClass}>
                    Offline
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#153e90]/70 dark:text-white/60">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={selectClass}
                >
                  <option value="all" className={optionClass}>
                    All Status
                  </option>
                  <option value="active" className={optionClass}>
                    Active
                  </option>
                  <option value="inactive" className={optionClass}>
                    Inactive
                  </option>
                  <option value="completed" className={optionClass}>
                    Completed
                  </option>
                  <option value="pending" className={optionClass}>
                    Pending
                  </option>
                  <option value="suspended" className={optionClass}>
                    Suspended
                  </option>
                  <option value="graduated" className={optionClass}>
                    Graduated
                  </option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                <CustomIcon name="students" className="h-4 w-4" alt="" />
              </div>
              <div>
                <p className={`text-xs ${mutedTextClass}`}>Total Students</p>
                <p className="text-xl font-bold text-[#153e90] dark:text-white">
                  {stats.total}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                <CustomIcon name="eligible" className="h-4 w-4" alt="" />
              </div>
              <div>
                <p className={`text-xs ${mutedTextClass}`}>Eligible Students</p>
                <p className="text-xl font-bold text-[#153e90] dark:text-white">
                  {stats.eligible}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                <CustomIcon name="attendance" className="h-4 w-4" alt="" />
              </div>
              <div>
                <p className={`text-xs ${mutedTextClass}`}>Below 75% Attendance</p>
                <p className="text-xl font-bold text-[#153e90] dark:text-white">
                  {stats.belowAttendance}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                <CustomIcon name="grade" className="h-4 w-4" alt="" />
              </div>
              <div>
                <p className={`text-xs ${mutedTextClass}`}>Avg Attendance / Grade</p>
                <p className="text-xl font-bold text-[#153e90] dark:text-white">
                  {stats.averageAttendance}% / {stats.averageGrade}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#153e90] dark:text-white">
              Student Directory
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className={stateBoxClass}>Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div className={stateBoxClass}>
                {students.length === 0 ? 'No students found.' : 'No students match your filters.'}
              </div>
            ) : (
              <div className="overflow-hidden border border-[#153e90]/25 bg-white/75 dark:border-[#153e90]/35 dark:bg-[#111827]/45">
                <div className="hidden border-b border-[#153e90]/25 bg-[#153e90] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white/70 xl:grid xl:grid-cols-[1.7fr_1.2fr_1.1fr_1fr_1fr_0.9fr_90px] xl:gap-4">
                  <div>Student</div>
                  <div>Course</div>
                  <div>Cohort</div>
                  <div>Attendance</div>
                  <div>Avg Grade</div>
                  <div>Eligibility</div>
                  <div>Action</div>
                </div>

                <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
                  {filteredStudents.map((student) => {
                    const avatarUrl =
                      student.profile_picture_url || student.profiles?.avatar_url || '/avatar.svg'

                    return (
                      <div
                        key={student.id}
                        className="grid gap-4 bg-white/60 px-5 py-4 text-sm text-[#153e90] transition hover:bg-[#153e90]/10 dark:bg-[#111827]/40 dark:text-white dark:hover:bg-[#153e90]/10 xl:grid-cols-[1.7fr_1.2fr_1.1fr_1fr_1fr_0.9fr_90px] xl:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={student.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold">
                                {getInitials(student.name)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-[#153e90] dark:text-white">
                              {student.name}
                            </p>
                            <p className={`break-all text-xs ${mutedTextClass}`}>
                              {student.student_code || 'Student code not added'}
                            </p>
                            <p className={`text-xs ${mutedTextClass}`}>
                              Joined {formatDate(student.joining_date)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p>{student.courseName}</p>
                          <p className={`text-xs ${mutedTextClass}`}>
                            {student.cohorts?.courses?.code || 'No code'}
                          </p>
                        </div>

                        <div>
                          <p>{student.cohortName}</p>
                          <p className={`break-all text-xs ${mutedTextClass}`}>
                            {student.cohorts?.cohort_code || 'No batch ID'}
                          </p>
                          <p className={`text-xs capitalize ${mutedTextClass}`}>
                            {student.cohorts?.batch_mode || 'No mode'} ·{' '}
                            {formatTime(student.cohorts?.batch_start_time)} ·{' '}
                            {student.cohorts?.duration_months
                              ? `${student.cohorts.duration_months} month${
                                  student.cohorts.duration_months > 1 ? 's' : ''
                                }`
                              : 'No duration'}
                          </p>
                        </div>

                        <div>
                          <div>
                            <span className="text-sm font-semibold">
                              {student.attendanceRate}%
                            </span>
                          </div>
                          <p className={`text-xs ${mutedTextClass}`}>Required 75%</p>
                        </div>

                        <div>
                          <span className="text-sm font-semibold">
                            {student.avgGrade > 0 ? `${student.avgGrade}%` : '—'}
                          </span>
                          <p className={`text-xs ${mutedTextClass}`}>Required 60%</p>
                        </div>

                        <div>
                          <span className="inline-flex items-center gap-1 border border-[#153e90]/20 bg-white/70 px-2.5 py-1 text-xs font-medium capitalize text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                            {student.eligibility.eligible ? (
                              <CustomIcon name="check" className="h-3.5 w-3.5" alt="" />
                            ) : (
                              <CustomIcon name="warning" className="h-3.5 w-3.5" alt="" />
                            )}
                            {student.eligibility.eligible ? 'Eligible' : 'Not Eligible'}
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
      </div>
    </AppShell>
  )
}