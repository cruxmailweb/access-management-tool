import { type NextRequest, NextResponse } from "next/server"
import { authMiddleware, adminMiddleware } from "./lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // For getting cookies:
  const token = request.cookies.get('session_token')?.value

  // For deleting cookies:
  const response = NextResponse.next()
  response.cookies.delete('session_token')
  return response

  // Public routes that don't require authentication
  if (pathname === "/login" || pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Admin-only routes
  if (pathname === "/manage-users") {
    return adminMiddleware(request)
  }

  // Protected routes
  return authMiddleware(request)
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
