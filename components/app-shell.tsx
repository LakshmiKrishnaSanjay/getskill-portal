'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/app-context'
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
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import type { Role } from '@/lib/types'

interface NavItem {
  title: string
  href: string
  icon: typeof LayoutDashboard
  roles: Role[]
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
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
    title: 'Cohorts',
    href: '/cohorts',
    icon: Users,
    roles: ['admin'],
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
  const [commandOpen, setCommandOpen] = useState(false)
  const pathname = usePathname()
  const { currentUser, currentRole, setCurrentRole } = useApp()
  const { notifications } = useData()

  const unreadCount = notifications.filter((n) => !n.read).length

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(currentRole)
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Command className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">GetSkill</span>
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

        {/* Navigation */}
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

        {/* Settings */}
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

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          {/* Search */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search... (⌘K)"
                className="pl-9 pr-4 bg-background"
                onClick={() => setCommandOpen(true)}
                readOnly
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Role Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {getRoleIcon(currentRole)}
                  <span className="hidden sm:inline">{getRoleLabel(currentRole)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentRole('student')}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Student View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentRole('mentor')}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Mentor View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentRole('admin')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.slice(0, 5).map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 p-3">
                    <div className="flex items-center gap-2 w-full">
                      <div className={cn('h-2 w-2 rounded-full', !notif.read && 'bg-primary')} />
                      <span className="font-medium text-sm">{notif.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-4">{notif.message}</p>
                  </DropdownMenuItem>
                ))}
                {notifications.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback>
                      {currentUser?.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    {currentUser?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser?.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {currentUser?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
