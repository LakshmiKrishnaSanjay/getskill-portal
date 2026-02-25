'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useData } from '@/lib/data-context'
import { useApp } from '@/lib/app-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAttendanceRate, getInternshipEligibility } from '@/lib/attendance-data'
import { cn } from '@/lib/utils'
import { Search, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'

export default function StudentsPage() {
  const { currentRole } = useApp()
  const { students, cohorts, attendanceRecords, submissions } = useData()
  const [search, setSearch] = useState('')
  const [cohortFilter, setCohortFilter] = useState('all')

  const enriched = useMemo(() => {
    return students.map(s => {
      const attendanceRate = getAttendanceRate(s.id, attendanceRecords)
      const graded = submissions.filter(sub => sub.studentId === s.id && sub.grade !== undefined)
      const avgGrade = graded.length > 0
        ? Math.round(graded.reduce((sum, sub) => sum + (sub.grade ?? 0), 0) / graded.length)
        : 0
      const eligibility = getInternshipEligibility(attendanceRate, avgGrade)
      const cohort = cohorts.find(c => c.id === s.cohortId)
      return { ...s, attendanceRate, avgGrade, eligibility, cohortName: cohort?.name ?? '—' }
    })
  }, [students, attendanceRecords, submissions, cohorts])

  const filtered = useMemo(() => {
    return enriched.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      const matchesCohort = cohortFilter === 'all' || s.cohortId === cohortFilter
      return matchesSearch && matchesCohort
    })
  }, [enriched, search, cohortFilter])

  if (currentRole === 'student') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">Students directory is only available to mentors and admins.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">{students.length} students across {cohorts.length} cohorts</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={cohortFilter} onValueChange={setCohortFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cohorts</SelectItem>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="text-2xl font-semibold mt-0.5">{students.length}</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Internship Eligible</p>
            <p className="text-2xl font-semibold text-green-400 mt-0.5">
              {enriched.filter(s => s.eligibility.eligible).length}
            </p>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Below 75% Attendance</p>
            <p className="text-2xl font-semibold text-yellow-400 mt-0.5">
              {enriched.filter(s => s.attendanceRate < 75).length}
            </p>
          </div>
        </div>

        {/* Student list */}
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="col-span-4">Student</span>
            <span className="col-span-2">Cohort</span>
            <span className="col-span-2">Attendance</span>
            <span className="col-span-2">Avg Grade</span>
            <span className="col-span-1">Eligible</span>
            <span className="col-span-1" />
          </div>

          {filtered.map(student => (
            <Link key={student.id} href={`/students/${student.id}`}>
              <div className={cn(
                'grid grid-cols-12 gap-3 items-center rounded-lg border px-3 py-3 hover:bg-accent/30 transition-colors cursor-pointer',
                student.attendanceRate < 75 ? 'border-yellow-500/20' : 'border-border',
              )}>
                {/* Name + avatar */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={student.avatar} />
                    <AvatarFallback className="text-xs">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                </div>

                {/* Cohort */}
                <div className="col-span-2">
                  <Badge variant="secondary" className="text-xs">{student.cohortName}</Badge>
                </div>

                {/* Attendance rate */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    {student.attendanceRate < 75 && (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      student.attendanceRate >= 75 ? 'text-green-400' : 'text-yellow-400',
                    )}>
                      {student.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Avg grade */}
                <div className="col-span-2">
                  <span className="text-sm">{student.avgGrade > 0 ? `${student.avgGrade}%` : '—'}</span>
                </div>

                {/* Eligible */}
                <div className="col-span-1">
                  {student.eligibility.eligible
                    ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                    : <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  }
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-end">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No students found</div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
