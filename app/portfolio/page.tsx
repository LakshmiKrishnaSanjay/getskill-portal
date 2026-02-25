'use client'

import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FolderOpen, Star, ExternalLink, Award, TrendingUp, Code2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

export default function PortfolioPage() {
  const { submissions, projects, tasks, reviews, students } = useData()
  const { currentRole, currentUser } = useApp()

  const student = currentRole === 'student' 
    ? currentUser 
    : students[0] // For demo, show first student's portfolio for mentors/admins

  const studentSubmissions = submissions.filter(s => s.studentId === student?.id && s.status === 'approved')
  const studentProjects = projects.filter(p => p.studentIds.includes(student?.id || ''))
  
  const portfolioStats = useMemo(() => {
    const studentReviews = reviews.filter(r => 
      studentSubmissions.some(s => s.id === r.submissionId)
    )
    
    const totalRatings = studentReviews.filter(r => r.rating).length
    const avgRating = totalRatings > 0
      ? studentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
      : 0

    const completedProjects = studentProjects.filter(p => p.status === 'completed').length
    const totalSubmissions = studentSubmissions.length

    return {
      avgRating: avgRating.toFixed(1),
      completedProjects,
      totalSubmissions,
      skillsLearned: new Set(studentProjects.flatMap(p => {
        const task = tasks.find(t => t.projectId === p.id)
        return task?.skills || []
      })).size
    }
  }, [studentSubmissions, studentProjects, reviews, tasks])

  const featuredProjects = studentProjects
    .filter(p => p.status === 'completed')
    .slice(0, 6)

  const approvedSubmissions = studentSubmissions.slice(0, 12)

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={student?.avatar} />
              <AvatarFallback className="text-2xl">
                {student?.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{student?.name}</h1>
              <p className="text-muted-foreground mt-1">Creative Technologist • {student?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">Cohort {student?.cohortId}</Badge>
                <Badge variant="outline">{portfolioStats.completedProjects} Projects Completed</Badge>
              </div>
            </div>
          </div>
          <Button>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Public Portfolio
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-semibold">{portfolioStats.avgRating}</div>
                <div className="flex items-center text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{portfolioStats.completedProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{portfolioStats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground mt-1">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{portfolioStats.skillsLearned}</div>
              <p className="text-xs text-muted-foreground mt-1">Mastered</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList>
            <TabsTrigger value="projects">Featured Projects</TabsTrigger>
            <TabsTrigger value="submissions">All Work</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {featuredProjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">No completed projects yet</p>
                  <p className="text-sm text-muted-foreground">
                    Complete projects to showcase them in your portfolio
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredProjects.map(project => {
                  const projectSubmissions = submissions.filter(
                    s => s.projectId === project.id && s.studentId === student?.id
                  )
                  const projectReviews = reviews.filter(r =>
                    projectSubmissions.some(s => s.id === r.submissionId)
                  )
                  const avgRating = projectReviews.length > 0
                    ? projectReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / projectReviews.length
                    : 0

                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary">{project.workstreamId}</Badge>
                            {avgRating > 0 && (
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {project.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {project.deliverables.slice(0, 3).map((deliverable, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {deliverable}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-3">
            {approvedSubmissions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">No approved submissions yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {approvedSubmissions.map(submission => {
                  const task = tasks.find(t => t.id === submission.taskId)
                  const review = reviews.find(r => r.submissionId === submission.id)

                  return (
                    <Link key={submission.id} href={`/submissions/${submission.id}`}>
                      <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </Badge>
                            {review?.rating && (
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-xs font-medium">{review.rating}</span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-sm line-clamp-2">{task?.title}</CardTitle>
                        </CardHeader>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Skills</CardTitle>
                <CardDescription>Skills learned through completed projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(studentProjects.flatMap(p => {
                    const projectTasks = tasks.filter(t => t.projectId === p.id)
                    return projectTasks.flatMap(t => t.skills)
                  }))).map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
