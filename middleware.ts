import { type NextRequest, NextResponse } from "next/server"
import { authMiddleware, adminMiddleware } from "./lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ROHIT TESTING BEGINS
  const cookieOne = request.cookies.get('CookieOne');

  // If the cookie doesn't exist, set it
  if (!cookieOne) {
    const response = NextResponse.next();
    response.cookies.set('CookieOne', 'true', {
      path: '/', // Set the cookie for all paths
      maxAge: 60 * 60 * 24 * 365, // Set a long expiration (e.g., 1 year)
    });
    return response;
  }
  // ROHIT TESTING ENDS
  // For getting cookies:
  const token = request.cookies.get('session_token')?.value

  // For deleting cookies:
  const response = NextResponse.next()
  response.cookies.delete('CookieOne')
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
