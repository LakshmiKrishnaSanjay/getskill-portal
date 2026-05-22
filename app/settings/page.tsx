'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { AppShell } from '@/components/app-shell'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { User, Bell, Shield, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/types'

type Profile = {
  id: string
  full_name: string
  email: string
  role: Role
  avatar_url: string | null
}

const addCacheBust = (url: string) => {
  if (!url) return ''
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [taskAssignments, setTaskAssignments] = useState(true)
  const [submissionReviews, setSubmissionReviews] = useState(true)
  const [projectUpdates, setProjectUpdates] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  const [compactView, setCompactView] = useState(false)
  const [animations, setAnimations] = useState(true)

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchSettings = async () => {
    setLoading(true)
    setError('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError('User not logged in.')
      setLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profileData) {
      setError('Profile not found.')
      setLoading(false)
      return
    }

    const currentProfile = profileData as Profile

    setProfile(currentProfile)
    setFullName(currentProfile.full_name)
    setEmail(currentProfile.email)

    // Profile picture is fetched only from profiles.avatar_url
    setAvatarUrl(addCacheBust(currentProfile.avatar_url || ''))

    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
    fetchSettings()
  }, [])

  const initials =
    fullName
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const handleSaveProfile = async () => {
    if (!profile) return

    setSavingProfile(true)
    setMessage('')
    setError('')

    try {
      let uploadedAvatarUrl = avatarUrl.split('?')[0]

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const safeFileName = `avatar-${Date.now()}.${fileExt}`
        const filePath = `${profile.id}/${safeFileName}`

        const bucket = 'profile-avatars'

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: avatarFile.type,
          })

        if (uploadError) {
          setError(uploadError.message)
          setSavingProfile(false)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath)

        uploadedAvatarUrl = publicUrlData.publicUrl
      }

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email,
          avatar_url: uploadedAvatarUrl,
        })
        .eq('id', profile.id)

      if (profileUpdateError) {
        setError(profileUpdateError.message)
        setSavingProfile(false)
        return
      }

      if (email !== profile.email) {
        const { error: authEmailError } = await supabase.auth.updateUser({
          email,
        })

        if (authEmailError) {
          setError(
            'Profile saved, but auth email update failed: ' +
              authEmailError.message
          )
          setSavingProfile(false)
          return
        }
      }

      setAvatarUrl(addCacheBust(uploadedAvatarUrl))
      setAvatarFile(null)
      setMessage('Profile updated successfully.')

      window.dispatchEvent(new Event('profile-updated'))

      await fetchSettings()
    } catch {
      setError('Something went wrong while saving profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    setSavingPassword(true)
    setMessage('')
    setError('')

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.')
      setSavingPassword(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      setSavingPassword(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password should be at least 6 characters.')
      setSavingPassword(false)
      return
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (passwordError) {
      setError(passwordError.message)
      setSavingPassword(false)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setMessage('Password updated successfully.')
    setSavingPassword(false)
  }

  if (loading) {
    return (
      <AppShell>
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading settings...
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {message && (
          <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-500">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>

            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>

            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>

            <TabsTrigger value="appearance">
              <Palette className="mr-2 h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your name, email, and profile picture
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setAvatarFile(file)

                        if (file) {
                          const previewUrl = URL.createObjectURL(file)
                          setAvatarUrl(previewUrl)
                        }
                      }}
                    />

                    <p className="text-xs text-muted-foreground mt-2">
                      Upload JPG, PNG, or WEBP profile image.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={profile?.role || ''} disabled />
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFullName(profile?.full_name || '')
                      setEmail(profile?.email || '')
                      setAvatarFile(null)
                      fetchSettings()
                    }}
                  >
                    Cancel
                  </Button>

                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  These options are UI-only until a preferences table is added.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new tasks are assigned to you
                    </p>
                  </div>
                  <Switch
                    checked={taskAssignments}
                    onCheckedChange={setTaskAssignments}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Submission Reviews</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your submissions are reviewed
                    </p>
                  </div>
                  <Switch
                    checked={submissionReviews}
                    onCheckedChange={setSubmissionReviews}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about project milestones and updates
                    </p>
                  </div>
                  <Switch
                    checked={projectUpdates}
                    onCheckedChange={setProjectUpdates}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of your activity
                    </p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleUpdatePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Customize how the portal looks
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>White Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on white mode for a lighter portal appearance.
                    </p>
                  </div>

                  <Switch
                    checked={mounted ? theme === 'light' : false}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? 'light' : 'dark')
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Display Options</CardTitle>
                <CardDescription>
                  These options are UI-only until a preferences table is added.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact View</Label>
                    <p className="text-sm text-muted-foreground">
                      Show more content in less space
                    </p>
                  </div>
                  <Switch
                    checked={compactView}
                    onCheckedChange={setCompactView}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable smooth transitions and animations
                    </p>
                  </div>
                  <Switch
                    checked={animations}
                    onCheckedChange={setAnimations}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}