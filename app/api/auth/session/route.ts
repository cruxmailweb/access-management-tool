import { NextResponse } from "next/server"
import { getSessionFromCookie } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // const session = await getSessionFromCookie()
  const token = request.cookies.get('session_token')?.value
  const session = token ? await getSessionFromCookie(token) : null

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
  })
}
