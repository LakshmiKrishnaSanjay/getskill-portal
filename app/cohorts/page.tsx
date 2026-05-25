'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Layers,
  Plus,
  Search,
  X,
  Eye,
  Pencil,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Course = {
  id: string
  name: string
  code: string
}

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
    profiles: {
      full_name: string
      email: string
    } | null
  } | null
  enrolled_count?: number
}

type CurrentProfile = {
  id: string
  role: string
}

type BatchMode = 'online' | 'offline'


const calculateEndDateFromDuration = (startDateValue: string, durationMonthValue: string) => {
  if (!startDateValue || !durationMonthValue) return ''

  const monthCount = Number(durationMonthValue)

  if (!monthCount || monthCount < 1) return ''

  const date = new Date(`${startDateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) return ''

  date.setMonth(date.getMonth() + monthCount)
  date.setDate(date.getDate() - 1)

  return date.toISOString().split('T')[0]
}

const formatTimeForBatchCode = (time: string) => {
  if (!time) return 'TIME'

  const [hourValue, minuteValue] = time.split(':')
  const hour = Number(hourValue)
  const minute = Number(minuteValue || '0')

  if (Number.isNaN(hour)) return 'TIME'

  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const minuteText = minute > 0 ? String(minute).padStart(2, '0') : ''

  return `${hour12}${minuteText}${period}`
}

const formatMonthYearForBatchCode = (dateValue: string) => {
  if (!dateValue) return 'DATE'

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return 'DATE'

  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = String(date.getFullYear()).slice(-2)

  return `${month}${year}`
}

const getModeCode = (mode: string) => {
  return mode === 'online' ? 'ON' : 'OFF'
}

const cleanCodePart = (value: string | null | undefined, fallback: string) => {
  const cleaned = String(value || fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return cleaned || fallback
}

const getBatchNumber = (
  cohorts: Cohort[],
  courseCode: string,
  mode: string,
  batchStartTime: string,
  startDate: string
) => {
  const modeCode = getModeCode(mode)
  const timeCode = formatTimeForBatchCode(batchStartTime)
  const monthYearCode = formatMonthYearForBatchCode(startDate)

  const prefix = `PP-${courseCode}-${modeCode}-${timeCode}-${monthYearCode}`

  const matchingCohorts = cohorts.filter((cohort) => {
    return cohort.cohort_code?.startsWith(prefix)
  })

  return String(matchingCohorts.length + 1).padStart(2, '0')
}

export default function CohortsPage() {
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(
    null
  )

  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])

  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterMode, setFilterMode] = useState('all')
  const [filterMentor, setFilterMentor] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStartTime, setFilterStartTime] = useState('all')
  const [filterDuration, setFilterDuration] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [mentorId, setMentorId] = useState('')
  const [durationMonths, setDurationMonths] = useState('1')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [batchMode, setBatchMode] = useState<BatchMode>('offline')
  const [batchStartTime, setBatchStartTime] = useState('07:00')
  const [batchEndTime, setBatchEndTime] = useState('09:00')
  const [maxSeats, setMaxSeats] = useState('20')
  const [status, setStatus] = useState('active')

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
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

  const selectedCourse = useMemo(() => {
    return courses.find((course) => course.id === courseId) || null
  }, [courses, courseId])

  const selectedMentor = useMemo(() => {
    return mentors.find((mentor) => mentor.id === mentorId) || null
  }, [mentors, mentorId])

  const generateCohortCode = (
    selectedCourseCode?: string,
    selectedMode?: string,
    selectedTime?: string,
    selectedStartDate?: string
  ) => {
    const courseCode = cleanCodePart(
      selectedCourseCode || selectedCourse?.code,
      'COURSE'
    )

    const mode = selectedMode || batchMode
    const time = selectedTime || batchStartTime
    const date = selectedStartDate || startDate

    const modeCode = getModeCode(mode)
    const timeCode = formatTimeForBatchCode(time)
    const monthYearCode = formatMonthYearForBatchCode(date)

    const batchNumber = getBatchNumber(
      cohorts,
      courseCode,
      mode,
      time,
      date
    )

    return `PP-${courseCode}-${modeCode}-${timeCode}-${monthYearCode}-${batchNumber}`
  }

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

    if (
      !['admin', 'superadmin', 'super admin', 'mentor'].includes(
        profileData.role
      )
    ) {
      setError('You do not have permission to view cohorts.')
      return null
    }

    const profile = profileData as CurrentProfile

    setCurrentProfile(profile)

    return profile
  }

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setCourses(data || [])
  }

  const fetchMentors = async () => {
    const { data, error } = await supabase
      .from('mentors')
      .select(`
        id,
        mentor_code,
        manual_mentor_code,
        specialization,
        profiles!mentors_profile_id_fkey (
          full_name,
          email
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
      .select(`
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
        courses!cohorts_course_id_fkey (
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
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    const cohortData = (data || []) as Cohort[]
    const cohortIds = cohortData.map((cohort) => cohort.id)

    if (cohortIds.length === 0) {
      setCohorts([])
      return
    }

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, cohort_id')
      .in('cohort_id', cohortIds)

    if (studentError) {
      setCohorts(cohortData)
      return
    }

    const countMap = new Map<string, number>()

    ;(studentData || []).forEach((student) => {
      const cohortId = student.cohort_id

      if (!cohortId) return

      countMap.set(cohortId, (countMap.get(cohortId) || 0) + 1)
    })

    const cohortsWithCounts = cohortData.map((cohort) => ({
      ...cohort,
      enrolled_count: countMap.get(cohort.id) || 0,
    }))

    setCohorts(cohortsWithCounts)
  }

  useEffect(() => {
    const loadPage = async () => {
      setPageLoading(true)
      setError('')

      const profile = await fetchCurrentProfile()

      if (!profile) {
        setPageLoading(false)
        return
      }

      await Promise.all([fetchCourses(), fetchMentors(), fetchCohorts()])

      setPageLoading(false)
    }

    loadPage()
  }, [])

  useEffect(() => {
    if (!selectedCourse) return

    if (!name.trim()) {
      setName(`${selectedCourse.name} Batch`)
    }
  }, [courseId, selectedCourse, name])

  useEffect(() => {
    const calculatedEndDate = calculateEndDateFromDuration(
      startDate,
      durationMonths
    )

    setEndDate(calculatedEndDate)
  }, [startDate, durationMonths])

  const getCohortYear = (dateValue: string | null) => {
    if (!dateValue) return ''

    const date = new Date(`${dateValue}T00:00:00`)

    if (Number.isNaN(date.getTime())) return ''

    return String(date.getFullYear())
  }

  const getCohortMonth = (dateValue: string | null) => {
    if (!dateValue) return ''

    const date = new Date(`${dateValue}T00:00:00`)

    if (Number.isNaN(date.getTime())) return ''

    return String(date.getMonth() + 1)
  }

  const formatTimeLabel = (timeValue: string | null) => {
    if (!timeValue) return 'No start time'

    const [hourValue, minuteValue] = timeValue.split(':')
    const hour = Number(hourValue)
    const minute = Number(minuteValue || '0')

    if (Number.isNaN(hour)) return timeValue

    const period = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12

    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
  }

  const filteredCohorts = useMemo(() => {
    return cohorts.filter((cohort) => {
      const keyword = search.toLowerCase().trim()
      const enrolledCount = cohort.enrolled_count || 0
      const maxSeatCount = cohort.max_seats || 0
      const isFull = maxSeatCount > 0 && enrolledCount >= maxSeatCount
      const cohortStatus = isFull ? 'completed' : cohort.status
      const cohortYear = getCohortYear(cohort.start_date)
      const cohortMonth = getCohortMonth(cohort.start_date)
      const durationValue = cohort.duration_months ? String(cohort.duration_months) : ''

      const matchesSearch =
        !keyword ||
        cohort.name.toLowerCase().includes(keyword) ||
        cohort.cohort_code?.toLowerCase().includes(keyword) ||
        cohort.description?.toLowerCase().includes(keyword) ||
        cohort.status.toLowerCase().includes(keyword) ||
        cohort.courses?.name?.toLowerCase().includes(keyword) ||
        cohort.courses?.code?.toLowerCase().includes(keyword) ||
        cohort.mentors?.profiles?.full_name?.toLowerCase().includes(keyword) ||
        cohort.mentors?.manual_mentor_code?.toLowerCase().includes(keyword) ||
        cohort.mentors?.mentor_code?.toLowerCase().includes(keyword)

      return (
        matchesSearch &&
        (filterCourse === 'all' || cohort.course_id === filterCourse) &&
        (filterMode === 'all' || cohort.batch_mode === filterMode) &&
        (filterMentor === 'all' || cohort.mentor_id === filterMentor) &&
        (filterYear === 'all' || cohortYear === filterYear) &&
        (filterMonth === 'all' || cohortMonth === filterMonth) &&
        (filterStatus === 'all' || cohortStatus === filterStatus) &&
        (filterStartTime === 'all' || cohort.batch_start_time === filterStartTime) &&
        (filterDuration === 'all' || durationValue === filterDuration)
      )
    })
  }, [
    cohorts,
    search,
    filterCourse,
    filterMode,
    filterMentor,
    filterYear,
    filterMonth,
    filterStatus,
    filterStartTime,
    filterDuration,
  ])

  const cohortYearOptions = useMemo(() => {
    return Array.from(
      new Set(cohorts.map((cohort) => getCohortYear(cohort.start_date)).filter(Boolean))
    ).sort((a, b) => Number(b) - Number(a))
  }, [cohorts])

  const cohortMonthOptions = useMemo(() => {
    return Array.from(
      new Set(cohorts.map((cohort) => getCohortMonth(cohort.start_date)).filter(Boolean))
    ).sort((a, b) => Number(a) - Number(b))
  }, [cohorts])

  const cohortStartTimeOptions = useMemo(() => {
    return Array.from(
      new Set(cohorts.map((cohort) => cohort.batch_start_time).filter(Boolean) as string[])
    ).sort()
  }, [cohorts])

  const cohortDurationOptions = useMemo(() => {
    return Array.from(
      new Set(
        cohorts
          .map((cohort) => (cohort.duration_months ? String(cohort.duration_months) : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => Number(a) - Number(b))
  }, [cohorts])

  const totalSeats = useMemo(() => {
    return filteredCohorts.reduce((sum, cohort) => sum + Number(cohort.max_seats || 0), 0)
  }, [filteredCohorts])

  const totalEnrolled = useMemo(() => {
    return filteredCohorts.reduce(
      (sum, cohort) => sum + Number(cohort.enrolled_count || 0),
      0
    )
  }, [filteredCohorts])

  const activeCohortsCount = useMemo(() => {
    return filteredCohorts.filter((cohort) => cohort.status === 'active').length
  }, [filteredCohorts])

  const inactiveCohortsCount = useMemo(() => {
    return filteredCohorts.filter((cohort) => cohort.status === 'inactive').length
  }, [filteredCohorts])

  const completedCohortsCount = useMemo(() => {
    return filteredCohorts.filter((cohort) => {
      const enrolledCount = cohort.enrolled_count || 0
      const maxSeatCount = cohort.max_seats || 0

      return cohort.status === 'completed' || (maxSeatCount > 0 && enrolledCount >= maxSeatCount)
    }).length
  }, [filteredCohorts])

  const resetFilters = () => {
    setSearch('')
    setFilterCourse('all')
    setFilterMode('all')
    setFilterMentor('all')
    setFilterYear('all')
    setFilterMonth('all')
    setFilterStatus('all')
    setFilterStartTime('all')
    setFilterDuration('all')
  }

  const resetForm = () => {
    const firstCourse = courses[0]
    const firstMentor = mentors[0]

    setName(firstCourse ? `${firstCourse.name} Batch` : '')
    setCourseId(firstCourse?.id || '')
    setMentorId(firstMentor?.id || '')
    setDescription('')
    setDurationMonths('1')
    setStartDate('')
    setEndDate('')
    setBatchMode('offline')
    setBatchStartTime('07:00')
    setBatchEndTime('09:00')
    setMaxSeats('20')
    setStatus('active')
  }

  const openAddModal = () => {
    resetForm()
    setMessage('')
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmitCohort = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (!currentProfile) {
      setError('User profile not found.')
      setLoading(false)
      return
    }

    if (!courseId) {
      setError('Please select a course.')
      setLoading(false)
      return
    }

    if (!mentorId) {
      setError('Please select a teacher or mentor.')
      setLoading(false)
      return
    }

    if (!durationMonths || Number(durationMonths) < 1) {
      setError('Please select batch duration.')
      setLoading(false)
      return
    }

    if (!startDate) {
      setError('Please select batch start date.')
      setLoading(false)
      return
    }

    if (!endDate) {
      setError('Please select batch end date.')
      setLoading(false)
      return
    }

    if (!batchStartTime) {
      setError('Please select batch start time.')
      setLoading(false)
      return
    }

    if (!batchEndTime) {
      setError('Please select batch end time.')
      setLoading(false)
      return
    }

    const seatCount = Number(maxSeats)

    if (!seatCount || seatCount < 1) {
      setError('Maximum seats should be at least 1.')
      setLoading(false)
      return
    }

    const course = courses.find((item) => item.id === courseId)

    if (!course) {
      setError('Selected course not found.')
      setLoading(false)
      return
    }

    const mentor = mentors.find((item) => item.id === mentorId)

    if (!mentor) {
      setError('Selected teacher or mentor not found.')
      setLoading(false)
      return
    }

    const finalCode = generateCohortCode(
      course.code,
      batchMode,
      batchStartTime,
      startDate
    )

    const payload = {
      name,
      cohort_code: finalCode,
      description: description || null,
      duration_months: Number(durationMonths),
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      course_id: courseId,
      mentor_id: mentorId,
      batch_mode: batchMode,
      batch_start_time: batchStartTime,
      batch_end_time: batchEndTime,
      max_seats: seatCount,
      created_by: currentProfile.id,
    }

    const { error: insertError } = await supabase.from('cohorts').insert(payload)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setMessage(`Cohort created successfully. Batch ID: ${finalCode}`)
    setLoading(false)
    setIsModalOpen(false)
    resetForm()

    await fetchCohorts()
  }

  const canManageCohorts =
    currentProfile?.role === 'admin' ||
    currentProfile?.role === 'superadmin' ||
    currentProfile?.role === 'super admin'

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#153e90] dark:text-white">
              Cohorts
            </h1>
            <p className={mutedTextClass}>
              Create and manage student batches.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#153e90]/60 dark:text-white/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-[#153e90]/25 bg-white px-4 py-2 pl-9 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 sm:w-72"
                placeholder="Search cohorts..."
              />
            </div>

            {canManageCohorts && (
              <Button onClick={openAddModal} disabled={pageLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Cohort
              </Button>
            )}
          </div>
        </div>

        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p className="border border-[#54e346]/40 bg-[#54e346]/10 px-3 py-2 text-sm text-[#1c7c18] dark:text-[#54e346]">
            {message}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-[#153e90] dark:text-white">
              Filter Cohorts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  All Courses
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id} className={optionClass}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>

              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  Online / Offline
                </option>
                <option value="online" className={optionClass}>
                  Online
                </option>
                <option value="offline" className={optionClass}>
                  Offline
                </option>
              </select>

              <select
                value={filterMentor}
                onChange={(e) => setFilterMentor(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  All Mentors
                </option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id} className={optionClass}>
                    {mentor.profiles?.full_name || 'No name'}
                    {mentor.manual_mentor_code ? ` (${mentor.manual_mentor_code})` : ''}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  All Years
                </option>
                {cohortYearOptions.map((year) => (
                  <option key={year} value={year} className={optionClass}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  All Months
                </option>
                {cohortMonthOptions.map((month) => (
                  <option key={month} value={month} className={optionClass}>
                    {new Date(2026, Number(month) - 1, 1).toLocaleString('en-US', {
                      month: 'long',
                    })}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={inputClass}
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
                  Completed / Full
                </option>
              </select>

              <select
                value={filterStartTime}
                onChange={(e) => setFilterStartTime(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  All Start Times
                </option>
                {cohortStartTimeOptions.map((time) => (
                  <option key={time} value={time} className={optionClass}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>

              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className={inputClass}
              >
                <option value="all" className={optionClass}>
                  All Durations
                </option>
                {cohortDurationOptions.map((duration) => (
                  <option key={duration} value={duration} className={optionClass}>
                    {duration} {duration === '1' ? 'Month' : 'Months'}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className={`text-xs font-medium uppercase tracking-wide ${mutedTextClass}`}>
                Total Cohorts
              </p>
              <p className="mt-2 text-2xl font-bold text-[#153e90] dark:text-white">
                {filteredCohorts.length}
              </p>
              <p className={`text-xs ${mutedTextClass}`}>Filtered batches</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className={`text-xs font-medium uppercase tracking-wide ${mutedTextClass}`}>
                Active Cohorts
              </p>
              <p className="mt-2 text-2xl font-bold text-[#153e90] dark:text-white">
                {activeCohortsCount}
              </p>
              <p className={`text-xs ${mutedTextClass}`}>Currently enrolling</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className={`text-xs font-medium uppercase tracking-wide ${mutedTextClass}`}>
                Inactive Cohorts
              </p>
              <p className="mt-2 text-2xl font-bold text-[#153e90] dark:text-white">
                {inactiveCohortsCount}
              </p>
              <p className={`text-xs ${mutedTextClass}`}>Not currently active</p>
            </CardContent>
          </Card>

        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#153e90] dark:text-white">
              
              All Cohorts
            </CardTitle>
          </CardHeader>

          <CardContent>
            {pageLoading ? (
              <div className={stateBoxClass}>Loading cohorts...</div>
            ) : filteredCohorts.length === 0 ? (
              <div className={stateBoxClass}>No cohorts found.</div>
            ) : (
              <div className="space-y-3">
                {filteredCohorts.map((cohort) => {
                  const enrolledCount = cohort.enrolled_count || 0
                  const maxSeatCount = cohort.max_seats || 0
                  const isFull =
                    maxSeatCount > 0 && enrolledCount >= maxSeatCount

                  return (
                    <div
                      key={cohort.id}
                      className="border border-[#153e90]/25 bg-white/70 p-4 text-[#153e90] shadow-[0_0_24px_rgba(21,62,144,0.06)] transition hover:bg-[#153e90]/10 dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white dark:hover:bg-[#153e90]/10"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-[#153e90] dark:text-white">
                              {cohort.name}
                            </h3>

                            <span className="border border-[#153e90]/25 bg-white/70 px-3 py-1 text-xs font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                              {cohort.cohort_code || 'No code'}
                            </span>

                            <span
                              className={
                                isFull
                                  ? 'border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300'
                                  : 'border border-[#54e346]/40 bg-[#54e346]/10 px-3 py-1 text-xs font-medium text-[#1c7c18] dark:text-[#54e346]'
                              }
                            >
                              {isFull ? 'Full' : cohort.status}
                            </span>
                          </div>

                          <p className={`mt-2 text-sm ${mutedTextClass}`}>
                            {cohort.description || 'No description'}
                          </p>

                          <div className="mt-3 grid gap-2 text-xs text-[#153e90]/75 dark:text-white/60 sm:grid-cols-2 lg:grid-cols-3">
                            <p>
                              Course:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.courses
                                  ? `${cohort.courses.name} (${cohort.courses.code})`
                                  : 'No course'}
                              </span>
                            </p>

                            <p>
                              Teacher:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.mentors?.profiles?.full_name ||
                                  'No teacher'}
                              </span>
                            </p>

                            <p>
                              Mentor Code:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.mentors?.manual_mentor_code || 'No mentor code'}
                              </span>
                            </p>

                            <p>
                              Mode:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.batch_mode === 'online'
                                  ? 'Online'
                                  : 'Offline'}
                              </span>
                            </p>

                            <p>
                              Time:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.batch_start_time || 'No start time'} to{' '}
                                {cohort.batch_end_time || 'No end time'}
                              </span>
                            </p>

                            <p>
                              Duration:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.duration_months
                                  ? `${cohort.duration_months} ${cohort.duration_months === 1 ? 'month' : 'months'}`
                                  : 'No duration'}
                              </span>
                            </p>

                            <p>
                              Dates:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {cohort.start_date || 'No start date'} to{' '}
                                {cohort.end_date || 'No end date'}
                              </span>
                            </p>

                            <p>
                              Seats:{' '}
                              <span className="font-medium text-[#153e90] dark:text-white">
                                {enrolledCount}/{maxSeatCount || 'No limit'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/cohorts/${cohort.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View More
                            </Link>
                          </Button>

                          {canManageCohorts && (
                            <Button asChild size="sm">
                              <Link href={`/cohorts/${cohort.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[#153e90]/25 bg-white p-6 text-[#153e90] shadow-[0_0_80px_rgba(21,62,144,0.18)] backdrop-blur-xl dark:border-[#153e90]/35 dark:bg-[#111827] dark:text-white dark:shadow-[0_0_80px_rgba(21,62,144,0.22)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#153e90] dark:text-white">
                  Add New Cohort
                </h2>
                <p className={`text-sm ${mutedTextClass}`}>
                  Select course, teacher, dates, mode, time, and maximum seats.
                  Batch ID will be generated automatically when saved.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="border border-[#153e90]/25 p-2 text-[#153e90]/70 transition hover:bg-[#153e90]/10 hover:text-[#153e90] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCohort} className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Course</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="" className={optionClass}>
                      Select course
                    </option>
                    {courses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                        className={optionClass}
                      >
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Teacher / Mentor</label>
                  <select
                    value={mentorId}
                    onChange={(e) => setMentorId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="" className={optionClass}>
                      Select teacher
                    </option>
                    {mentors.map((mentor) => (
                      <option
                        key={mentor.id}
                        value={mentor.id}
                        className={optionClass}
                      >
                        {mentor.profiles?.full_name || 'No name'}
                        {mentor.manual_mentor_code
                          ? ` (${mentor.manual_mentor_code})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Cohort Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Example: Digital Marketing Batch"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} min-h-24 resize-y`}
                  placeholder="Short description about this batch"
                  rows={3}
                />
              </div>

              <div>
                <label className={labelClass}>Batch Duration</label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="1" className={optionClass}>
                    1 Month
                  </option>
                  <option value="2" className={optionClass}>
                    2 Months
                  </option>
                  <option value="3" className={optionClass}>
                    3 Months
                  </option>
                  <option value="4" className={optionClass}>
                    4 Months
                  </option>
                  <option value="5" className={optionClass}>
                    5 Months
                  </option>
                  <option value="6" className={optionClass}>
                    6 Months
                  </option>
                  <option value="12" className={optionClass}>
                    12 Months
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Batch Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Batch End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <p className={`mt-2 text-xs ${mutedTextClass}`}>
                    Auto-filled from duration. You can manually change it if needed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Online / Offline Mode</label>
                  <select
                    value={batchMode}
                    onChange={(e) => setBatchMode(e.target.value as BatchMode)}
                    className={inputClass}
                    required
                  >
                    <option value="offline" className={optionClass}>
                      Offline
                    </option>
                    <option value="online" className={optionClass}>
                      Online
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Maximum Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={maxSeats}
                    onChange={(e) => setMaxSeats(e.target.value)}
                    className={inputClass}
                    placeholder="Example: 20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Batch Start Time</label>
                  <input
                    type="time"
                    value={batchStartTime}
                    onChange={(e) => setBatchStartTime(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Batch End Time</label>
                  <input
                    type="time"
                    value={batchEndTime}
                    onChange={(e) => setBatchEndTime(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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

              {error && (
                <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
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