'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  ListTodo,
  Award,
  Github,
  Globe,
} from 'lucide-react'

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

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-500/10 text-green-400 border-green-500/20',
  late: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  absent: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { currentRole } = useApp()

  const [student, setStudent] = useState<Student | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStudentProfile = async () => {
    setLoading(true)
    setError('')

    const { data: studentData, error: studentError } = await supabase
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

    setStudent(studentData as Student)

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

    setSubmissions((submissionData || []) as Submission[])

    setLoading(false)
  }

  useEffect(() => {
    fetchStudentProfile()
  }, [id])

  const attendanceRate = useMemo(() => {
    if (attendanceRecords.length === 0) return 0

    const attended = attendanceRecords.filter(
      (record) => record.status === 'present' || record.status === 'late'
    ).length

    return Math.round((attended / attendanceRecords.length) * 100)
  }, [attendanceRecords])

  const streak = useMemo(() => {
    let count = 0

    for (const record of attendanceRecords) {
      if (record.status === 'present' || record.status === 'late') {
        count++
      } else {
        break
      }
    }

    return count
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

    const doneTasks = tasks.filter((task) => task.status === 'done').length

    return Math.round((doneTasks / tasks.length) * 100)
  }, [tasks])

  const eligibility = {
    eligible: attendanceRate >= 75 && avgGrade >= 60,
  }

  if (currentRole === 'student') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">
            You do not have permission to view this profile.
          </p>
        </div>
      </AppShell>
    )
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

  if (error || !student) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-muted-foreground">{error || 'Student not found.'}</p>
          <Button asChild variant="outline">
            <Link href="/students">
              <ArrowLeft className="mr-2 h-4 w-4" />
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

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link href="/students">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Students
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={student.profile_picture_url || ''} />
            <AvatarFallback className="text-2xl">
              {initials || 'ST'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{fullName}</h1>

              <Badge variant="secondary">
                {student.cohorts?.name || 'No Cohort'}
              </Badge>

              <Badge variant="outline">
                {student.student_code}
              </Badge>

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

            <p className="text-muted-foreground text-sm mt-1">
              {student.profiles?.email || 'No email'}
            </p>

            <p className="text-sm text-muted-foreground mt-1">
              Phone: {student.phone || 'No phone'}
            </p>

            <p className="text-sm text-muted-foreground mt-1">
              Joined: {student.joining_date || 'No joining date'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Attendance</p>
              <p
                className={cn(
                  'text-xl font-bold mt-0.5',
                  attendanceRate >= 75 ? 'text-green-400' : 'text-red-400'
                )}
              >
                {attendanceRate}%
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Avg Grade</p>
              <p className="text-xl font-bold mt-0.5">
                {avgGrade > 0 ? `${avgGrade}%` : '—'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Tasks Done</p>
              <p className="text-xl font-bold mt-0.5">{taskCompletion}%</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="attendance">
          <TabsList>
            <TabsTrigger value="attendance" className="gap-2">
              <CalendarCheck className="h-4 w-4" />
              Attendance
            </TabsTrigger>

            <TabsTrigger value="submissions" className="gap-2">
              <FileText className="h-4 w-4" />
              Submissions
            </TabsTrigger>

            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  <p
                    className={cn(
                      'text-2xl font-bold mt-1',
                      attendanceRate >= 75 ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {attendanceRate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Flame
                      className={cn(
                        'h-5 w-5',
                        streak > 0 ? 'text-orange-400' : 'text-muted-foreground'
                      )}
                    />
                    <p className="text-2xl font-bold">{streak}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Sessions Attended</p>
                  <p className="text-2xl font-bold mt-1">
                    {
                      attendanceRecords.filter(
                        (record) => record.status !== 'absent'
                      ).length
                    }
                    /{attendanceRecords.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Absences</p>
                  <p className="text-2xl font-bold mt-1 text-red-400">
                    {
                      attendanceRecords.filter(
                        (record) => record.status === 'absent'
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

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
                    Minimum required attendance is 75%.
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
                  <p className="text-sm text-muted-foreground">
                    No attendance records found.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {record.attendance_date}
                          </p>
                          {record.notes && (
                            <p className="text-xs text-muted-foreground">
                              {record.notes}
                            </p>
                          )}
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            STATUS_STYLES[record.status] ||
                              'bg-muted text-muted-foreground'
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

                          <p className="text-sm text-muted-foreground mt-1">
                            Status: {submission.status}
                          </p>

                          <p className="text-sm text-muted-foreground mt-1">
                            Submitted:{' '}
                            {submission.submitted_at || submission.created_at}
                          </p>

                          {submission.submission_text && (
                            <p className="text-sm mt-3">
                              {submission.submission_text}
                            </p>
                          )}

                          <div className="flex gap-3 mt-3">
                            {submission.github_url && (
                              <a
                                href={submission.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <Github className="h-4 w-4" />
                                GitHub
                              </a>
                            )}

                            {submission.live_url && (
                              <a
                                href={submission.live_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <Globe className="h-4 w-4" />
                                Live
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant="secondary">{submission.status}</Badge>

                          {latestReview?.score !== null &&
                            latestReview?.score !== undefined && (
                              <p className="text-2xl font-bold mt-2">
                                {latestReview.score}%
                              </p>
                            )}
                        </div>
                      </div>

                      {latestReview?.feedback && (
                        <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Mentor Feedback
                          </p>
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

                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description || 'No description'}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary">{task.priority}</Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              task.status === 'done'
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
                        <p className="text-sm font-medium">
                          {task.due_date || 'No due date'}
                        </p>
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