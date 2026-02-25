'use client'

import { AppShell } from '@/components/app-shell'
import { useApp } from '@/lib/app-context'
import { useData } from '@/lib/data-context'
import {
  mockTasks,
  mockSubmissions,
  mockCohorts,
  mockWorkstreams,
  mockProjects,
  mockUsers,
  mockActivities,
} from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { AttendanceCard } from '@/components/attendance-card'
import { AttendanceManager } from '@/components/attendance-manager'

export default function DashboardPage() {
  const { currentUser, currentRole } = useApp()
  const { tasks, submissions, notifications } = useData()

  // Calculate metrics based on role
  const getMetrics = () => {
    if (currentRole === 'student') {
      const studentTasks = mockTasks.filter((t) => t.assignedTo === currentUser?.id)
      const studentSubmissions = mockSubmissions.filter(
        (s) => s.studentId === currentUser?.id
      )

      const completedTasks = studentTasks.filter((t) => t.status === 'completed').length
      const totalTasks = studentTasks.length
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      const approvedSubmissions = studentSubmissions.filter(
        (s) => s.status === 'approved'
      ).length

      const averageGrade =
        studentSubmissions
          .filter((s) => s.grade !== undefined)
          .reduce((sum, s) => sum + (s.grade || 0), 0) /
        studentSubmissions.filter((s) => s.grade !== undefined).length

      return {
        tasksCompleted: completedTasks,
        totalTasks,
        completionRate,
        pendingTasks: studentTasks.filter((t) => t.status === 'todo').length,
        inProgressTasks: studentTasks.filter((t) => t.status === 'in-progress').length,
        inReviewTasks: studentTasks.filter((t) => t.status === 'review').length,
        submissionsApproved: approvedSubmissions,
        totalSubmissions: studentSubmissions.length,
        averageGrade: isNaN(averageGrade) ? 0 : averageGrade,
      }
    } else if (currentRole === 'mentor') {
      const pendingReviews = mockSubmissions.filter(
        (s) => s.status === 'submitted' && !s.reviewId
      ).length

      const completedReviews = mockSubmissions.filter(
        (s) => s.status === 'approved' || s.status === 'revision-requested'
      ).length

      return {
        pendingReviews,
        completedReviews,
        totalStudents: mockUsers.filter((u) => u.role === 'student').length,
        activeWorkstreams: mockWorkstreams.length,
      }
    } else {
      // admin
      const activeCohorts = mockCohorts.filter((c) => c.status === 'active').length
      const totalStudents = mockUsers.filter((u) => u.role === 'student').length
      const totalMentors = mockUsers.filter((u) => u.role === 'mentor').length

      return {
        activeCohorts,
        totalStudents,
        totalMentors,
        totalProjects: mockProjects.length,
      }
    }
  }

  const metrics = getMetrics()

  const renderStudentDashboard = () => (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {currentUser?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your learning journey
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.tasksCompleted}/{metrics.totalTasks}
            </div>
            <Progress value={metrics.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.completionRate.toFixed(0)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.inReviewTasks} awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageGrade.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.submissionsApproved} submissions approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-2">Tasks to start</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance */}
      <div className="mb-6">
        <AttendanceCard />
      </div>

      {/* Current Tasks & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Tasks */}
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
              {mockTasks
                .filter(
                  (t) =>
                    t.assignedTo === currentUser?.id &&
                    (t.status === 'in-progress' || t.status === 'todo')
                )
                .slice(0, 5)
                .map((task) => {
                  const project = mockProjects.find((p) => p.id === task.projectId)
                  return (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-4 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {project?.name}
                        </p>
                      </div>
                      <Badge
                        variant={task.status === 'in-progress' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  )
                })}
              {mockTasks.filter(
                (t) =>
                  t.assignedTo === currentUser?.id &&
                  (t.status === 'in-progress' || t.status === 'todo')
              ).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No active tasks. Great job!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities
                .filter((a) => a.userId === currentUser?.id)
                .slice(0, 5)
                .map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              {mockActivities.filter((a) => a.userId === currentUser?.id).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  const renderMentorDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mentor Dashboard</h1>
        <p className="text-muted-foreground">Review submissions and support students</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingReviews}</div>
            <p className="text-xs text-muted-foreground mt-2">Submissions awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Reviews</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedReviews}</div>
            <p className="text-xs text-muted-foreground mt-2">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-2">Across all cohorts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workstreams</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeWorkstreams}</div>
            <p className="text-xs text-muted-foreground mt-2">Active curricula</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Manager */}
      <div className="mb-6">
        <AttendanceManager />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Submissions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reviews">
                  Review All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSubmissions
                .filter((s) => s.status === 'submitted')
                .slice(0, 5)
                .map((submission) => {
                  const student = mockUsers.find((u) => u.id === submission.studentId)
                  const task = mockTasks.find((t) => t.id === submission.taskId)
                  return (
                    <div
                      key={submission.id}
                      className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={student?.avatar} />
                        <AvatarFallback>
                          {student?.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{task?.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{student?.name}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        New
                      </Badge>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  const renderAdminDashboard = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage cohorts, users, and platform analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cohorts</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCohorts}</div>
            <p className="text-xs text-muted-foreground mt-2">Running programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-2">Active learners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentors</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMentors}</div>
            <p className="text-xs text-muted-foreground mt-2">Active instructors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <BookOpen className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-2">In curriculum</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Cohorts</CardTitle>
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
              {mockCohorts
                .filter((c) => c.status === 'active')
                .map((cohort) => (
                  <div
                    key={cohort.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{cohort.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cohort.studentCount} students
                      </p>
                    </div>
                    <Badge variant="secondary">{cohort.status}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.slice(0, 5).map((activity) => {
                const user = mockUsers.find((u) => u.id === activity.userId)
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>
                        {user?.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  return (
    <AppShell>
      {currentRole === 'student' && renderStudentDashboard()}
      {currentRole === 'mentor' && renderMentorDashboard()}
      {currentRole === 'admin' && renderAdminDashboard()}
    </AppShell>
  )
}
