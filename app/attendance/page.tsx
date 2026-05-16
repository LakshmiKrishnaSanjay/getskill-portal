'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Search,
  User,
} from 'lucide-react'

type Profile = {
  id: string
  role: Role
}

type Cohort = {
  id: string
  name: string
  cohort_code: string | null
}

type Student = {
  id: string
  profile_id: string
  cohort_id: string
  student_code: string
  status: string
  profile_picture_url: string | null
  profiles: {
    full_name: string
    email: string
  } | null
  cohorts: {
    name: string
    cohort_code: string | null
  } | null
}

type AttendanceRecord = {
  id: string
  student_id: string
  cohort_id: string
  attendance_date: string
  status: 'present' | 'late' | 'absent'
  notes: string | null
}

type StudentAttendanceSummary = Student & {
  attendanceRate: number
  presentCount: number
  lateCount: number
  absentCount: number
  totalRecords: number
  eligible: boolean
  name: string
  email: string
  cohortName: string
}

export default function AttendancePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])

  const [selectedCohortId, setSelectedCohortId] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setError('User not logged in.')
      setLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profileData) {
      setError('Profile not found.')
      setLoading(false)
      return
    }

    const currentProfile = profileData as Profile
    setProfile(currentProfile)

    let allowedCohortIds: string[] = []
    let studentIdsForStudentRole: string[] = []

    if (currentProfile.role === 'admin') {
      const { data: cohortData, error: cohortError } = await supabase
        .from('cohorts')
        .select('id, name, cohort_code')
        .order('created_at', { ascending: false })

      if (cohortError) {
        setError(cohortError.message)
        setLoading(false)
        return
      }

      const realCohorts = (cohortData || []) as Cohort[]
      setCohorts(realCohorts)
      allowedCohortIds = realCohorts.map((cohort) => cohort.id)
    }

    if (currentProfile.role === 'mentor') {
      const { data: mentorData, error: mentorError } = await supabase
        .from('mentors')
        .select('id')
        .eq('profile_id', currentProfile.id)
        .single()

      if (mentorError || !mentorData) {
        setError('Mentor record not found.')
        setLoading(false)
        return
      }

      const { data: assignedCohorts, error: assignedError } = await supabase
        .from('cohort_mentors')
        .select(`
          cohorts (
            id,
            name,
            cohort_code
          )
        `)
        .eq('mentor_id', mentorData.id)

      if (assignedError) {
        setError(assignedError.message)
        setLoading(false)
        return
      }

      const realCohorts =
        assignedCohorts?.map((item: any) => item.cohorts).filter(Boolean) || []

      setCohorts(realCohorts)
      allowedCohortIds = realCohorts.map((cohort: Cohort) => cohort.id)
    }

    if (currentProfile.role === 'student') {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          profile_id,
          cohort_id,
          student_code,
          status,
          profile_picture_url,
          profiles (
            full_name,
            email
          ),
          cohorts (
            name,
            cohort_code
          )
        `)
        .eq('profile_id', currentProfile.id)
        .single()

      if (studentError || !studentData) {
        setError('Student record not found.')
        setLoading(false)
        return
      }

      const currentStudent = studentData as Student
      setStudents([currentStudent])
      setCohorts([
        {
          id: currentStudent.cohort_id,
          name: currentStudent.cohorts?.name || 'My Cohort',
          cohort_code: currentStudent.cohorts?.cohort_code || null,
        },
      ])

      allowedCohortIds = [currentStudent.cohort_id]
      studentIdsForStudentRole = [currentStudent.id]
    }

    if (allowedCohortIds.length === 0) {
      setStudents([])
      setAttendance([])
      setLoading(false)
      return
    }

    if (currentProfile.role !== 'student') {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          profile_id,
          cohort_id,
          student_code,
          status,
          profile_picture_url,
          profiles (
            full_name,
            email
          ),
          cohorts (
            name,
            cohort_code
          )
        `)
        .in('cohort_id', allowedCohortIds)
        .order('created_at', { ascending: false })

      if (studentError) {
        setError(studentError.message)
        setLoading(false)
        return
      }

      setStudents((studentData || []) as Student[])
    }

    let attendanceQuery = supabase
      .from('attendance')
      .select('id, student_id, cohort_id, attendance_date, status, notes')
      .in('cohort_id', allowedCohortIds)
      .order('attendance_date', { ascending: false })

    if (currentProfile.role === 'student') {
      attendanceQuery = attendanceQuery.in('student_id', studentIdsForStudentRole)
    }

    const { data: attendanceData, error: attendanceError } = await attendanceQuery

    if (attendanceError) {
      setError(attendanceError.message)
      setLoading(false)
      return
    }

    setAttendance((attendanceData || []) as AttendanceRecord[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const summary = useMemo<StudentAttendanceSummary[]>(() => {
    return students.map((student) => {
      const records = attendance.filter(
        (record) => record.student_id === student.id
      )

      const presentCount = records.filter(
        (record) => record.status === 'present'
      ).length

      const lateCount = records.filter(
        (record) => record.status === 'late'
      ).length

      const absentCount = records.filter(
        (record) => record.status === 'absent'
      ).length

      const attended = presentCount + lateCount
      const attendanceRate =
        records.length > 0 ? Math.round((attended / records.length) * 100) : 0

      return {
        ...student,
        attendanceRate,
        presentCount,
        lateCount,
        absentCount,
        totalRecords: records.length,
        eligible: attendanceRate >= 75,
        name: student.profiles?.full_name || 'No name',
        email: student.profiles?.email || 'No email',
        cohortName: student.cohorts?.name || 'No cohort',
      }
    })
  }, [students, attendance])

  const filteredStudents = useMemo(() => {
    const keyword = search.toLowerCase()

    return summary.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(keyword) ||
        student.email.toLowerCase().includes(keyword) ||
        student.student_code.toLowerCase().includes(keyword) ||
        student.cohortName.toLowerCase().includes(keyword)

      const matchesCohort =
        selectedCohortId === 'all' || student.cohort_id === selectedCohortId

      return matchesSearch && matchesCohort
    })
  }, [summary, search, selectedCohortId])

  const totalStudents = filteredStudents.length
  const eligibleStudents = filteredStudents.filter(
    (student) => student.eligible
  ).length
  const belowAttendance = filteredStudents.filter(
    (student) => student.attendanceRate < 75
  ).length

  if (loading) {
    return (
      <AppShell>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading attendance details...
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            {profile?.role === 'student'
              ? 'View your attendance percentage, eligibility, and daily records.'
              : 'View cohort-wise student attendance percentage and eligibility.'}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search student, code, cohort..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {profile?.role !== 'student' && (
            <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {profile?.role === 'student' ? 'My Record' : 'Students'}
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalStudents}</p>
          </div>

          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Eligible</p>
            <p className="mt-1 text-2xl font-semibold text-green-500">
              {eligibleStudents}
            </p>
          </div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Below 75%</p>
            <p className="mt-1 text-2xl font-semibold text-yellow-500">
              {belowAttendance}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="col-span-4">Student</span>
            <span className="col-span-2">Cohort</span>
            <span className="col-span-2">Attendance</span>
            <span className="col-span-1">Present</span>
            <span className="col-span-1">Late</span>
            <span className="col-span-1">Absent</span>
            <span className="col-span-1" />
          </div>

          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No attendance records found.
              </CardContent>
            </Card>
          ) : (
            filteredStudents.map((student) => {
              const initials = student.name
                .split(' ')
                .map((item) => item[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <Link key={student.id} href={`/attendance/${student.id}`}>
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
                        <p className="truncate text-sm font-medium">
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {student.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
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
                        {student.attendanceRate >= 75 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}

                        <span
                          className={cn(
                            'text-sm font-medium',
                            student.attendanceRate >= 75
                              ? 'text-green-500'
                              : 'text-yellow-500'
                          )}
                        >
                          {student.attendanceRate}%
                        </span>
                      </div>
                    </div>

                    <div className="col-span-1 text-sm">
                      {student.presentCount}
                    </div>

                    <div className="col-span-1 text-sm">
                      {student.lateCount}
                    </div>

                    <div className="col-span-1 text-sm">
                      {student.absentCount}
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </AppShell>
  )
}