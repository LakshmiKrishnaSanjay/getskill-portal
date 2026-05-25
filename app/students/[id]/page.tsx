'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'

type CurrentRole = Role | 'superadmin' | 'super admin' | 'placement'

type Profile = {
  id: string
  role: CurrentRole
}

type Student = {
  id: string
  profile_id: string
  student_code: string
  phone: string | null
  status: string
  joining_date: string | null
  profile_picture_url: string | null
  cohort_id: string
  profiles: {
    full_name: string
    email: string
    avatar_url?: string | null
  } | null
  cohorts: {
    name: string
    cohort_code: string | null
  } | null
}

type AttendanceRecord = {
  id: string
  attendance_date: string
  status: string
  notes: string | null
}

type Task = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  created_at: string
}

type Submission = {
  id: string
  task_id: string
  submission_text: string | null
  file_url: string | null
  github_url: string | null
  live_url: string | null
  status: string
  submitted_at: string | null
  created_at: string
  tasks: {
    title: string
  } | null
  reviews: {
    score: number | null
    feedback: string | null
    status: string
    reviewed_at: string | null
  }[]
}

type CustomIconName =
  | 'arrow-left'
  | 'attendance'
  | 'submissions'
  | 'tasks'
  | 'flame'
  | 'github'
  | 'globe'

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

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-500/10 text-green-400 border-green-500/20',
  late: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  absent: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const canViewAllStudents = (role: CurrentRole) => {
  return (
    role === 'admin' ||
    role === 'superadmin' ||
    role === 'super admin' ||
    role === 'placement'
  )
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not added'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not added'

  return date.toLocaleDateString()
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const checkProfileAccess = async (profile: Profile, studentData: Student) => {
    if (canViewAllStudents(profile.role)) {
      return true
    }

    if (profile.role === 'student') {
      return studentData.profile_id === profile.id
    }

    if (profile.role === 'mentor') {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (!mentorData) {
        return false
      }

      const { data: directCohort } = await supabase
        .from('cohorts')
        .select('id')
        .eq('id', studentData.cohort_id)
        .eq('mentor_id', mentorData.id)
        .maybeSingle()

      if (directCohort) {
        return true
      }

      const { data: assignedCohort } = await supabase
        .from('cohort_mentors')
        .select('cohort_id')
        .eq('mentor_id', mentorData.id)
        .eq('cohort_id', studentData.cohort_id)
        .maybeSingle()

      return !!assignedCohort
    }

    return false
  }

  const fetchStudentProfile = async () => {
    setLoading(true)
    setError('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
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

    const profile = profileData as Profile
    setCurrentProfile(profile)

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        student_code,
        phone,
        status,
        joining_date,
        profile_picture_url,
        cohort_id,
        profiles (
          full_name,
          email,
          avatar_url
        ),
        cohorts (
          name,
          cohort_code
        )
      `)
      .eq('id', id)
      .single()

    if (studentError || !studentData) {
      setError('Student not found.')
      setLoading(false)
      return
    }

    const realStudent = studentData as unknown as Student
    const allowed = await checkProfileAccess(profile, realStudent)

    if (!allowed) {
      setHasAccess(false)
      setError('You do not have permission to view this profile.')
      setLoading(false)
      return
    }

    setHasAccess(true)
    setStudent(realStudent)

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('id, attendance_date, status, notes')
      .eq('student_id', id)
      .order('attendance_date', { ascending: false })

    setAttendanceRecords(attendanceData || [])

    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, description, priority, status, due_date, created_at')
      .eq('assigned_to', id)
      .order('created_at', { ascending: false })

    setTasks(taskData || [])

    const { data: submissionData } = await supabase
      .from('submissions')
      .select(`
        id,
        task_id,
        submission_text,
        file_url,
        github_url,
        live_url,
        status,
        submitted_at,
        created_at,
        tasks (
          title
        ),
        reviews (
          score,
          feedback,
          status,
          reviewed_at
        )
      `)
      .eq('student_id', id)
      .order('created_at', { ascending: false })

    setSubmissions((submissionData || []) as unknown as Submission[])

    setLoading(false)
  }

  useEffect(() => {
    fetchStudentProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const attendanceRate = useMemo(() => {
    if (attendanceRecords.length === 0) return 100

    const presentCount = attendanceRecords.filter(
      (record) => record.status === 'present'
    ).length

    return Math.round((presentCount / attendanceRecords.length) * 100)
  }, [attendanceRecords])

  const streak = useMemo(() => {
    let count = 0

    for (const record of attendanceRecords) {
      if (record.status === 'present') {
        count++
      } else {
        break
      }
    }

    return count
  }, [attendanceRecords])

  const sessionsAttended = useMemo(() => {
    return attendanceRecords.filter((record) => record.status === 'present').length
  }, [attendanceRecords])

  const absences = useMemo(() => {
    return attendanceRecords.filter((record) => record.status === 'absent').length
  }, [attendanceRecords])

  const lateCount = useMemo(() => {
    return attendanceRecords.filter((record) => record.status === 'late').length
  }, [attendanceRecords])

  const avgGrade = useMemo(() => {
    const scores = submissions
      .flatMap((submission) => submission.reviews || [])
      .map((review) => review.score)
      .filter((score): score is number => typeof score === 'number')

    if (scores.length === 0) return 0

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }, [submissions])

  const taskCompletion = useMemo(() => {
    if (tasks.length === 0) return 0

    const doneTasks = tasks.filter(
      (task) => task.status === 'completed' || task.status === 'done'
    ).length

    return Math.round((doneTasks / tasks.length) * 100)
  }, [tasks])

  const eligibility = {
    eligible: attendanceRate >= 75 && avgGrade >= 60,
  }

  if (loading) {
    return (
      <AppShell>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading student profile...
        </div>
      </AppShell>
    )
  }

  if (error || !student || !hasAccess) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-muted-foreground">{error || 'Student not found.'}</p>
          <Button asChild variant="outline">
            <Link href="/students" className="inline-flex items-center">
              <CustomIcon name="arrow-left" className="mr-2 h-4 w-4" alt="" />
              Back to Students
            </Link>
          </Button>
        </div>
      </AppShell>
    )
  }

  const fullName = student.profiles?.full_name || 'No name'
  const initials = fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const avatarUrl =
    student.profile_picture_url || student.profiles?.avatar_url || '/avatar.svg'

  return (
    <AppShell>
      <div className="w-full space-y-6 text-[#153e90] dark:text-white">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 text-[#153e90]/70 hover:text-[#153e90] dark:text-white/60 dark:hover:text-white"
          >
            <Link href="/students" className="inline-flex items-center">
              <CustomIcon name="arrow-left" className="mr-2 h-4 w-4" alt="" />
              All Students
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 shrink-0 border border-[#153e90]/20 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl">{initials || 'ST'}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-[#153e90] dark:text-white">
                      {fullName}
                    </h1>

                    <Badge variant="secondary">
                      {student.cohorts?.name || 'No Cohort'}
                    </Badge>

                    <Badge variant="outline">{student.student_code}</Badge>

                    <Badge
                      variant="outline"
                      className={cn(
                        eligibility.eligible
                          ? 'border-green-500/30 text-green-400'
                          : 'border-yellow-500/30 text-yellow-400'
                      )}
                    >
                      {eligibility.eligible ? 'Internship Eligible' : 'Not Eligible'}
                    </Badge>
                  </div>

                  <div className="mt-2 grid gap-1 text-sm text-[#153e90]/70 dark:text-white/60">
                    <p>{student.profiles?.email || 'No email'}</p>
                    <p>Phone: {student.phone || 'No phone'}</p>
                    <p>Joined: {formatDate(student.joining_date)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                <div className="border border-[#153e90]/25 bg-white/70 px-4 py-3 text-center dark:border-[#153e90]/35 dark:bg-[#111827]/45">
                  <p className="text-xs text-[#153e90]/70 dark:text-white/60">Attendance</p>
                  <p
                    className={cn(
                      'mt-0.5 text-xl font-bold',
                      attendanceRate >= 75 ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {attendanceRate}%
                  </p>
                </div>

                <div className="border border-[#153e90]/25 bg-white/70 px-4 py-3 text-center dark:border-[#153e90]/35 dark:bg-[#111827]/45">
                  <p className="text-xs text-[#153e90]/70 dark:text-white/60">Avg Grade</p>
                  <p className="mt-0.5 text-xl font-bold text-[#153e90] dark:text-white">
                    {avgGrade > 0 ? `${avgGrade}%` : '—'}
                  </p>
                </div>

                <div className="border border-[#153e90]/25 bg-white/70 px-4 py-3 text-center dark:border-[#153e90]/35 dark:bg-[#111827]/45">
                  <p className="text-xs text-[#153e90]/70 dark:text-white/60">Tasks Done</p>
                  <p className="mt-0.5 text-xl font-bold text-[#153e90] dark:text-white">
                    {taskCompletion}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="attendance" className="w-full">
<TabsList className="flex flex-wrap gap-3 bg-transparent p-0">
  <TabsTrigger
    value="attendance"
    className="gap-2 border border-transparent bg-white/70 px-4 py-2 text-[#153e90] data-[state=active]:border-[#60a5fa] data-[state=active]:bg-[#60a5fa]/10 dark:bg-[#111827]/70 dark:text-white dark:data-[state=active]:border-green-500 dark:data-[state=active]:bg-green-500/10"
  >
    <CustomIcon name="attendance" className="h-4 w-4" alt="" />
    Attendance
  </TabsTrigger>

  <TabsTrigger
    value="submissions"
    className="gap-2 border border-transparent bg-white/70 px-4 py-2 text-[#153e90] data-[state=active]:border-[#60a5fa] data-[state=active]:bg-[#60a5fa]/10 dark:bg-[#111827]/70 dark:text-white dark:data-[state=active]:border-green-500 dark:data-[state=active]:bg-green-500/10"
  >
    <CustomIcon name="submissions" className="h-4 w-4" alt="" />
    Submissions
  </TabsTrigger>

  <TabsTrigger
    value="tasks"
    className="gap-2 border border-transparent bg-white/70 px-4 py-2 text-[#153e90] data-[state=active]:border-[#60a5fa] data-[state=active]:bg-[#60a5fa]/10 dark:bg-[#111827]/70 dark:text-white dark:data-[state=active]:border-green-500 dark:data-[state=active]:bg-green-500/10"
  >
    <CustomIcon name="tasks" className="h-4 w-4" alt="" />
    Tasks
  </TabsTrigger>
</TabsList>

          <TabsContent value="attendance" className="mt-4 space-y-4">


            <Card>
              <CardHeader>
                <CardTitle>Attendance Progress</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Attendance</span>
                    <span>{attendanceRate}%</span>
                  </div>
                  <Progress value={attendanceRate} />
                  <p className="text-xs text-muted-foreground">
                    Minimum required attendance is 75%. New students start at 100%; absent and late records reduce the percentage.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
              </CardHeader>

              <CardContent>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance records found.</p>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between border border-[#153e90]/20 px-4 py-3 dark:border-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium">{record.attendance_date}</p>
                          {record.notes && (
                            <p className="text-xs text-muted-foreground">{record.notes}</p>
                          )}
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            STATUS_STYLES[record.status] || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4 space-y-4">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No submissions found.
                </CardContent>
              </Card>
            ) : (
              submissions.map((submission) => {
                const latestReview = submission.reviews?.[0]

                return (
                  <Card key={submission.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">
                            {submission.tasks?.title || 'Untitled Task'}
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Status: {submission.status}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Submitted: {submission.submitted_at || submission.created_at}
                          </p>

                          {submission.submission_text && (
                            <p className="mt-3 text-sm">{submission.submission_text}</p>
                          )}

                          <div className="mt-3 flex gap-3">
                            {submission.github_url && (
                              <a
                                href={submission.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                              >
                                <CustomIcon name="github" className="h-4 w-4" alt="" />
                                GitHub
                              </a>
                            )}

                            {submission.live_url && (
                              <a
                                href={submission.live_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                              >
                                <CustomIcon name="globe" className="h-4 w-4" alt="" />
                                Live
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant="secondary">{submission.status}</Badge>

                          {latestReview?.score !== null && latestReview?.score !== undefined && (
                            <p className="mt-2 text-2xl font-bold">{latestReview.score}%</p>
                          )}
                        </div>
                      </div>

                      {latestReview?.feedback && (
                        <div className="mt-4 border border-[#153e90]/20 bg-[#153e90]/5 p-3 dark:border-white/10 dark:bg-white/5">
                          <p className="mb-1 text-xs text-muted-foreground">Mentor Feedback</p>
                          <p className="text-sm">{latestReview.feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No tasks assigned.
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{task.title}</h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {task.description || 'No description'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary">{task.priority}</Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              task.status === 'completed' || task.status === 'done'
                                ? 'border-green-500/30 text-green-400'
                                : 'border-yellow-500/30 text-yellow-400'
                            )}
                          >
                            {task.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="text-sm font-medium">{task.due_date || 'No due date'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
