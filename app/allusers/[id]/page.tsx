'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'

type UserProfile = {
  id: string
  full_name: string
  email: string
  role: Role
  avatar_url: string | null
  created_at: string
}

type DetailRecord = Record<string, unknown>

const getRoleLabel = (role: Role) => {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'mentor':
      return 'Mentor'
    case 'student':
      return 'Student'
    case 'placement':
      return 'Placement'
    case 'superadmin':
      return 'Super Admin'
    default:
      return role
  }
}

const formatKey = (key: string) => {
  return key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'Not added'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const userId = String(params.id)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [roleDetails, setRoleDetails] = useState<DetailRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true)
      setError('')

      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace('/login')
        return
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userData.user.id)
        .single()

      if (!currentProfile || currentProfile.role !== 'superadmin') {
        router.replace('/dashboard')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, created_at')
        .eq('id', userId)
        .neq('role', 'superadmin')
        .single()

      if (profileError || !profileData) {
        setError('User not found or access denied.')
        setLoading(false)
        return
      }

      setProfile(profileData as UserProfile)

      if (profileData.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('profile_id', profileData.id)
          .maybeSingle()

        setRoleDetails((studentData || null) as DetailRecord | null)
      } else if (profileData.role === 'mentor') {
        const { data: mentorData } = await supabase
          .from('mentors')
          .select('*')
          .eq('profile_id', profileData.id)
          .maybeSingle()

        setRoleDetails((mentorData || null) as DetailRecord | null)
      } else {
        setRoleDetails(null)
      }

      setLoading(false)
    }

    fetchUserDetails()
  }, [router, userId])

  const profileRows = useMemo(() => {
    if (!profile) return []

    return [
      { label: 'Full Name', value: profile.full_name },
      { label: 'Email', value: profile.email },
      { label: 'Role', value: getRoleLabel(profile.role) },
      {
        label: 'Created Date',
        value: new Date(profile.created_at).toLocaleString(),
      },
      { label: 'Profile ID', value: profile.id },
    ]
  }, [profile])

  const roleDetailRows = useMemo(() => {
    if (!roleDetails) return []

    return Object.entries(roleDetails).map(([key, value]) => ({
      label: formatKey(key),
      value: formatValue(value),
    }))
  }, [roleDetails])

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/allusers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Loading user details...
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (error || !profile) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/allusers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>

          <Card>
            <CardContent>
              <p className="text-sm text-destructive">
                {error || 'User details not found.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/allusers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>

          <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
          <p className="mt-2 text-muted-foreground">
            Full profile dashboard for selected user.
          </p>
        </div>

        <Card>
          <CardContent>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative h-24 w-24 overflow-hidden border border-[#153e90]/35 bg-[#111827]/70">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                    {profile.full_name
                      .split(' ')
                      .map((name) => name[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                <p className="mt-1 text-muted-foreground">{profile.email}</p>

                <div className="mt-4 inline-flex items-center border border-border px-3 py-1.5 text-sm font-medium text-white">
                  {getRoleLabel(profile.role)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden border border-[#153e90]/35 bg-[#111827]/45">
                <div className="grid gap-2 border-b border-[#153e90]/35 bg-[#111827]/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white/70 md:grid-cols-[180px_1fr]">
                  <div>Field</div>
                  <div>Details</div>
                </div>

                <div className="divide-y divide-[#153e90]/20">
                  {profileRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid gap-2 bg-[#111827]/40 px-4 py-3 transition hover:bg-[#153e90]/10 md:grid-cols-[180px_1fr]"
                    >
                      <div className="text-sm font-medium text-white/70">
                        {row.label}
                      </div>
                      <div className="break-all text-sm text-white">
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {profile.role === 'student'
                  ? 'Student Details'
                  : profile.role === 'mentor'
                    ? 'Mentor Details'
                    : 'Role Details'}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {roleDetailRows.length > 0 ? (
                <div className="overflow-hidden border border-[#153e90]/35 bg-[#111827]/45">
                  <div className="grid gap-2 border-b border-[#153e90]/35 bg-[#111827]/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white/70 md:grid-cols-[180px_1fr]">
                    <div>Field</div>
                    <div>Details</div>
                  </div>

                  <div className="divide-y divide-[#153e90]/20">
                    {roleDetailRows.map((row) => (
                      <div
                        key={row.label}
                        className="grid gap-2 bg-[#111827]/40 px-4 py-3 transition hover:bg-[#153e90]/10 md:grid-cols-[180px_1fr]"
                      >
                        <div className="text-sm font-medium text-white/70">
                          {row.label}
                        </div>
                        <div className="break-all text-sm text-white">
                          {row.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-[#153e90]/35 bg-[#111827]/45 p-4 text-sm text-muted-foreground">
                  No additional role details added yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {profile.role === 'placement' && (
          <Card>
            <CardHeader>
              <CardTitle>Placement Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#153e90]/35 bg-[#111827]/45 p-4 text-sm text-muted-foreground">
                This user can review student portfolio and career readiness
                data.
              </div>
            </CardContent>
          </Card>
        )}

        {profile.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#153e90]/35 bg-[#111827]/45 p-4 text-sm text-muted-foreground">
                This user can manage institution operations such as students,
                mentors, cohorts, admissions, attendance, analytics, and payment
                records.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}