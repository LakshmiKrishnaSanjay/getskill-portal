'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AttendanceCard } from '@/components/attendance-card'
import { AttendanceManager } from '@/components/attendance-manager'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  ListTodo,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string
  email: string
  role: Role
  avatar_url: string | null
}

type CohortRow = {
  id: string
  name: string
  cohort_code: string | null
  status: string
}

type StudentRow = {
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

type MentorRow = {
  id: string
  profile_id: string
  specialization: string | null
  status: string
  profile_picture_url: string | null
  profiles?: {
    full_name: string
    email: string
  } | null
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  cohort_id: string
  assigned_to: string | null
  assigned_by: string
  priority: string
  status: string
  due_date: string | null
  created_at: string
}

type SubmissionRow = {
  id: string
  task_id: string
  student_id: string
  submission_text: string | null
  status: string
  submitted_at: string | null
  created_at: string
  tasks: {
    title: string
  } | null
  students?: {
    student_code: string
    profiles: {
      full_name: string
      email: string
    } | null
  } | null
  reviews?: {
    score: number | null
    status: string
  }[]
}

type AttendanceRow = {
  id: string
  student_id: string
  mentor_id: string
  cohort_id: string
  attendance_date: string
  status: 'present' | 'late' | 'absent'
}

type AdminCounts = {
  students: number
  mentors: number
  cohorts: number
  tasks: number
  submissions: number
  admissions: number
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [student, setStudent] = useState<StudentRow | null>(null)
  const [mentor, setMentor] = useState<MentorRow | null>(null)

  const [students, setStudents] = useState<StudentRow[]>([])
  const [mentors, setMentors] = useState<MentorRow[]>([])
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])

  const [adminCounts, setAdminCounts] = useState<AdminCounts>({
    students: 0,
    mentors: 0,
    cohorts: 0,
    tasks: 0,
    submissions: 0,
    admissions: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCount = async (table: string) => {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    return count || 0
  }

  const isCompletedTask = (status: string) => {
    return status === 'completed' || status === 'done'
  }

  const isInProgressTask = (status: string) => {
    return status === 'in-progress' || status === 'in_progress'
  }

  const isReviewTask = (status: string) => {
    return status === 'review' || status === 'in-review' || status === 'in_review'
  }

  const isTodoTask = (status: string) => {
    return status === 'todo'
  }

  const isPendingSubmission = (status: string) => {
    return status === 'submitted' || status === 'in-review' || status === 'in_review'
  }

  const isCompletedSubmission = (status: string) => {
    return (
      status === 'approved' ||
      status === 'revision-requested' ||
      status === 'revision_requested' ||
      status === 'rejected'
    )
  }

  const fetchDashboardData = async () => {
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
      .select('id, full_name, email, role, avatar_url')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profileData) {
      setError('Profile not found.')
      setLoading(false)
      return
    }

    const currentProfile = profileData as Profile
    setProfile(currentProfile)

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

      const currentStudent = studentData as StudentRow
      setStudent(currentStudent)

      const [
        { data: taskData },
        { data: submissionData },
        { data: attendanceData },
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            cohort_id,
            assigned_to,
            assigned_by,
            priority,
            status,
            due_date,
            created_at
          `)
          .eq('assigned_to', currentStudent.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('submissions')
          .select(`
            id,
            task_id,
            student_id,
            submission_text,
            status,
            submitted_at,
            created_at,
            tasks (
              title
            ),
            reviews (
              score,
              status
            )
          `)
          .eq('student_id', currentStudent.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('attendance')
          .select('id, student_id, mentor_id, cohort_id, attendance_date, status')
          .eq('student_id', currentStudent.id)
          .order('attendance_date', { ascending: false }),
      ])

      setTasks((taskData || []) as TaskRow[])
      setSubmissions((submissionData || []) as SubmissionRow[])
      setAttendance((attendanceData || []) as AttendanceRow[])
    }

    if (currentProfile.role === 'mentor') {
      const { data: mentorData, error: mentorError } = await supabase
        .from('mentors')
        .select(`
          id,
          profile_id,
          specialization,
          status,
          profile_picture_url
        `)
        .eq('profile_id', currentProfile.id)
        .single()

      if (mentorError || !mentorData) {
        setError('Mentor record not found.')
        setLoading(false)
        return
      }

      const currentMentor = mentorData as MentorRow
      setMentor(currentMentor)

      const { data: assignedCohorts } = await supabase
        .from('cohort_mentors')
        .select(`
          cohorts (
            id,
            name,
            cohort_code,
            status
          )
        `)
        .eq('mentor_id', currentMentor.id)

      const realCohorts =
        assignedCohorts?.map((item: any) => item.cohorts).filter(Boolean) || []

      setCohorts(realCohorts as CohortRow[])

      const cohortIds = realCohorts.map((cohort: CohortRow) => cohort.id)

      if (cohortIds.length > 0) {
        const [
          { data: studentData },
          { data: taskData },
          { data: attendanceData },
        ] = await Promise.all([
          supabase
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
            .in('cohort_id', cohortIds)
            .order('created_at', { ascending: false }),

          supabase
            .from('tasks')
            .select(`
              id,
              title,
              description,
              cohort_id,
              assigned_to,
              assigned_by,
              priority,
              status,
              due_date,
              created_at
            `)
            .in('cohort_id', cohortIds)
            .order('created_at', { ascending: false }),

          supabase
            .from('attendance')
            .select('id, student_id, mentor_id, cohort_id, attendance_date, status')
            .in('cohort_id', cohortIds)
            .order('attendance_date', { ascending: false }),
        ])

        const currentTasks = (taskData || []) as TaskRow[]
        const taskIds = currentTasks.map((task) => task.id)

        let submissionData: SubmissionRow[] = []

        if (taskIds.length > 0) {
          const { data } = await supabase
            .from('submissions')
            .select(`
              id,
              task_id,
              student_id,
              submission_text,
              status,
              submitted_at,
              created_at,
              tasks (
                title
              ),
              students (
                student_code,
                profiles (
                  full_name,
                  email
                )
              ),
              reviews (
                score,
                status
              )
            `)
            .in('task_id', taskIds)
            .order('created_at', { ascending: false })

          submissionData = (data || []) as SubmissionRow[]
        }

        setStudents((studentData || []) as StudentRow[])
        setTasks(currentTasks)
        setSubmissions(submissionData)
        setAttendance((attendanceData || []) as AttendanceRow[])
      }
    }

    if (currentProfile.role === 'admin' || currentProfile.role === 'superadmin') {
      const [
        studentsCount,
        mentorsCount,
        cohortsCount,
        tasksCount,
        submissionsCount,
        admissionsCount,
      ] = await Promise.all([
        fetchCount('students'),
        fetchCount('mentors'),
        fetchCount('cohorts'),
        fetchCount('tasks'),
        fetchCount('submissions'),
        fetchCount('admissions'),
      ])

      setAdminCounts({
        students: studentsCount,
        mentors: mentorsCount,
        cohorts: cohortsCount,
        tasks: tasksCount,
        submissions: submissionsCount,
        admissions: admissionsCount,
      })

      const [
        { data: cohortData },
        { data: studentData },
        { data: mentorData },
        { data: taskData },
        { data: submissionData },
        { data: attendanceData },
      ] = await Promise.all([
        supabase
          .from('cohorts')
          .select('id, name, cohort_code, status')
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
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
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('mentors')
          .select(`
            id,
            profile_id,
            specialization,
            status,
            profile_picture_url,
            profiles (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            cohort_id,
            assigned_to,
            assigned_by,
            priority,
            status,
            due_date,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('submissions')
          .select(`
            id,
            task_id,
            student_id,
            submission_text,
            status,
            submitted_at,
            created_at,
            tasks (
              title
            ),
            students (
              student_code,
              profiles (
                full_name,
                email
              )
            ),
            reviews (
              score,
              status
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('attendance')
          .select('id, student_id, mentor_id, cohort_id, attendance_date, status')
          .order('created_at', { ascending: false }),
      ])

      setCohorts((cohortData || []) as CohortRow[])
      setStudents((studentData || []) as StudentRow[])
      setMentors((mentorData || []) as MentorRow[])
      setTasks((taskData || []) as TaskRow[])
      setSubmissions((submissionData || []) as SubmissionRow[])
      setAttendance((attendanceData || []) as AttendanceRow[])
    }

    if (currentProfile.role === 'placement') {
      const { data: studentData } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(8)

      setStudents((studentData || []) as StudentRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const attendanceRate = useMemo(() => {
    if (attendance.length === 0) return 0

    const attended = attendance.filter(
      (item) => item.status === 'present' || item.status === 'late'
    ).length

    return Math.round((attended / attendance.length) * 100)
  }, [attendance])

  const averageGrade = useMemo(() => {
    const scores = submissions
      .flatMap((submission) => submission.reviews || [])
      .map((review) => review.score)
      .filter((score): score is number => typeof score === 'number')

    if (scores.length === 0) return 0

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }, [submissions])

  const studentMetrics = useMemo(() => {
    const completedTasks = tasks.filter((task) => isCompletedTask(task.status)).length
    const inProgressTasks = tasks.filter((task) =>
      isInProgressTask(task.status)
    ).length
    const inReviewTasks = tasks.filter((task) => isReviewTask(task.status)).length
    const pendingTasks = tasks.filter((task) => isTodoTask(task.status)).length
    const completionRate =
      tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

    return {
      completedTasks,
      inProgressTasks,
      inReviewTasks,
      pendingTasks,
      totalTasks: tasks.length,
      completionRate,
      approvedSubmissions: submissions.filter(
        (submission) => submission.status === 'approved'
      ).length,
    }
  }, [tasks, submissions])

  const mentorMetrics = useMemo(() => {
    return {
      totalStudents: students.length,
      assignedCohorts: cohorts.length,
      activeTasks: tasks.filter((task) => !isCompletedTask(task.status)).length,
      pendingReviews: submissions.filter((submission) =>
        isPendingSubmission(submission.status)
      ).length,
      completedReviews: submissions.filter((submission) =>
        isCompletedSubmission(submission.status)
      ).length,
      attendanceRate,
    }
  }, [students, cohorts, tasks, submissions, attendanceRate])

  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  if (loading) {
    return (
      <AppShell>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </AppShell>
    )
  }

  if (error || !profile) {
    return (
      <AppShell>
        <div className="py-16 text-center text-sm text-red-500">
          {error || 'Unable to load dashboard.'}
        </div>
      </AppShell>
    )
  }

  const renderStudentDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}!</h1>
        <p className="text-muted-foreground">
          Track your assigned tasks, submissions, grades, and attendance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentMetrics.completedTasks}/{studentMetrics.totalTasks}
            </div>
            <Progress value={studentMetrics.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {studentMetrics.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentMetrics.inProgressTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {studentMetrics.pendingTasks} pending, {studentMetrics.inReviewTasks} in review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageGrade > 0 ? `${averageGrade}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {studentMetrics.approvedSubmissions} approved submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <Progress value={attendanceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Minimum 75% required
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Tasks</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tasks">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks
                .filter((task) => !isCompletedTask(task.status))
                .slice(0, 5)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {task.due_date || 'No due date'}
                      </p>
                    </div>

                    <Badge variant="secondary" className="shrink-0">
                      {task.status}
                    </Badge>
                  </div>
                ))}

              {tasks.filter((task) => !isCompletedTask(task.status)).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No active tasks.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {submission.tasks?.title || 'Submission'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {submission.submitted_at || submission.created_at}
                    </p>
                  </div>

                  <Badge variant="secondary" className="shrink-0">
                    {submission.status}
                  </Badge>
                </div>
              ))}

              {submissions.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No submissions yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AttendanceCard />
    </>
  )

  const renderMentorDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mentor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your assigned cohorts, students, reviews, and attendance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
            <Users className="h-4 w-4 text-[#153E90]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentorMetrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Across {mentorMetrics.assignedCohorts} cohorts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentorMetrics.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {mentorMetrics.completedReviews} completed reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentorMetrics.activeTasks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {tasks.length} total tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentorMetrics.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Assigned cohort average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Assigned Cohorts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cohorts">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{cohort.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cohort.cohort_code || 'No code'}
                    </p>
                  </div>

                  <Badge variant="secondary">{cohort.status}</Badge>
                </div>
              ))}

              {cohorts.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No cohorts assigned.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Submissions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/submissions">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions.slice(0, 5).map((submission) => {
                const studentName =
                  submission.students?.profiles?.full_name ||
                  submission.students?.student_code ||
                  'Student'

                const initials = studentName
                  .split(' ')
                  .map((item) => item[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={submission.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {submission.tasks?.title || 'Submission'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {studentName}
                      </p>
                    </div>

                    <Badge variant="secondary" className="shrink-0">
                      {submission.status}
                    </Badge>
                  </div>
                )
              })}

              {submissions.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No submissions found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AttendanceManager />
    </>
  )

  const renderAdminDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {profile.role === 'superadmin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {profile.role === 'superadmin'
            ? 'Full access to admin, mentor, student, and placement operations.'
            : 'Manage cohorts, students, mentors, tasks, submissions, and attendance.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
            <BookOpen className="h-4 w-4 text-[#153E90]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCounts.cohorts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Total batches created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCounts.students}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Registered learners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentors</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCounts.mentors}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Active instructors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCounts.submissions}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {adminCounts.tasks} total tasks
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Cohorts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cohorts">
                  View
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cohorts.map((cohort) => (
                <div key={cohort.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{cohort.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cohort.cohort_code || 'No code'}
                      </p>
                    </div>
                    <Badge variant="secondary">{cohort.status}</Badge>
                  </div>
                </div>
              ))}

              {cohorts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No cohorts found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Students</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/students">
                  View
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {students.map((student) => {
                const studentName = student.profiles?.full_name || student.student_code
                const initials = studentName
                  .split(' ')
                  .map((item) => item[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={student.profile_picture_url || ''} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.cohorts?.name || 'No cohort'} · {student.student_code}
                      </p>
                    </div>
                  </div>
                )
              })}

              {students.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No students found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Mentors</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/mentors">
                  View
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mentors.map((mentor) => {
                const mentorName = mentor.profiles?.full_name || 'Mentor'
                const initials = mentorName
                  .split(' ')
                  .map((item) => item[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={mentor.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={mentor.profile_picture_url || ''} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {mentorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mentor.specialization || 'No specialization'}
                      </p>
                    </div>
                  </div>
                )
              })}

              {mentors.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No mentors found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AttendanceManager />
    </>
  )

  const renderPlacementDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Placement Dashboard</h1>
        <p className="text-muted-foreground">
          Review student portfolios and career readiness for placement support.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students to Review</CardTitle>
            <Users className="h-4 w-4 text-[#153E90]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Recent students available for portfolio and career checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Review</CardTitle>
            <Briefcase className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Portfolio</div>
            <p className="text-xs text-muted-foreground mt-2">
              Check student work, projects, and presentation readiness
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Career Readiness</CardTitle>
            <GraduationCap className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Career</div>
            <p className="text-xs text-muted-foreground mt-2">
              Review student career profile and placement preparation
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Placement Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild>
                <Link href="/portfolio">
                  View Portfolio
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href="/career">
                  View Career
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {students.map((student) => {
                const studentName = student.profiles?.full_name || student.student_code
                const initials = studentName
                  .split(' ')
                  .map((item) => item[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={student.profile_picture_url || ''} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.cohorts?.name || 'No cohort'} · {student.student_code}
                      </p>
                    </div>
                  </div>
                )
              })}

              {students.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No students found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  return (
    <AppShell>
      <div className="space-y-8">
        {profile.role === 'student' && renderStudentDashboard()}
        {profile.role === 'mentor' && renderMentorDashboard()}
        {(profile.role === 'admin' || profile.role === 'superadmin') &&
          renderAdminDashboard()}
        {profile.role === 'placement' && renderPlacementDashboard()}

        {profile.role !== 'student' &&
          profile.role !== 'mentor' &&
          profile.role !== 'admin' &&
          profile.role !== 'superadmin' &&
          profile.role !== 'placement' && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
                <p className="text-sm text-muted-foreground">
                  Unknown role. Please contact admin.
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </AppShell>
  )
}