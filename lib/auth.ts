import { compare, hash } from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { query } from "./db"

// Types
export interface User {
  id: number
  username: string
  email: string
  role: "admin" | "readonly"
  created_at: string
}

interface Session {
  user: User
  expires: number
}

// Constants
const SECRET_KEY = process.env.JWT_SECRET_KEY || "your-secret-key-change-this-in-production"
const KEY = new TextEncoder().encode(SECRET_KEY)

// Session duration - 8 hours
const SESSION_DURATION = 8 * 60 * 60

// Create a session token
export async function createSessionToken(user: User): Promise<string> {
  // Remove password hash from the user object
  const sessionUser = { ...user }

  const session: Session = {
    user: sessionUser,
    expires: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  }

  const token = await new SignJWT({ session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(KEY)

  return token
}

// Verify session token
export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, KEY, {
      algorithms: ["HS256"],
    })

    return payload.session as Session
  } catch (error) {
    console.error("Failed to verify session token:", error)
    return null
  }
}

// Set session cookie
export function setSessionCookie(token: string) {
  cookies().set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  })
}

// Get session from cookie
export async function getSessionFromCookie(): Promise<Session | null> {
  const token = (await cookies().get("session_token"))?.value
  if (!token) return null

  return verifySessionToken(token)
}

// Clear session cookie
export async function clearSessionCookie() {
  await cookies().delete("session_token")
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

// Authentication middleware
export async function authMiddleware(req: NextRequest) {
  const session = await getSessionFromCookie()

  if (!session || Date.now() / 1000 > session.expires) {
    clearSessionCookie()
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

// Admin middleware
export async function adminMiddleware(req: NextRequest) {
  const session = await getSessionFromCookie()

  if (!session || Date.now() / 1000 > session.expires) {
    clearSessionCookie()
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

// User authentication
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  try {
    const users = await query<any[]>(
      "SELECT id, username, email, password, role, created_at FROM users WHERE username = ?",
      [username],
    )

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const passwordValid = await verifyPassword(password, user.password)

    if (!passwordValid) {
      return null
    }

    // Don't return the password hash
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}
