'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { useApp } from '@/lib/app-context'
import { getAttendanceRate } from '@/lib/attendance-data'
import { cn } from '@/lib/utils'
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Users,
  Clock,
} from 'lucide-react'
import type { AttendanceStatus } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'late', 'absent']
const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
}
const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'text-green-400 border-green-500/30 bg-green-500/10',
  late:    'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  absent:  'text-red-400 border-red-500/30 bg-red-500/10',
}

export function AttendanceManager() {
  const { currentUser } = useApp()
  const { cohorts, students, sessions, attendanceRecords, bulkMarkAttendance, markAllPresent } = useData()
  const { toast } = useToast()

  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohorts[0]?.id ?? '')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // Cohort sessions
  const cohortSessions = useMemo(
    () => sessions
      .filter(s => s.cohortId === selectedCohortId)
      .sort((a, b) => b.date.localeCompare(a.date)), // most recent first
    [sessions, selectedCohortId],
  )

  // Select first session when cohort changes
  const effectiveSessionId = selectedSessionId || cohortSessions[0]?.id || ''

  // Students in the selected cohort
  const cohortStudents = useMemo(
    () => students.filter(s => s.cohortId === selectedCohortId),
    [students, selectedCohortId],
  )

  // Draft status — initialize from existing records or default to present
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({})

  const getStatus = (studentId: string): AttendanceStatus => {
    if (draftStatuses[studentId]) return draftStatuses[studentId]
    const existing = attendanceRecords.find(
      r => r.sessionId === effectiveSessionId && r.studentId === studentId,
    )
    return existing?.status ?? 'present'
  }

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setDraftStatuses(prev => ({ ...prev, [studentId]: status }))
  }

  const handleMarkAllPresent = () => {
    const allPresent: Record<string, AttendanceStatus> = {}
    cohortStudents.forEach(s => { allPresent[s.id] = 'present' })
    setDraftStatuses(allPresent)
    toast({ title: 'All marked Present', description: 'Save to commit changes.' })
  }

  const handleSave = () => {
    if (!effectiveSessionId) return
    const records = cohortStudents.map(s => ({
      studentId: s.id,
      status: getStatus(s.id),
    }))
    bulkMarkAttendance(effectiveSessionId, selectedCohortId, records, currentUser?.id ?? 'mentor')
    setDraftStatuses({})
    toast({
      title: 'Attendance Saved',
      description: `${records.length} records committed for this session.`,
    })
  }

  // Summary counts
  const counts = useMemo(() => {
    return cohortStudents.reduce(
      (acc, s) => {
        const status = getStatus(s.id)
        acc[status] = (acc[status] ?? 0) + 1
        return acc
      },
      { present: 0, late: 0, absent: 0 } as Record<AttendanceStatus, number>,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortStudents, draftStatuses, effectiveSessionId, attendanceRecords])

  const selectedSession = cohortSessions.find(s => s.id === effectiveSessionId)

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Attendance Manager
            </CardTitle>
            <CardDescription className="mt-1">Mark attendance for offline Kochi classes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllPresent} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Mark All Present
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Selectors */}
        <div className="flex gap-3">
          <Select value={selectedCohortId} onValueChange={v => { setSelectedCohortId(v); setSelectedSessionId(''); setDraftStatuses({}) }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={effectiveSessionId} onValueChange={v => { setSelectedSessionId(v); setDraftStatuses({}) }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {cohortSessions.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title} — {s.date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Session info */}
        {selectedSession && (
          <div className="flex items-center gap-4 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="font-medium text-foreground">{selectedSession.topic}</span>
            <span>·</span>
            <span>{selectedSession.startTime}–{selectedSession.endTime}</span>
            <span>·</span>
            <span>{selectedSession.location}</span>
          </div>
        )}

        {/* Summary counts */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(counts) as [AttendanceStatus, number][]).map(([status, count]) => (
            <div
              key={status}
              className={cn('rounded-lg border px-4 py-3', STATUS_STYLES[status])}
            >
              <p className="text-xs opacity-70 capitalize">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-bold mt-0.5">{count}</p>
            </div>
          ))}
        </div>

        {/* Student list */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider pb-1">
            <Users className="h-3.5 w-3.5" />
            <span>{cohortStudents.length} Students</span>
          </div>

          {cohortStudents.map(student => {
            const status = getStatus(student.id)
            const overallRate = getAttendanceRate(student.id, attendanceRecords)
            const atRisk = overallRate < 75

            return (
              <div
                key={student.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                  atRisk ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border',
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={student.avatar} />
                  <AvatarFallback className="text-xs">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{student.name}</p>
                    {atRisk && (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" title="Below 75% attendance" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Overall: {overallRate}%</p>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(student.id, s)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        status === s
                          ? STATUS_STYLES[s]
                          : 'border-border text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
