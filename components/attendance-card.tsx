'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useData } from '@/lib/data-context'
import { useApp } from '@/lib/app-context'
import {
  getAttendanceRate,
  getAttendanceStreak,
  getInternshipEligibility,
} from '@/lib/attendance-data'
import { cn } from '@/lib/utils'
import {
  QrCode,
  Flame,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AttendanceCardProps {
  /** override studentId; defaults to currentUser */
  studentId?: string
  compact?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500',
  late: 'bg-yellow-500',
  absent: 'bg-red-500',
  none: 'bg-border',
}

export function AttendanceCard({ studentId: propStudentId, compact = false }: AttendanceCardProps) {
  const { currentUser } = useApp()
  const { attendanceRecords, sessions, markAttendance } = useData()
  const { toast } = useToast()

  const studentId = propStudentId ?? currentUser?.id ?? ''

  // Determine cohort from session that has records for this student
  const studentRecords = useMemo(
    () => attendanceRecords.filter(r => r.studentId === studentId),
    [attendanceRecords, studentId],
  )

  const cohortId = studentRecords[0]?.cohortId ?? ''

  // Sessions for this student's cohort, sorted chronologically
  const cohortSessions = useMemo(
    () => sessions
      .filter(s => s.cohortId === cohortId)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [sessions, cohortId],
  )

  // Last 6 sessions for the heatmap
  const heatmapSessions = cohortSessions.slice(-6)

  const attendanceRate = useMemo(
    () => getAttendanceRate(studentId, attendanceRecords),
    [studentId, attendanceRecords],
  )

  const streak = useMemo(
    () => getAttendanceStreak(studentId, attendanceRecords),
    [studentId, attendanceRecords],
  )

  // Last session today's status
  const lastSession = cohortSessions[cohortSessions.length - 1]
  const lastRecord = lastSession
    ? studentRecords.find(r => r.sessionId === lastSession.id)
    : null

  // Eligibility
  const eligibility = getInternshipEligibility(attendanceRate, 75)

  const handleScanQR = () => {
    if (!lastSession) return
    markAttendance(lastSession.id, studentId, cohortId, 'present', 'qr-scan')
    toast({
      title: 'Attendance Marked',
      description: `You have been marked Present for ${lastSession.title}.`,
    })
  }

  const statusLabel = (s: string) =>
    s === 'present' ? 'Present' : s === 'late' ? 'Late' : s === 'absent' ? 'Absent' : 'No Record'

  const statusBadgeVariant = (s: string) =>
    s === 'present' ? 'default' : s === 'late' ? 'secondary' : 'destructive'

  if (compact) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Attendance
            </CardTitle>
            {lastRecord && (
              <Badge variant={statusBadgeVariant(lastRecord.status) as any} className="text-xs">
                {statusLabel(lastRecord.status)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{attendanceRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {streak > 0 ? `${streak}-session streak` : 'No active streak'}
          </p>
          <div className="flex gap-1 mt-3">
            {heatmapSessions.map(s => {
              const rec = studentRecords.find(r => r.sessionId === s.id)
              return (
                <div
                  key={s.id}
                  title={`${s.date} – ${rec ? statusLabel(rec.status) : 'No record'}`}
                  className={cn('h-4 w-4 rounded-sm', STATUS_COLORS[rec?.status ?? 'none'])}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Attendance — Kochi Campus
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleScanQR} className="gap-2">
            <QrCode className="h-4 w-4" />
            Scan QR
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Today's status */}
        {lastSession && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">{lastSession.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{lastSession.topic} · {lastSession.date}</p>
            </div>
            {lastRecord ? (
              <Badge variant={statusBadgeVariant(lastRecord.status) as any}>
                {statusLabel(lastRecord.status)}
              </Badge>
            ) : (
              <Badge variant="secondary">Not Marked</Badge>
            )}
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Rate */}
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className={cn(
              'text-xl font-bold',
              attendanceRate >= 75 ? 'text-green-400' : 'text-red-400',
            )}>
              {attendanceRate}%
            </p>
          </div>

          {/* Streak */}
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Streak</p>
            <div className="flex items-center gap-1">
              <Flame className={cn('h-4 w-4', streak > 0 ? 'text-orange-400' : 'text-muted-foreground')} />
              <p className="text-xl font-bold">{streak}</p>
            </div>
          </div>

          {/* Sessions */}
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Sessions</p>
            <p className="text-xl font-bold">{studentRecords.filter(r => r.status !== 'absent').length}/{studentRecords.length}</p>
          </div>
        </div>

        {/* Heatmap */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Last 6 Sessions</p>
          <div className="flex items-center gap-2">
            {heatmapSessions.map(s => {
              const rec = studentRecords.find(r => r.sessionId === s.id)
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    title={`${s.date} – ${rec ? statusLabel(rec.status) : 'No record'}`}
                    className={cn('h-7 w-7 rounded-md', STATUS_COLORS[rec?.status ?? 'none'])}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(s.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
            {/* Legend */}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-500 inline-block" />Present</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-yellow-500 inline-block" />Late</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-500 inline-block" />Absent</span>
            </div>
          </div>
        </div>

        {/* Eligibility */}
        <div className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3',
          eligibility.attendanceOk
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-yellow-500/20 bg-yellow-500/5',
        )}>
          {eligibility.attendanceOk ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
          )}
          <div>
            <p className={cn('text-sm font-medium', eligibility.attendanceOk ? 'text-green-400' : 'text-yellow-400')}>
              {eligibility.attendanceOk ? 'Attendance eligible for internship & certificate' : 'Below 75% — internship & certificate at risk'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attendance affects internship placement and certificate eligibility. Minimum 75% required.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
