import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie, hashPassword } from "@/lib/auth"
import { query } from "@/lib/db"

// Update user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const { username, email, password, role } = await request.json()

    // Only admins can update other users or change roles
    if (session.user.role !== "admin" && (session.user.id !== Number.parseInt(userId) || role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Build update query
    let updateQuery = "UPDATE users SET "
    const updateParams = []

    if (username) {
      updateQuery += "username = ?, "
      updateParams.push(username)
    }

    if (email) {
      updateQuery += "email = ?, "
      updateParams.push(email)
    }

    if (password) {
      const hashedPassword = await hashPassword(password)
      updateQuery += "password = ?, "
      updateParams.push(hashedPassword)
    }

    if (role && session.user.role === "admin") {
      updateQuery += "role = ?, "
      updateParams.push(role)
    }

    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2)

    // Add WHERE clause
    updateQuery += " WHERE id = ?"
    updateParams.push(userId)

    // Execute update
    await query(updateQuery, updateParams)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// Delete user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const userId = params.id

    // Prevent deleting self
    if (session.user.id === Number.parseInt(userId)) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Delete user
    await query(
      `
      DELETE FROM users
      WHERE id = ?
    `,
      [userId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
