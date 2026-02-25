'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useApp } from '@/lib/app-context'
import { useData } from '@/lib/data-context'
import { mockTasks, mockProjects, mockWorkstreams, mockUsers } from '@/lib/mock-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import type { TaskStatus } from '@/lib/types'

const statusConfig = {
  todo: {
    label: 'To Do',
    icon: Circle,
    color: 'text-muted-foreground',
    variant: 'secondary' as const,
  },
  'in-progress': {
    label: 'In Progress',
    icon: PlayCircle,
    color: 'text-blue-500',
    variant: 'default' as const,
  },
  review: {
    label: 'In Review',
    icon: Clock,
    color: 'text-orange-500',
    variant: 'secondary' as const,
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-500',
    variant: 'outline' as const,
  },
}

const priorityConfig = {
  low: { label: 'Low', color: 'text-blue-500' },
  medium: { label: 'Medium', color: 'text-orange-500' },
  high: { label: 'High', color: 'text-red-500' },
}

export default function TasksPage() {
  const { currentUser, currentRole } = useApp()
  const { updateTaskStatus } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  // Get tasks based on role
  const getTasks = () => {
    if (currentRole === 'student') {
      return mockTasks.filter((t) => t.assignedTo === currentUser?.id)
    } else if (currentRole === 'mentor') {
      // Mentors see all tasks
      return mockTasks
    }
    return []
  }

  const tasks = getTasks()

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProject = filterProject === 'all' || task.projectId === filterProject

    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority

    return matchesSearch && matchesProject && matchesPriority
  })

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status)

  const projects = mockProjects.filter((p) =>
    tasks.some((t) => t.projectId === p.id)
  )

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <p className="text-muted-foreground">
            {currentRole === 'student'
              ? 'Manage your assignments and track your progress'
              : 'Monitor student tasks and progress'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = tasks.filter((t) => t.status === status).length
            const Icon = config.icon
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks by Status */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({filteredTasks.length})</TabsTrigger>
            <TabsTrigger value="todo">To Do ({getTasksByStatus('todo').length})</TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({getTasksByStatus('in-progress').length})
            </TabsTrigger>
            <TabsTrigger value="review">
              In Review ({getTasksByStatus('review').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({getTasksByStatus('completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No tasks found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </TabsContent>

          {Object.keys(statusConfig).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {getTasksByStatus(status as TaskStatus).length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No {status} tasks</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                getTasksByStatus(status as TaskStatus).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  )
}

function TaskCard({ task }: { task: (typeof mockTasks)[0] }) {
  const { currentRole } = useApp()
  const project = mockProjects.find((p) => p.id === task.projectId)
  const workstream = mockWorkstreams.find((w) => w.id === project?.workstreamId)
  const assignedUser = mockUsers.find((u) => u.id === task.assignedTo)

  const statusInfo = statusConfig[task.status]
  const priorityInfo = priorityConfig[task.priority]
  const StatusIcon = statusInfo.icon

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusInfo.variant} className="gap-1">
                <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className={priorityInfo.color}>
                {priorityInfo.label}
              </Badge>
              {workstream && (
                <Badge variant="secondary" className="text-xs">
                  {workstream.name}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-1">{task.title}</h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {project && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Project:</span>
                  <span>{project.name}</span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Due {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              {task.estimatedHours && (
                <div className="flex items-center gap-1">
                  <span>{task.estimatedHours}h estimated</span>
                </div>
              )}
              {currentRole === 'mentor' && assignedUser && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={assignedUser.avatar} />
                    <AvatarFallback className="text-xs">
                      {assignedUser.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{assignedUser.name}</span>
                </div>
              )}
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button asChild>
            <Link href={`/tasks/${task.id}`}>
              View
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
