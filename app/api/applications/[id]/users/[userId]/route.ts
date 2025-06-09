import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie } from "@/lib/auth"
import { query } from "@/lib/db"

// Update user role in application
export async function PUT(request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: applicationId, userId } = params
    const { isAdmin } = await request.json()

    // Update user role
    await query(
      `
      UPDATE application_users
      SET is_admin = ?
      WHERE application_id = ? AND user_id = ?
    `,
      [isAdmin ? 1 : 0, applicationId, userId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
  }
}

// Remove user from application
export async function DELETE(request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: applicationId, userId } = params

    // Remove user from application
    await query(
      `
      DELETE FROM application_users
      WHERE application_id = ? AND user_id = ?
    `,
      [applicationId, userId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing user from application:", error)
    return NextResponse.json({ error: "Failed to remove user from application" }, { status: 500 })
  }
}
