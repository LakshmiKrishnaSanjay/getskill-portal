'use client'

import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Filter, FileText, Clock, CheckCircle2, XCircle, Star } from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

const statusConfig = {
  'pending': { label: 'Pending Review', variant: 'secondary' as const, icon: Clock },
  'approved': { label: 'Approved', variant: 'outline' as const, icon: CheckCircle2 },
  'rejected': { label: 'Needs Work', variant: 'destructive' as const, icon: XCircle },
}

export default function ReviewsPage() {
  const { submissions, students, tasks, reviews } = useData()
  const { currentRole, currentUser } = useApp()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions

    if (currentRole === 'student') {
      filtered = submissions.filter(s => s.studentId === currentUser?.id)
    } else if (currentRole === 'mentor') {
      // Mentors see submissions assigned to them for review
      const submissionIdsWithReviews = reviews
        .filter(r => r.reviewerId === currentUser?.id)
        .map(r => r.submissionId)
      filtered = submissions.filter(s => submissionIdsWithReviews.includes(s.id) || s.status === 'pending')
    }

    return filtered.filter(submission => {
      const student = students.find(s => s.id === submission.studentId)
      const task = tasks.find(t => t.id === submission.taskId)
      const matchesSearch = 
        student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task?.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [submissions, students, tasks, reviews, searchQuery, statusFilter, currentRole, currentUser])

  const stats = useMemo(() => {
    const pending = filteredSubmissions.filter(s => s.status === 'pending').length
    const approved = filteredSubmissions.filter(s => s.status === 'approved').length
    const needsWork = filteredSubmissions.filter(s => s.status === 'rejected').length

    return { pending, approved, needsWork, total: filteredSubmissions.length }
  }, [filteredSubmissions])

  const getStudent = (studentId: string) => students.find(s => s.id === studentId)
  const getTask = (taskId: string) => tasks.find(t => t.id === taskId)
  const getReview = (submissionId: string) => reviews.find(r => r.submissionId === submissionId)

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>
            <p className="text-muted-foreground mt-1">
              {currentRole === 'student' 
                ? 'Your submission feedback and reviews' 
                : currentRole === 'mentor'
                ? 'Submissions pending your review'
                : 'All submission reviews'
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Needs Work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-500">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-green-500">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-destructive">{stats.needsWork}</div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">No submissions found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search or filters' : 'No submissions to review yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map(submission => {
              const student = getStudent(submission.studentId)
              const task = getTask(submission.taskId)
              const review = getReview(submission.id)
              const config = statusConfig[submission.status]
              const StatusIcon = config.icon

              return (
                <Link key={submission.id} href={`/submissions/${submission.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student?.avatar} />
                            <AvatarFallback>
                              {student?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base truncate">{task?.title}</CardTitle>
                              <Badge variant={config.variant} className="text-xs shrink-0">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-3">
                              <span>by {student?.name}</span>
                              <span>•</span>
                              <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {review && review.rating && (
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="text-sm font-medium">{review.rating}/5</span>
                            </div>
                          )}
                          {submission.status === 'pending' && currentRole !== 'student' && (
                            <Button size="sm" onClick={(e) => { e.preventDefault(); }}>
                              Review Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {review && review.feedback && (
                      <CardContent className="pt-0">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {review.feedback}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
