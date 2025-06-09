"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    if (!isAuthenticated) {
      console.log("User not authenticated, redirecting to login")
      router.push("/login")
      return
    }

    if (requireAdmin && currentUser?.role !== "admin") {
      console.log("Admin access required, redirecting to home")
      router.push("/")
      return
    }
  }, [isAuthenticated, currentUser, requireAdmin, router, isLoading])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated or missing admin access
  if (!isAuthenticated) {
    return null
  }

  if (requireAdmin && currentUser?.role !== "admin") {
    return null
  }

  return <>{children}</>
}
