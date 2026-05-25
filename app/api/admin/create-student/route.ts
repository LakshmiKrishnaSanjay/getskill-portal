import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const isAllowedRole = (role: string | null | undefined) => {
  return role === 'admin' || role === 'superadmin' || role === 'super admin'
}

export async function POST(request: Request) {
  let createdUserId: string | null = null

  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      )
    }

    const { data: callerData, error: callerError } =
      await supabaseAdmin.auth.getUser(token)

    if (callerError || !callerData.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid session.' },
        { status: 401 }
      )
    }

    const { data: callerProfile, error: callerProfileError } =
      await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('id', callerData.user.id)
        .single()

    if (
      callerProfileError ||
      !callerProfile ||
      !isAllowedRole(callerProfile.role)
    ) {
      return NextResponse.json(
        { error: 'Only Admin and Super Admin can create students.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()

    const fullName = String(formData.get('fullName') || '').trim()
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const cohortId = String(formData.get('cohortId') || '').trim()
    const joiningDate = String(formData.get('joiningDate') || '').trim()
    const status = String(formData.get('status') || 'active').trim()
    const profileImage = formData.get('profileImage') as File | null

    if (!fullName || !email || !password || !cohortId) {
      return NextResponse.json(
        {
          error: 'Full name, email, password, and cohort are required.',
        },
        { status: 400 }
      )
    }

    if (!['pending', 'active', 'suspended', 'graduated'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid student status.' },
        { status: 400 }
      )
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }

    const { data: cohortData, error: cohortError } = await supabaseAdmin
      .from('cohorts')
      .select('id, cohort_code, max_seats, status')
      .eq('id', cohortId)
      .single()

    if (cohortError || !cohortData) {
      return NextResponse.json(
        { error: 'Selected cohort not found.' },
        { status: 400 }
      )
    }

    if (!cohortData.cohort_code) {
      return NextResponse.json(
        { error: 'Selected cohort does not have a batch ID/cohort code.' },
        { status: 400 }
      )
    }

    if (cohortData.status && cohortData.status !== 'active') {
      return NextResponse.json(
        { error: 'Students can only be added to an active cohort.' },
        { status: 400 }
      )
    }

    const { count, error: countError } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('cohort_id', cohortId)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 })
    }

    const enrolledCount = count || 0

    if (cohortData.max_seats && enrolledCount >= cohortData.max_seats) {
      return NextResponse.json(
        { error: 'This cohort is already full. Enrollment is stopped.' },
        { status: 409 }
      )
    }

    const cohortCode = cohortData.cohort_code

    const { data: existingStudents, error: existingStudentsError } =
      await supabaseAdmin
        .from('students')
        .select('student_code')
        .eq('cohort_id', cohortId)
        .like('student_code', `${cohortCode}-ST%`)

    if (existingStudentsError) {
      return NextResponse.json(
        { error: existingStudentsError.message },
        { status: 400 }
      )
    }

    const highestStudentNumber = (existingStudents || []).reduce(
      (highest: number, student: { student_code: string | null }) => {
        const match = student.student_code?.match(/-ST(\d+)$/)
        const currentNumber = match ? Number(match[1]) : 0

        return currentNumber > highest ? currentNumber : highest
      },
      0
    )

    const nextStudentNumber = String(highestStudentNumber + 1).padStart(3, '0')
    const studentCode = `${cohortCode}-ST${nextStudentNumber}`

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'student',
        },
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create student user.' },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    createdUserId = userId

    const defaultProfilePictureUrl = '/avatar.svg'
    let profilePictureUrl: string | null = defaultProfilePictureUrl

    if (profileImage && profileImage.size > 0) {
      if (!profileImage.type.startsWith('image/')) {
        await supabaseAdmin.auth.admin.deleteUser(userId)

        return NextResponse.json(
          { error: 'Please upload a valid image file.' },
          { status: 400 }
        )
      }

      const fileExt = profileImage.name.split('.').pop() || 'jpg'
      const filePath = `${userId}/profile-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('student-profiles')
        .upload(filePath, profileImage, {
          upsert: true,
          contentType: profileImage.type,
        })

      if (uploadError) {
        await supabaseAdmin.auth.admin.deleteUser(userId)

        return NextResponse.json(
          { error: uploadError.message },
          { status: 400 }
        )
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('student-profiles')
        .getPublicUrl(filePath)

      profilePictureUrl = publicUrlData.publicUrl
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        full_name: fullName,
        email,
        role: 'student',
        avatar_url: profilePictureUrl,
      },
      {
        onConflict: 'id',
      }
    )

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    const { error: studentError } = await supabaseAdmin.from('students').insert({
      profile_id: userId,
      cohort_id: cohortId,
      student_code: studentCode,
      phone: phone || null,
      status,
      joining_date: joiningDate || new Date().toISOString().split('T')[0],
      profile_picture_url: profilePictureUrl,
    })

    if (studentError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: studentError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Student created successfully.',
      studentCode,
    })
  } catch {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
    }

    return NextResponse.json(
      { error: 'Something went wrong while creating student.' },
      { status: 500 }
    )
  }
}
