'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Save, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  full_name: string
  email: string
  role: 'student' | 'mentor' | 'admin' | 'superadmin' | 'super admin'
  avatar_url: string | null
  created_at: string
}

type Course = {
  id: string
  name: string
  code: string
}

type MentorDetails = {
  id: string
  profile_id: string
  course_id: string | null
  mentor_code: string | null
  manual_mentor_code: string | null
  specialization: string | null
  profile_picture_url: string | null
  status: string | null
  date_of_joining: string | null
  created_at: string | null
  profiles: Profile | null
  courses: Course | null
}

type EditForm = {
  full_name: string
  manual_mentor_code: string
  specialization: string
  status: string
  course_id: string
  date_of_joining: string
}

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'Not added'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

const renderValue = (value: ReactNode | unknown) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in (value as Record<string, unknown>)
  ) {
    return value as ReactNode
  }

  return formatValue(value)
}

export default function MentorDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const mentorId = String(params.id || '')

  const [mentor, setMentor] = useState<MentorDetails | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')

  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '',
    manual_mentor_code: '',
    specialization: '',
    status: 'active',
    course_id: '',
    date_of_joining: '',
  })

  const mutedTextClass = 'text-[#153e90]/70 dark:text-white/60'

  const inputClass =
    'w-full border border-[#153e90]/25 bg-white/80 px-3 py-2 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white dark:placeholder:text-white/30 dark:[color-scheme:dark]'

  const tableWrapperClass =
    'overflow-hidden border border-[#153e90]/25 bg-white/75 text-[#153e90] shadow-[0_0_24px_rgba(21,62,144,0.06)] dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white'

  const tableHeaderClass =
    'grid gap-2 border-b border-[#153e90]/20 bg-[#153e90] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white/70 md:grid-cols-[180px_1fr]'

  const tableRowClass =
    'grid gap-2 bg-white/60 px-4 py-3 text-[#153e90] transition hover:bg-[#153e90]/10 dark:bg-[#111827]/40 dark:text-white dark:hover:bg-[#153e90]/10 md:grid-cols-[180px_1fr]'

  const tableLabelClass =
    'text-sm font-medium text-[#153e90]/70 dark:text-white/70'

  const tableValueClass = 'break-all text-sm text-[#153e90] dark:text-white'

  const infoBoxClass =
    'border border-[#153e90]/25 bg-white/70 p-4 text-sm text-[#153e90]/70 dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white/70'

  const optionClass =
    'bg-white text-[#153e90] dark:bg-[#111827] dark:text-white'

  useEffect(() => {
    const fetchMentorDetails = async () => {
      setLoading(true)
      setError('')

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', userData.user.id)
          .single()

      if (currentProfileError || !currentProfile) {
        router.replace('/login')
        return
      }

      const allowedRoles = ['admin', 'superadmin', 'super admin']

      if (!allowedRoles.includes(currentProfile.role)) {
        router.replace('/dashboard')
        return
      }

      const { data: courseData } = await supabase
        .from('courses')
        .select('id, name, code')
        .order('name', { ascending: true })

      setCourses((courseData || []) as Course[])

      const { data: mentorData, error: mentorError } = await supabase
        .from('mentors')
        .select(
          `
          id,
          profile_id,
          course_id,
          mentor_code,
          manual_mentor_code,
          specialization,
          profile_picture_url,
          status,
          date_of_joining,
          created_at,
          profiles!mentors_profile_id_fkey (
            id,
            full_name,
            email,
            role,
            avatar_url,
            created_at
          ),
          courses (
            id,
            name,
            code
          )
        `
        )
        .eq('id', mentorId)
        .maybeSingle()

      if (mentorError || !mentorData) {
        setError('Mentor not found.')
        setLoading(false)
        return
      }

      const finalMentor = mentorData as unknown as MentorDetails

      setMentor(finalMentor)
      setEditForm({
        full_name: finalMentor.profiles?.full_name || '',
        manual_mentor_code: finalMentor.manual_mentor_code || '',
        specialization: finalMentor.specialization || '',
        status: finalMentor.status || 'active',
        course_id: finalMentor.course_id || '',
        date_of_joining: finalMentor.date_of_joining || '',
      })

      setLoading(false)
    }

    if (mentorId) {
      fetchMentorDetails()
    }
  }, [mentorId, router])

  const handleCancelEdit = () => {
    if (!mentor) return

    setSaveError('')
    setEditMode(false)

    setEditForm({
      full_name: mentor.profiles?.full_name || '',
      manual_mentor_code: mentor.manual_mentor_code || '',
      specialization: mentor.specialization || '',
      status: mentor.status || 'active',
      course_id: mentor.course_id || '',
      date_of_joining: mentor.date_of_joining || '',
    })
  }

  const handleSaveDetails = async () => {
    if (!mentor) return

    setSaving(true)
    setSaveError('')

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name.trim(),
      })
      .eq('id', mentor.profile_id)

    if (profileUpdateError) {
      setSaveError(profileUpdateError.message)
      setSaving(false)
      return
    }

    const { error: mentorUpdateError } = await supabase
      .from('mentors')
      .update({
        manual_mentor_code: editForm.manual_mentor_code.trim().toUpperCase() || null,
        specialization: editForm.specialization.trim() || null,
        status: editForm.status || 'active',
        course_id: editForm.course_id || null,
        date_of_joining: editForm.date_of_joining || null,
      })
      .eq('id', mentor.id)

    if (mentorUpdateError) {
      setSaveError(mentorUpdateError.message)
      setSaving(false)
      return
    }

    const selectedCourse =
      courses.find((course) => course.id === editForm.course_id) || null

    setMentor({
      ...mentor,
      manual_mentor_code: editForm.manual_mentor_code.trim().toUpperCase() || null,
      specialization: editForm.specialization.trim() || null,
      status: editForm.status || 'active',
      course_id: editForm.course_id || null,
      date_of_joining: editForm.date_of_joining || null,
      courses: selectedCourse,
      profiles: mentor.profiles
        ? {
            ...mentor.profiles,
            full_name: editForm.full_name.trim(),
          }
        : mentor.profiles,
    })

    setEditMode(false)
    setSaving(false)
  }

  const profileRows = useMemo(() => {
    if (!mentor) return []

    return [
      {
        label: 'Full Name',
        value: editMode ? (
          <input
            value={editForm.full_name}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                full_name: event.target.value,
              }))
            }
            className={inputClass}
          />
        ) : (
          mentor.profiles?.full_name
        ),
      },
      {
        label: 'Email',
        value: mentor.profiles?.email,
      },
      {
        label: 'Role',
        value: mentor.profiles?.role,
      },
      {
        label: 'Profile Created Date',
        value: mentor.profiles?.created_at
          ? new Date(mentor.profiles.created_at).toLocaleString()
          : null,
      },
    ]
  }, [mentor, editMode, editForm.full_name, inputClass])

  const mentorRows = useMemo(() => {
    if (!mentor) return []

    return [
      {
        label: 'Mentor ID',
        value: mentor.mentor_code,
      },
      {
        label: 'Mentor Code',
        value: editMode ? (
          <input
            value={editForm.manual_mentor_code}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                manual_mentor_code: event.target.value.toUpperCase(),
              }))
            }
            className={inputClass}
            placeholder="Example: AJ"
          />
        ) : (
          mentor.manual_mentor_code
        ),
      },
      {
        label: 'Date of Joining',
        value: editMode ? (
          <input
            type="date"
            value={editForm.date_of_joining}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                date_of_joining: event.target.value,
              }))
            }
            className={inputClass}
          />
        ) : mentor.date_of_joining ? (
          new Date(mentor.date_of_joining).toLocaleDateString()
        ) : null,
      },
      {
        label: 'Specialization',
        value: editMode ? (
          <input
            value={editForm.specialization}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                specialization: event.target.value,
              }))
            }
            className={inputClass}
          />
        ) : (
          mentor.specialization
        ),
      },
      {
        label: 'Course',
        value: editMode ? (
          <select
            value={editForm.course_id}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                course_id: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="" className={optionClass}>
              No course
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id} className={optionClass}>
                {course.name} ({course.code})
              </option>
            ))}
          </select>
        ) : mentor.courses ? (
          `${mentor.courses.name} (${mentor.courses.code})`
        ) : null,
      },
      {
        label: 'Status',
        value: editMode ? (
          <select
            value={editForm.status}
            onChange={(event) =>
              setEditForm((previous) => ({
                ...previous,
                status: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="active" className={optionClass}>
              active
            </option>
            <option value="inactive" className={optionClass}>
              inactive
            </option>
          </select>
        ) : (
          mentor.status || 'active'
        ),
      },
      // {
      //   label: 'Mentor Created Date',
      //   value: mentor.created_at
      //     ? new Date(mentor.created_at).toLocaleString()
      //     : null,
      // },
    ]
  }, [mentor, editMode, editForm, courses, inputClass, optionClass])

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 text-[#153e90] dark:text-white">
          <Button asChild variant="outline" size="sm">
            <Link href="/mentors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Mentors
            </Link>
          </Button>

          <Card>
            <CardContent>
              <p className={`text-sm ${mutedTextClass}`}>
                Loading mentor details...
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (error || !mentor) {
    return (
      <AppShell>
        <div className="space-y-6 text-[#153e90] dark:text-white">
          <Button asChild variant="outline" size="sm">
            <Link href="/mentors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Mentors
            </Link>
          </Button>

          <Card>
            <CardContent>
              <p className="text-sm text-destructive">
                {error || 'Mentor details not found.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/mentors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mentors
              </Link>
            </Button>

            {editMode ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveDetails}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Details'}
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#153e90] dark:text-white">
            Mentor Details
          </h1>
          <p className={`mt-2 ${mutedTextClass}`}>
            Full profile and assigned course information for selected mentor.
          </p>

          {saveError && (
            <div className="mt-4 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </div>
          )}
        </div>

        <Card>
          <CardContent>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="h-24 w-24 shrink-0 overflow-hidden border border-[#153e90]/25 bg-[#153e90]/10 dark:border-[#153e90]/35 dark:bg-[#111827]/70">
                {mentor.profile_picture_url || mentor.profiles?.avatar_url ? (
                  <img
                    src={
                      mentor.profile_picture_url ||
                      mentor.profiles?.avatar_url ||
                      ''
                    }
                    alt={mentor.profiles?.full_name || 'Mentor'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#153e90] dark:text-white">
                    {(mentor.profiles?.full_name || 'M')
                      .split(' ')
                      .map((name) => name[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-[#153e90] dark:text-white">
                  {mentor.profiles?.full_name || 'No name'}
                </h2>

                <p className={`mt-1 ${mutedTextClass}`}>
                  {mentor.profiles?.email || 'No email'}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="inline-flex border border-[#153e90]/25 bg-white/60 px-3 py-1.5 text-sm font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                    {mentor.mentor_code || 'Mentor ID not generated'}
                  </span>

                  <span className="inline-flex border border-[#153e90]/25 bg-white/60 px-3 py-1.5 text-sm font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                    {mentor.manual_mentor_code || 'Mentor Code not added'}
                  </span>

                  <span className="inline-flex border border-[#153e90]/25 bg-white/60 px-3 py-1.5 text-sm font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                    {mentor.status || 'active'}
                  </span>

                  <span className="inline-flex border border-[#153e90]/25 bg-white/60 px-3 py-1.5 text-sm font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                    {mentor.date_of_joining
                      ? new Date(mentor.date_of_joining).toLocaleDateString()
                      : 'Joining date not added'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Profile Information
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className={tableWrapperClass}>
                <div className={tableHeaderClass}>
                  <div>Field</div>
                  <div>Details</div>
                </div>

                <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
                  {profileRows.map((row) => (
                    <div key={row.label} className={tableRowClass}>
                      <div className={tableLabelClass}>{row.label}</div>

                      <div className={tableValueClass}>
                        {renderValue(row.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Mentor Information
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className={tableWrapperClass}>
                <div className={tableHeaderClass}>
                  <div>Field</div>
                  <div>Details</div>
                </div>

                <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
                  {mentorRows.map((row) => (
                    <div key={row.label} className={tableRowClass}>
                      <div className={tableLabelClass}>{row.label}</div>

                      <div className={tableValueClass}>
                        {renderValue(row.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#153e90] dark:text-white">
              Assigned Course
            </CardTitle>
          </CardHeader>

          <CardContent>
            {mentor.courses ? (
              <div className={tableWrapperClass}>
                <div className={tableHeaderClass}>
                  <div>Field</div>
                  <div>Details</div>
                </div>

                <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
                  <div className={tableRowClass}>
                    <div className={tableLabelClass}>Course Name</div>
                    <div className={tableValueClass}>{mentor.courses.name}</div>
                  </div>

                  <div className={tableRowClass}>
                    <div className={tableLabelClass}>Course Code</div>
                    <div className={tableValueClass}>{mentor.courses.code}</div>
                  </div>

                  <div className={tableRowClass}>
                    <div className={tableLabelClass}>Course ID</div>
                    <div className={tableValueClass}>{mentor.courses.id}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={infoBoxClass}>
                No course assigned to this mentor yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}