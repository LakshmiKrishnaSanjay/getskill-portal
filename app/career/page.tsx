'use client'

import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Briefcase, MapPin, DollarSign, Clock, ExternalLink, BookmarkPlus } from 'lucide-react'
import { useState } from 'react'

// Mock job data
const mockJobs = [
  {
    id: '1',
    title: 'Creative Technologist',
    company: 'Meta',
    location: 'New York, NY',
    type: 'Full-time',
    salary: '$120k - $160k',
    posted: '2 days ago',
    description: 'Join our creative technology team to build innovative experiences...',
    skills: ['React', 'Three.js', 'WebGL', 'Motion Design'],
    logo: '🔵'
  },
  {
    id: '2',
    title: 'Interactive Designer',
    company: 'Google',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$110k - $150k',
    posted: '5 days ago',
    description: 'Create cutting-edge interactive experiences for Google products...',
    skills: ['JavaScript', 'UI/UX', 'Prototyping', 'WebGL'],
    logo: '🔴'
  },
  {
    id: '3',
    title: 'Frontend Engineer',
    company: 'Vercel',
    location: 'Remote',
    type: 'Full-time',
    salary: '$130k - $180k',
    posted: '1 week ago',
    description: 'Build the future of web development with Next.js...',
    skills: ['Next.js', 'React', 'TypeScript', 'Design Systems'],
    logo: '⚫'
  },
  {
    id: '4',
    title: 'Creative Developer',
    company: 'Stripe',
    location: 'Remote',
    type: 'Contract',
    salary: '$100k - $140k',
    posted: '1 week ago',
    description: 'Help design and build beautiful payment experiences...',
    skills: ['React', 'Animation', 'SVG', 'Canvas'],
    logo: '🟣'
  },
]

export default function CareerPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredJobs = mockJobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Career Hub</h1>
            <p className="text-muted-foreground mt-1">
              Find opportunities and advance your creative tech career
            </p>
          </div>
          <Button>
            Upload Resume
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{mockJobs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">New this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">3</div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">1</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saved Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">7</div>
              <p className="text-xs text-muted-foreground mt-1">Bookmarked</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="jobs" className="w-full">
          <TabsList>
            <TabsTrigger value="jobs">Job Board</TabsTrigger>
            <TabsTrigger value="applications">My Applications</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Jobs List */}
            <div className="space-y-3">
              {filteredJobs.map(job => (
                <Card key={job.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-4xl">{job.logo}</div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-1">{job.title}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="font-medium text-foreground">{job.company}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {job.salary}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.posted}
                            </span>
                          </CardDescription>
                          <p className="text-sm text-muted-foreground mb-3">
                            {job.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            <Badge variant="outline" className="text-xs">
                              {job.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm">
                          Apply Now
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <BookmarkPlus className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">No applications yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start applying to jobs to track your applications here
                </p>
                <Button>Browse Jobs</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resume Templates</CardTitle>
                  <CardDescription>
                    Professional templates designed for creative tech roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Interview Prep</CardTitle>
                  <CardDescription>
                    Practice questions and tips for technical interviews
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Start Practicing
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Portfolio Review</CardTitle>
                  <CardDescription>
                    Get feedback on your portfolio from industry experts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Request Review
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Career Coaching</CardTitle>
                  <CardDescription>
                    One-on-one sessions with career advisors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Book Session
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
