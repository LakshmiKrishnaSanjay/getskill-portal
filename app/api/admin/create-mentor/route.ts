import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  let createdUserId: string | null = null

  try {
    const formData = await request.formData()

    const fullName = formData.get("fullName") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const specialization = formData.get("specialization") as string
    const cohortId = formData.get("cohortId") as string
    const profileImage = formData.get("profileImage") as File | null

    if (!fullName || !email || !password || !cohortId) {
      return NextResponse.json(
        { error: "Full name, email, password, and cohort are required." },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "mentor",
        },
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create mentor user." },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    createdUserId = userId

    let profilePictureUrl: string | null = null

    if (profileImage && profileImage.size > 0) {
      const fileExt = profileImage.name.split(".").pop()
      const filePath = `${userId}/profile.${fileExt}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from("mentor-profiles")
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
        .from("mentor-profiles")
        .getPublicUrl(filePath)

      profilePictureUrl = publicUrlData.publicUrl

      const { error: profileAvatarError } = await supabaseAdmin
        .from("profiles")
        .update({
          avatar_url: profilePictureUrl,
        })
        .eq("id", userId)

      if (profileAvatarError) {
        await supabaseAdmin.auth.admin.deleteUser(userId)

        return NextResponse.json(
          { error: profileAvatarError.message },
          { status: 400 }
        )
      }
    }

    const { data: mentorData, error: mentorError } = await supabaseAdmin
      .from("mentors")
      .insert({
        profile_id: userId,
        specialization: specialization || null,
        profile_picture_url: profilePictureUrl,
        status: "active",
      })
      .select("id")
      .single()

    if (mentorError || !mentorData) {
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: mentorError?.message || "Failed to create mentor row." },
        { status: 400 }
      )
    }

    const { error: assignError } = await supabaseAdmin
      .from("cohort_mentors")
      .insert({
        cohort_id: cohortId,
        mentor_id: mentorData.id,
      })

    if (assignError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: assignError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Mentor created successfully.",
    })
  } catch (error) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
    }

    return NextResponse.json(
      { error: "Something went wrong while creating mentor." },
      { status: 500 }
    )
  }
}