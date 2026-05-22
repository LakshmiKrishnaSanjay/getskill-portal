'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, UserCheck, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Course = {
  id: string
  name: string
  code: string
}

type Mentor = {
  id: string
  mentor_code: string | null
  manual_mentor_code: string | null
  specialization: string | null
  status: string
  date_of_joining: string | null
  profile_picture_url: string | null
  profiles: {
    full_name: string
    email: string
  } | null
  courses: {
    name: string
    code: string
  } | null
}

export default function MentorsPage() {
  const router = useRouter()

  const [mentors, setMentors] = useState<Mentor[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [manualMentorCode, setManualMentorCode] = useState('')
  const [dateOfJoining, setDateOfJoining] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [courseId, setCourseId] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const mutedTextClass = 'text-[#153e90]/70 dark:text-white/60'

  const searchInputClass =
    'w-full border border-[#153e90]/25 bg-white px-4 py-2 pl-9 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 sm:w-72'

  const stateBoxClass =
    'border border-[#153e90]/25 bg-white/70 p-6 text-sm text-[#153e90]/70 dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white/70'

  const modalInputClass =
    'w-full border border-[#153e90]/25 bg-white/80 px-4 py-3 text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30'

  const modalLabelClass =
    'mb-2 block text-sm font-medium text-[#153e90]/70 dark:text-white/70'

  const optionClass =
    'bg-white text-[#153e90] dark:bg-[#111827] dark:text-white'

  const fetchMentors = async () => {
    const { data, error } = await supabase
      .from('mentors')
      .select(`
        id,
        mentor_code,
        manual_mentor_code,
        date_of_joining,
        specialization,
        status,
        profile_picture_url,
        profiles (
          full_name,
          email
        ),
        courses (
          name,
          code
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    setMentors((data || []) as Mentor[])
  }

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setCourses(data || [])

    if (data && data.length > 0) {
      setCourseId(data[0].id)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setPageLoading(true)
      setError('')

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()

      if (
        !currentProfile ||
        !['admin', 'superadmin', 'super admin'].includes(currentProfile.role)
      ) {
        router.replace('/dashboard')
        return
      }

      await Promise.all([fetchMentors(), fetchCourses()])
      setPageLoading(false)
    }

    loadData()
  }, [router])

  const filteredMentors = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return mentors.filter((mentor) => {
      const name = mentor.profiles?.full_name?.toLowerCase() || ''
      const mentorEmail = mentor.profiles?.email?.toLowerCase() || ''
      const mentorCode = mentor.mentor_code?.toLowerCase() || ''
      const manualCode = mentor.manual_mentor_code?.toLowerCase() || ''
      const joiningDate = mentor.date_of_joining?.toLowerCase() || ''
      const mentorSpecialization = mentor.specialization?.toLowerCase() || ''
      const mentorStatus = mentor.status?.toLowerCase() || ''
      const courseName = mentor.courses?.name?.toLowerCase() || ''
      const courseCode = mentor.courses?.code?.toLowerCase() || ''

      return (
        name.includes(keyword) ||
        mentorEmail.includes(keyword) ||
        mentorCode.includes(keyword) ||
        manualCode.includes(keyword) ||
        joiningDate.includes(keyword) ||
        mentorSpecialization.includes(keyword) ||
        mentorStatus.includes(keyword) ||
        courseName.includes(keyword) ||
        courseCode.includes(keyword)
      )
    })
  }, [mentors, search])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('123456')
    setManualMentorCode('')
    setDateOfJoining('')
    setSpecialization('')
    setProfileImage(null)

    if (courses.length > 0) {
      setCourseId(courses[0].id)
    }
  }

  const handleCreateMentor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!courseId) {
      setError('Please select a course.')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()

      formData.append('fullName', fullName)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('manualMentorCode', manualMentorCode)
      formData.append('dateOfJoining', dateOfJoining)
      formData.append('specialization', specialization)
      formData.append('courseId', courseId)

      if (profileImage) {
  formData.append('profileImage', profileImage)
} else {
  const avatarResponse = await fetch('/avatar.svg')
  const avatarBlob = await avatarResponse.blob()

  const avatarFile = new File([avatarBlob], 'avatar.svg', {
    type: 'image/svg+xml',
  })

  formData.append('profileImage', avatarFile)
}

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('Session expired. Please login again.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/create-mentor', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create mentor.')
        return
      }

      setMessage(
        result.mentorCode
          ? `Mentor created successfully. Mentor ID: ${result.mentorCode}`
          : 'Mentor created successfully.'
      )

      resetForm()
      setIsModalOpen(false)

      await fetchMentors()
    } catch {
      setError('Something went wrong while creating mentor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#153e90] dark:text-white">
              Mentors
            </h1>
            <p className={`mt-2 ${mutedTextClass}`}>
              Create mentors, assign courses, and auto-generate mentor IDs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#153e90]/60 dark:text-white/50" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={searchInputClass}
                placeholder="Search mentors..."
              />
            </div>

            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Mentor
            </Button>
          </div>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="border border-[#54e346]/40 bg-[#54e346]/10 px-4 py-3 text-sm text-[#1c7c18] dark:text-[#54e346]">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Total Mentors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {mentors.length}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>Created teachers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Active Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {courses.length}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>
                Available for mentor assignment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Active Mentors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {mentors.filter((mentor) => mentor.status === 'active').length}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>Currently active</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#153e90] dark:text-white">
              <UserCheck className="h-5 w-5" />
              Mentor Directory
            </CardTitle>
          </CardHeader>

          <CardContent>
            {pageLoading ? (
              <div className={stateBoxClass}>Loading mentors...</div>
            ) : filteredMentors.length === 0 ? (
              <div className={stateBoxClass}>No mentors found.</div>
            ) : (
              <div className="overflow-hidden border border-[#153e90]/25 bg-white/75 text-[#153e90] shadow-[0_0_24px_rgba(21,62,144,0.06)] dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white">
                <div className="hidden border-b border-[#153e90]/20 bg-[#153e90] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white/70 md:grid md:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_1fr_0.7fr_0.8fr]">
                  <div>Mentor</div>
                  <div>Email</div>
                  <div>Mentor ID</div>
                  <div>Mentor Code</div>
                  <div>Course</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>

                <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
                  {filteredMentors.map((mentor) => (
                    <div
                      key={mentor.id}
                      className="grid gap-4 bg-white/60 px-5 py-4 text-[#153e90] transition hover:bg-[#153e90]/10 dark:bg-[#111827]/40 dark:text-white dark:hover:bg-[#153e90]/10 md:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_1fr_0.7fr_0.8fr] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden border border-[#153e90]/25 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                          {mentor.profile_picture_url ? (
                            <img
                              src={mentor.profile_picture_url}
                              alt={mentor.profiles?.full_name || 'Mentor'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#153e90] dark:text-white">
                              {(mentor.profiles?.full_name || 'M')
                                .split(' ')
                                .map((name) => name[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#153e90] dark:text-white">
                            {mentor.profiles?.full_name || 'No name'}
                          </p>
                          <p
                            className={`truncate text-xs md:hidden ${mutedTextClass}`}
                          >
                            {mentor.profiles?.email || 'No email'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`hidden min-w-0 truncate text-sm md:block ${mutedTextClass}`}
                      >
                        {mentor.profiles?.email || 'No email'}
                      </div>

                      <div className="text-sm font-semibold text-[#153e90] dark:text-white">
                        {mentor.mentor_code || 'Not generated'}
                      </div>

                      <div className="text-sm font-semibold text-[#153e90] dark:text-white">
                        {mentor.manual_mentor_code || 'Not added'}
                      </div>

                      <div className={`text-sm ${mutedTextClass}`}>
                        {mentor.courses
                          ? `${mentor.courses.name} (${mentor.courses.code})`
                          : 'No course'}
                      </div>

                      <div>
                        <span className="inline-flex border border-[#153e90]/25 bg-white/60 px-2.5 py-1 text-xs font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                          {mentor.status || 'active'}
                        </span>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => router.push(`/mentors/${mentor.id}`)}
                          className="border border-[#153e90]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#153e90] transition hover:bg-[#153e90] hover:text-white dark:border-[#153e90]/60 dark:bg-white/10 dark:text-white dark:hover:bg-[#153e90]/30"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
            <div className="group/card relative isolate w-full max-w-2xl overflow-hidden border border-[#153e90]/25 bg-white p-6 text-[#153e90] shadow-[0_0_80px_rgba(21,62,144,0.18)] backdrop-blur-xl dark:border-[#153e90]/35 dark:bg-[#111827]/95 dark:text-white dark:shadow-[0_0_80px_rgba(21,62,144,0.22)]">
              <span className="pointer-events-none absolute left-0 top-0 z-0 h-4 w-4 border-l-2 border-t-2 border-[#153e90]/80" />
              <span className="pointer-events-none absolute right-0 top-0 z-0 h-4 w-4 border-r-2 border-t-2 border-[#54e346]/80" />
              <span className="pointer-events-none absolute bottom-0 left-0 z-0 h-4 w-4 border-b-2 border-l-2 border-[#153e90]/80" />
              <span className="pointer-events-none absolute bottom-0 right-0 z-0 h-4 w-4 border-b-2 border-r-2 border-[#153e90]/80" />

              <span className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(21,62,144,0.22),transparent_40%),radial-gradient(circle_at_top_right,rgba(21,62,144,0.18),transparent_45%),radial-gradient(circle_at_center,rgba(84,227,70,0.04),transparent_55%)] opacity-100 dark:bg-[radial-gradient(circle_at_top_left,rgba(21,62,144,0.22),transparent_42%),radial-gradient(circle_at_top_right,rgba(84,227,70,0.20),transparent_42%)] dark:opacity-60" />

              <div className="relative z-10">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#153e90] dark:text-white">
                      Create Mentor
                    </h2>
                    <p className={`mt-1 text-sm ${mutedTextClass}`}>
                      Mentor ID will be generated automatically. Mentor Code can
                      be entered manually.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="border border-[#153e90]/25 p-2 text-[#153e90]/70 transition hover:bg-[#153e90]/10 hover:text-[#153e90] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateMentor} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className={modalLabelClass}>Full Name</label>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={modalInputClass}
                        placeholder="Enter mentor name"
                        required
                      />
                    </div>

                    <div>
                      <label className={modalLabelClass}>Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={modalInputClass}
                        placeholder="Enter mentor email"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className={modalLabelClass}>Password</label>
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={modalInputClass}
                        placeholder="Temporary password"
                        required
                      />
                    </div>

                    <div>
                      <label className={modalLabelClass}>Mentor Code</label>
                      <input
                        type="text"
                        value={manualMentorCode}
                        onChange={(e) =>
                          setManualMentorCode(e.target.value.toUpperCase())
                        }
                        className={modalInputClass}
                        placeholder="Example: AJ"
                      />
                    </div>
                  </div>

                  <div>
  <label className={modalLabelClass}>Date of Joining</label>
  <input
    type="date"
    value={dateOfJoining}
    onChange={(e) => setDateOfJoining(e.target.value)}
    className={modalInputClass}
  />
</div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className={modalLabelClass}>Course</label>
                      <select
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        className="w-full border border-[#153e90]/25 bg-white/80 px-4 py-3 text-[#153e90] outline-none focus:border-[#153e90] dark:border-white/10 dark:bg-[#111827] dark:text-white dark:[color-scheme:dark]"
                        required
                      >
                        {courses.length === 0 ? (
                          <option value="" className={optionClass}>
                            No active courses found
                          </option>
                        ) : (
                          courses.map((course) => (
                            <option
                              key={course.id}
                              value={course.id}
                              className={optionClass}
                            >
                              {course.name} ({course.code})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className={modalLabelClass}>Specialization</label>
                      <input
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className={modalInputClass}
                        placeholder="Example: Performance Marketing"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={modalLabelClass}>Profile Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setProfileImage(e.target.files?.[0] || null)
                      }
                      className="w-full border border-[#153e90]/25 bg-white/80 px-4 py-3 text-sm text-[#153e90] file:mr-4 file:border-0 file:bg-[#153e90] file:px-4 file:py-2 file:text-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </Button>

                    <Button type="submit" disabled={loading || courses.length === 0}>
                      {loading ? 'Creating Mentor...' : 'Create Mentor'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}