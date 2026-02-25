'use client'

import { use } from 'react'
import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  getAttendanceRate,
  getAttendanceStreak,
  getInternshipEligibility,
} from '@/lib/attendance-data'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Github,
  Linkedin,
  Globe,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  ListTodo,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500',
  late: 'bg-yellow-500',
  absent: 'bg-red-500',
}

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-500/10 text-green-400 border-green-500/20',
  late: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  absent: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { currentRole } = useApp()
  const { users, tasks, submissions, reviews, attendanceRecords, sessions, cohorts, workstreams } = useData()

  const student = users.find(u => u.id === id)
  const cohort = cohorts.find(c => c.id === student?.cohortId)

  const studentTasks = useMemo(
    () => tasks.filter(t => t.assignedTo === id),
    [tasks, id],
  )

  const studentSubmissions = useMemo(
    () => submissions.filter(s => s.studentId === id),
    [submissions, id],
  )

  const studentRecords = useMemo(
    () => attendanceRecords
      .filter(r => r.studentId === id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [attendanceRecords, id],
  )

  const studentSessions = useMemo(
    () => sessions.filter(s => s.cohortId === student?.cohortId).sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, student],
  )

  const attendanceRate = useMemo(() => getAttendanceRate(id, attendanceRecords), [id, attendanceRecords])
  const streak = useMemo(() => getAttendanceStreak(id, attendanceRecords), [id, attendanceRecords])

  const avgGrade = useMemo(() => {
    const graded = studentSubmissions.filter(s => s.grade !== undefined)
    if (graded.length === 0) return 0
    return Math.round(graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length)
  }, [studentSubmissions])

  const eligibility = getInternshipEligibility(attendanceRate, avgGrade)

  const taskCompletion = studentTasks.length > 0
    ? Math.round((studentTasks.filter(t => t.status === 'completed').length / studentTasks.length) * 100)
    : 0

  if (!student) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-muted-foreground">Student not found.</p>
          <Button asChild variant="outline">
            <Link href="/analytics"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
          </Button>
        </div>
      </AppShell>
    )
  }

  // Redirect students to their own dashboard for others' profiles
  if (currentRole === 'student') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">You don't have permission to view other profiles.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl">
        {/* Back */}
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link href="/analytics"><ArrowLeft className="mr-2 h-4 w-4" />All Students</Link>
          </Button>
        </div>

        {/* Profile header */}
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={student.avatar} />
            <AvatarFallback className="text-2xl">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <Badge variant="secondary">{cohort?.name ?? 'No Cohort'}</Badge>
              <Badge
                variant="outline"
                className={cn(eligibility.eligible ? 'border-green-500/30 text-green-400' : 'border-yellow-500/30 text-yellow-400')}
              >
                {eligibility.eligible ? 'Internship Eligible' : 'Not Eligible'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{student.email}</p>
            {student.bio && <p className="text-sm mt-2">{student.bio}</p>}
            <div className="flex items-center gap-3 mt-3">
              {student.githubUrl && (
                <a href={student.githubUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-4 w-4" />
                </a>
              )}
              {student.linkedinUrl && (
                <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {student.portfolioUrl && (
                <a href={student.portfolioUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Attendance</p>
              <p className={cn('text-xl font-bold mt-0.5', attendanceRate >= 75 ? 'text-green-400' : 'text-red-400')}>
                {attendanceRate}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Avg Grade</p>
              <p className="text-xl font-bold mt-0.5">{avgGrade}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Tasks Done</p>
              <p className="text-xl font-bold mt-0.5">{taskCompletion}%</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
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

          {/* ── Attendance Tab ─────────────────────────────────────── */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  <p className={cn('text-2xl font-bold mt-1', attendanceRate >= 75 ? 'text-green-400' : 'text-red-400')}>
                    {attendanceRate}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Flame className={cn('h-5 w-5', streak > 0 ? 'text-orange-400' : 'text-muted-foreground')} />
                    <p className="text-2xl font-bold">{streak}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Sessions Attended</p>
                  <p className="text-2xl font-bold mt-1">
                    {studentRecords.filter(r => r.status !== 'absent').length}/{studentRecords.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Absences</p>
                  <p className="text-2xl font-bold mt-1 text-red-400">
                    {studentRecords.filter(r => r.status === 'absent').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Eligibility banner */}
            <div className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3',
              eligibility.attendanceOk
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-yellow-500/20 bg-yellow-500/5',
            )}>
              {eligibility.attendanceOk
                ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
              }
              <div>
                <p className={cn('text-sm font-medium', eligibility.attendanceOk ? 'text-green-400' : 'text-yellow-400')}>
                  {eligibility.attendanceOk
                    ? 'Attendance eligibility met for internship and certificate'
                    : 'Below 75% — internship placement and certificate at risk'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Minimum 75% required. Current: {attendanceRate}%.
                </p>
              </div>
            </div>

            {/* History table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Session History</CardTitle>
                <CardDescription>All recorded sessions for {cohort?.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    <span className="col-span-2">Date</span>
                    <span className="col-span-4">Session</span>
                    <span className="col-span-3">Topic</span>
                    <span className="col-span-1">Status</span>
                    <span className="col-span-2">Note</span>
                  </div>

                  {studentSessions.map(session => {
                    const record = studentRecords.find(r => r.sessionId === session.id)
                    const status = record?.status ?? 'absent'
                    return (
                      <div
                        key={session.id}
                        className="grid grid-cols-12 gap-3 items-center px-3 py-3 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                      >
                        <span className="col-span-2 text-sm text-muted-foreground">
                          {new Date(session.date).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="col-span-4 text-sm font-medium truncate">{session.title}</span>
                        <span className="col-span-3 text-sm text-muted-foreground truncate">{session.topic}</span>
                        <span className="col-span-1">
                          {record ? (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                                STATUS_STYLES[status],
                              )}
                            >
                              {status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </span>
                        <span className="col-span-2 text-xs text-muted-foreground truncate">
                          {record?.note ?? '—'}
                        </span>
                      </div>
                    )
                  })}

                  {studentSessions.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">No sessions found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Submissions Tab ────────────────────────────────────── */}
          <TabsContent value="submissions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Submission History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studentSubmissions.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-accent/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium truncate max-w-xs">{sub.content.slice(0, 60)}…</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {sub.grade !== undefined && (
                          <span className="text-sm font-medium">{sub.grade}%</span>
                        )}
                        <Badge
                          variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {studentSubmissions.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No submissions yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tasks Tab ──────────────────────────────────────────── */}
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Task Completion</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {studentTasks.filter(t => t.status === 'completed').length}/{studentTasks.length} completed
                  </span>
                </div>
                <Progress value={taskCompletion} className="mt-2 h-1.5" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studentTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={task.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                  {studentTasks.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No tasks assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
