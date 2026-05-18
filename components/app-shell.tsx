'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  FileText,
  Star,
  Briefcase,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Command,
  User,
  LogOut,
  GraduationCap,
  UserCog,
  Shield,
  UserCheck,
  CalendarCheck,
} from 'lucide-react'
import type { Role } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface NavItem {
  title: string
  href: string
  icon: typeof LayoutDashboard
  roles: Role[]
}

type BackendProfile = {
  id: string
  full_name: string
  email: string
  role: Role
  avatar_url: string | null
  profile_picture_url?: string | null
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['student', 'mentor', 'admin'],
  },
  {
    title: 'Attendance',
    href: '/attendance',
    icon: CalendarCheck,
    roles: ['student', 'mentor', 'admin'],
  },
  {
    title: 'Workstreams',
    href: '/workstreams',
    icon: FolderKanban,
    roles: ['student', 'mentor', 'admin'],
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: ListTodo,
    roles: ['student', 'mentor'],
  },
  {
    title: 'Submissions',
    href: '/submissions',
    icon: FileText,
    roles: ['student', 'mentor'],
  },
  {
    title: 'Reviews',
    href: '/reviews',
    icon: Star,
    roles: ['mentor'],
  },
  {
    title: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
    roles: ['student'],
  },
  {
    title: 'Career',
    href: '/career',
    icon: GraduationCap,
    roles: ['student'],
  },
  {
    title: 'Students',
    href: '/students',
    icon: Users,
    roles: ['admin', 'mentor'],
  },
  {
    title: 'Mentors',
    href: '/mentors',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    title: 'Cohorts',
    href: '/cohorts',
    icon: Users,
    roles: ['admin', 'mentor'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin', 'mentor'],
  },
  {
    title: 'Admissions',
    href: '/admissions',
    icon: UserCog,
    roles: ['admin'],
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [, setCommandOpen] = useState(false)
  const [backendProfile, setBackendProfile] = useState<BackendProfile | null>(
    null
  )
  const [imageVersion, setImageVersion] = useState(Date.now())

  const pathname = usePathname()
  const router = useRouter()
  const { notifications } = useData()

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchBackendProfile = async () => {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', userData.user.id)
      .single()

    if (!profileData) {
      return
    }

    let profilePictureUrl = profileData.avatar_url || null

    if (profileData.role === 'mentor') {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('profile_picture_url')
        .eq('profile_id', profileData.id)
        .maybeSingle()

      profilePictureUrl = mentorData?.profile_picture_url || profilePictureUrl
    }

    if (profileData.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('profile_picture_url')
        .eq('profile_id', profileData.id)
        .maybeSingle()

      profilePictureUrl = studentData?.profile_picture_url || profilePictureUrl
    }

    setBackendProfile({
      id: profileData.id,
      full_name: profileData.full_name,
      email: profileData.email,
      role: profileData.role,
      avatar_url: profileData.avatar_url,
      profile_picture_url: profilePictureUrl,
    })
  }

  useEffect(() => {
    fetchBackendProfile()

    const handleProfileUpdated = () => {
      setImageVersion(Date.now())
      fetchBackendProfile()
    }

    window.addEventListener('profile-updated', handleProfileUpdated)

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated)
    }
  }, [])

  const activeRole = backendProfile?.role || 'student'
  const displayName = backendProfile?.full_name || 'User'
  const displayEmail = backendProfile?.email || ''

  const rawDisplayImage = backendProfile?.avatar_url || ''

  const displayImage = rawDisplayImage
    ? `${rawDisplayImage}${rawDisplayImage.includes('?') ? '&' : '?'}v=${imageVersion}`
    : ''

  const displayInitials = displayName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(activeRole)
  )

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="h-4 w-4" />
      case 'mentor':
        return <UserCog className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
    }
  }

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'student':
        return 'Student'
      case 'mentor':
        return 'Mentor'
      case 'admin':
        return 'Admin'
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })

      localStorage.removeItem('getskill-user')
      localStorage.removeItem('getskill-role')

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })

      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('sb-')) {
          sessionStorage.removeItem(key)
        }
      })

      router.replace('/login')
      router.refresh()
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!sidebarCollapsed && (
           <Link href="/dashboard" className="flex items-center">
  <Image
    src="/main-logo.svg"
    alt="Pixel Pluz"
    width={140}
    height={40}
    className="h-8 w-auto object-contain"
    priority
  />
</Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(sidebarCollapsed && 'mx-auto')}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            {/* <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="search"
                placeholder="Search... (⌘K)"
                className="pl-9 pr-4 bg-background"
                onClick={() => setCommandOpen(true)}
                readOnly
              />

              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
                <Command className="h-3 w-3" />K
              </kbd>
            </div> */}
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="gap-2 cursor-default">
              {getRoleIcon(activeRole)}
              <span className="hidden sm:inline">{getRoleLabel(activeRole)}</span>
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent active:bg-accent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:bg-accent">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={displayImage} />
                    <AvatarFallback>{displayInitials || 'U'}</AvatarFallback>
                  </Avatar>

                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {displayEmail}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span>{displayName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {displayEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}