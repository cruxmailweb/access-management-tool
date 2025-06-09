"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface User {
  id: number
  username: string
  email: string
  role: "admin" | "readonly"
}

interface AuthContextType {
  currentUser: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session")

        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            setCurrentUser(data.user)
            setIsAuthenticated(true)
          }
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      if (data.success) {
        setCurrentUser(data.user)
        setIsAuthenticated(true)
        return true
      }

      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })

      setCurrentUser(null)
      setIsAuthenticated(false)

      // Redirect to login page
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout error:", error)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
