'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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

type RoleFilter = 'all' | 'admin' | 'mentor' | 'student' | 'placement'

const roleFilters: { label: string; value: RoleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Admins', value: 'admin' },
  { label: 'Mentors', value: 'mentor' },
  { label: 'Students', value: 'student' },
  { label: 'Placement', value: 'placement' },
]

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

export default function AllUsersPage() {
  const router = useRouter()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
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

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, created_at')
        .neq('role', 'superadmin')
        .in('role', ['admin', 'mentor', 'student', 'placement'])
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setUsers((data || []) as UserProfile[])
      setLoading(false)
    }

    fetchUsers()
  }, [router])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = activeFilter === 'all' || user.role === activeFilter
      const searchText = search.toLowerCase().trim()

      const matchesSearch =
        !searchText ||
        user.full_name.toLowerCase().includes(searchText) ||
        user.email.toLowerCase().includes(searchText) ||
        user.role.toLowerCase().includes(searchText)

      return matchesRole && matchesSearch
    })
  }, [users, activeFilter, search])

  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      admin: users.filter((user) => user.role === 'admin').length,
      mentor: users.filter((user) => user.role === 'mentor').length,
      student: users.filter((user) => user.role === 'student').length,
      placement: users.filter((user) => user.role === 'placement').length,
    }
  }, [users])

  const mutedTextClass = 'text-[#153e90]/70 dark:text-white/60'

  const searchClass =
    'w-full border border-[#153e90]/25 bg-white px-4 py-2 text-sm text-[#153e90] outline-none placeholder:text-[#153e90]/40 focus:border-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#153e90] lg:w-72'

  const stateBoxClass =
    'border border-[#153e90]/25 bg-white/70 p-6 text-sm text-[#153e90]/70 dark:border-[#153e90]/35 dark:bg-[#111827]/60 dark:text-white/70'

  return (
    <AppShell>
      <div className="space-y-6 text-[#153e90] dark:text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#153e90] dark:text-white">
            All Users
          </h1>
          <p className={`mt-2 ${mutedTextClass}`}>
            View admins, mentors, students, and placement users.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {roleCounts.all}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>
                Excluding Super Admin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {roleCounts.admin}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>Operations users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Mentors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {roleCounts.mentor}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>Teaching users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {roleCounts.student}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>Learner accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#153e90] dark:text-white">
                Placement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#153e90] dark:text-white">
                {roleCounts.placement}
              </p>
              <p className={`text-sm ${mutedTextClass}`}>Placement users</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#153e90] dark:text-white">
              User Directory
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {roleFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    variant={
                      activeFilter === filter.value ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setActiveFilter(filter.value)}
                    className="gap-2"
                  >
                    {filter.label}
                    <span className="text-xs opacity-75">
                      {roleCounts[filter.value]}
                    </span>
                  </Button>
                ))}
              </div>

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user..."
                className={searchClass}
              />
            </div>

            {loading && <div className={stateBoxClass}>Loading users...</div>}

            {error && (
              <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && filteredUsers.length === 0 && (
              <div className={stateBoxClass}>No users found.</div>
            )}

            {!loading && !error && filteredUsers.length > 0 && (
              <div className="overflow-hidden border border-[#153e90]/25 bg-white/75 text-[#153e90] shadow-[0_0_24px_rgba(21,62,144,0.06)] dark:border-[#153e90]/35 dark:bg-[#111827]/45 dark:text-white">
                <div className="hidden border-b border-[#153e90]/20 bg-[#153e90] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white dark:border-[#153e90]/35 dark:bg-[#111827]/80 dark:text-white/70 md:grid md:grid-cols-[1.6fr_1.7fr_0.9fr_0.9fr_140px]">
                  <div>User</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Created</div>
                  <div className="text-right">Action</div>
                </div>

                <div className="divide-y divide-[#153e90]/15 dark:divide-[#153e90]/20">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="grid gap-4 bg-white/60 px-5 py-4 text-[#153e90] transition hover:bg-[#153e90]/10 dark:bg-[#111827]/40 dark:text-white dark:hover:bg-[#153e90]/10 md:grid-cols-[1.6fr_1.7fr_0.9fr_0.9fr_140px] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-[#153e90]/25 bg-[#153e90]/10 dark:border-white/10 dark:bg-white/10">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.full_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#153e90] dark:text-white">
                              {user.full_name
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
                            {user.full_name}
                          </p>
                          <p className={`truncate text-xs md:hidden ${mutedTextClass}`}>
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className={`hidden min-w-0 truncate text-sm md:block ${mutedTextClass}`}>
                        {user.email}
                      </div>

                      <div>
                        <span className="inline-flex items-center border border-[#153e90]/25 bg-white/60 px-2.5 py-1 text-xs font-medium text-[#153e90] dark:border-white/10 dark:bg-white/10 dark:text-white">
                          {getRoleLabel(user.role)}
                        </span>
                      </div>

                      <div className={`text-sm ${mutedTextClass}`}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>

                      <div className="md:text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/allusers/${user.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}