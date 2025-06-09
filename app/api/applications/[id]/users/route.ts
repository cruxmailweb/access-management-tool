import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie } from "@/lib/auth"
import { query } from "@/lib/db"

// Add user to application
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const applicationId = params.id
    const { name, email, isAdmin } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if user exists
    const users = await query<any[]>(
      `
      SELECT id FROM users
      WHERE email = ?
    `,
      [email],
    )

    let userId

    if (users.length === 0) {
      // Create new user with random password (they'll need to reset it)
      const randomPassword = Math.random().toString(36).slice(-8)
      const result: any = await query(
        `
        INSERT INTO users (username, email, password, role)
        VALUES (?, ?, ?, 'readonly')
      `,
        [name, email, randomPassword],
      )

      userId = result.insertId
    } else {
      userId = users[0].id
    }

    // Check if user is already in the application
    const existingUsers = await query<any[]>(
      `
      SELECT 1 FROM application_users
      WHERE application_id = ? AND user_id = ?
    `,
      [applicationId, userId],
    )

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User already has access to this application" }, { status: 400 })
    }

    // Add user to application
    await query(
      `
      INSERT INTO application_users (application_id, user_id, is_admin)
      VALUES (?, ?, ?)
    `,
      [applicationId, userId, isAdmin ? 1 : 0],
    )

    return NextResponse.json({
      id: userId,
      name,
      email,
      isAdmin: !!isAdmin,
    })
  } catch (error) {
    console.error("Error adding user to application:", error)
    return NextResponse.json({ error: "Failed to add user to application" }, { status: 500 })
  }
}
