'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useApp } from '@/lib/app-context'
import { mockSubmissions, mockTasks, mockProjects, mockUsers } from '@/lib/mock-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Github,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import type { SubmissionStatus } from '@/lib/types'

const statusConfig = {
  draft: {
    label: 'Draft',
    icon: FileText,
    color: 'text-muted-foreground',
    variant: 'secondary' as const,
  },
  submitted: {
    label: 'Submitted',
    icon: Clock,
    color: 'text-blue-500',
    variant: 'default' as const,
  },
  reviewed: {
    label: 'Reviewed',
    icon: CheckCircle2,
    color: 'text-purple-500',
    variant: 'secondary' as const,
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    color: 'text-green-500',
    variant: 'outline' as const,
  },
  'revision-requested': {
    label: 'Needs Revision',
    icon: AlertCircle,
    color: 'text-orange-500',
    variant: 'destructive' as const,
  },
}

export default function SubmissionsPage() {
  const { currentUser, currentRole } = useApp()
  const [searchQuery, setSearchQuery] = useState('')

  const getSubmissions = () => {
    if (currentRole === 'student') {
      return mockSubmissions.filter((s) => s.studentId === currentUser?.id)
    } else if (currentRole === 'mentor') {
      return mockSubmissions
    }
    return []
  }

  const submissions = getSubmissions()

  const filteredSubmissions = submissions.filter((submission) => {
    const task = mockTasks.find((t) => t.id === submission.taskId)
    const matchesSearch =
      task?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.content.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const getSubmissionsByStatus = (status: SubmissionStatus) =>
    filteredSubmissions.filter((s) => s.status === status)

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submissions</h1>
          <p className="text-muted-foreground">
            {currentRole === 'student'
              ? 'Track your submitted work and feedback'
              : 'Review student submissions and provide feedback'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = submissions.filter((s) => s.status === status).length
            const Icon = config.icon
            return (
              <Card key={status}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({filteredSubmissions.length})</TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({getSubmissionsByStatus('submitted').length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({getSubmissionsByStatus('approved').length})
            </TabsTrigger>
            <TabsTrigger value="revision-requested">
              Needs Revision ({getSubmissionsByStatus('revision-requested').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No submissions found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))
            )}
          </TabsContent>

          {(['submitted', 'approved', 'revision-requested'] as SubmissionStatus[]).map(
            (status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {getSubmissionsByStatus(status).length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          No {statusConfig[status].label.toLowerCase()} submissions
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  getSubmissionsByStatus(status).map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))
                )}
              </TabsContent>
            )
          )}
        </Tabs>
      </div>
    </AppShell>
  )
}

function SubmissionCard({ submission }: { submission: (typeof mockSubmissions)[0] }) {
  const { currentRole } = useApp()
  const task = mockTasks.find((t) => t.id === submission.taskId)
  const project = mockProjects.find((p) => p.id === task?.projectId)
  const student = mockUsers.find((u) => u.id === submission.studentId)

  const statusInfo = statusConfig[submission.status]
  const StatusIcon = statusInfo.icon

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {currentRole === 'mentor' && student && (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={student.avatar} />
              <AvatarFallback>
                {student.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusInfo.variant} className="gap-1">
                <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                {statusInfo.label}
              </Badge>
              {submission.grade !== undefined && (
                <Badge variant="outline" className="font-mono">
                  {submission.grade}%
                </Badge>
              )}
              {project && (
                <Badge variant="secondary" className="text-xs">
                  {project.name}
                </Badge>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-1">{task?.title || 'Unknown Task'}</h3>
            {currentRole === 'mentor' && student && (
              <p className="text-sm text-muted-foreground mb-2">by {student.name}</p>
            )}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {submission.content}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mb-3">
              {submission.submittedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                </div>
              )}
              {submission.githubUrl && (
                <a
                  href={submission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {submission.liveUrl && (
                <a
                  href={submission.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Demo
                </a>
              )}
            </div>

            {submission.attachments && submission.attachments.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {submission.attachments.map((attachment) => (
                  <Badge key={attachment.id} variant="outline" className="text-xs">
                    {attachment.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button asChild>
            <Link href={`/submissions/${submission.id}`}>
              View
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
