import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie, hashPassword } from "@/lib/auth"
import { query } from "@/lib/db"

// Get all users
export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const users = await query<any[]>(`
      SELECT id, username, email, role, created_at
      FROM users
      ORDER BY username
    `)

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { username, email, password, role } = await request.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    // Check if username or email already exists
    const existingUsers = await query<any[]>(
      `
      SELECT 1 FROM users
      WHERE username = ? OR email = ?
    `,
      [username, email],
    )

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Insert user
    const result = await query<any>(
      `
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `,
      [username, email, hashedPassword, role || "readonly"],
    )

    return NextResponse.json({
      id: result.insertId,
      username,
      email,
      role: role || "readonly",
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
