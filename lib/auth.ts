import { compare, hash } from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { type NextRequest, NextResponse } from "next/server"
import { query } from "./db"

import { updateUserSessionExpiry } from "./db"
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
const SESSION_DURATION = 8 * 60 * 60 // 8 hours

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
export async function setSessionCookie(token: string) {
  console.error("[ROHIT] Set Session Token Inside Start - Line 62 auth.ts", token);

  const { cookies } = await import("next/headers");
  const cookiesInstance = await cookies(); // Await the cookies() call
  cookiesInstance.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
  console.error("[ROHIT] Set Session Token Inside END - Line 73 auth.ts, cookiesInstance=", cookiesInstance);
}

// Get session from cookie
export async function getSessionFromCookie(): Promise<Session | null> {
  const { cookies } = await import("next/headers");
  const cookiesInstance = await cookies();
  const token = cookiesInstance.get("session_token")?.value;
  if (!token) return null
  console.error("[ROHIT] Checking if CookieOne exists- Line 82 auth.ts");
  const token2 = cookiesInstance.get("CookieOne")?.value;
  console.error("[ROHIT] Checking if CookieOne exists- Line 82 auth.ts, token2=", token2);
  
}

// Clear session cookie
export async function clearSessionCookie() {
  const { cookies } = await import("next/headers");
  const cookiesInstance = await cookies();
  cookiesInstance.delete("session_token");
  console.error("[ROHIT] Inside Clear Session - Line 93 auth.ts");

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

 if (!session) {
 return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check if session is expired
  if (Date.now() / 1000 > session.expires) {
    clearSessionCookie()
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Update session expiry time
  session.expires = Math.floor(Date.now() / 1000) + SESSION_DURATION;

  // Update session in database with new expiry time
  await updateUserSessionExpiry(session.user.id, session.expires);

  // Create a new token with the updated session
  const newToken = await createSessionToken(session.user);

  // Set a new cookie with the updated token and maxAge.
  await setSessionCookie(newToken);
  console.error("[ROHIT] Session Token SET from auth.ts Line 124:", newToken)

  return NextResponse.next()
}

// Admin middleware
export async function adminMiddleware(req: NextRequest) {
  const session = await getSessionFromCookie()

 if (!session) {
 return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check if session is expired
  if (Date.now() / 1000 > session.expires) {
    await clearSessionCookie(); // Clear expired session
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Update session expiry time
  session.expires = Math.floor(Date.now() / 1000) + SESSION_DURATION;

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
