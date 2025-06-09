"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ArrowLeft, Trash2, Shield, Eye } from "lucide-react"
import Link from "next/link"

interface AppUser {
  id: string
  username: string
  email: string
  role: "admin" | "readonly"
  password: string
  createdAt: string
}

export default function ManageUsers() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState<"admin" | "readonly">("readonly")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    const storedUsers = localStorage.getItem("app-users")
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    }
  }, [])

  const saveUsers = (updatedUsers: AppUser[]) => {
    setUsers(updatedUsers)
    localStorage.setItem("app-users", JSON.stringify(updatedUsers))
  }

  const addUser = () => {
    if (newUsername.trim() && newEmail.trim() && newPassword.trim()) {
      // Validate password confirmation
      if (newPassword !== confirmPassword) {
        alert("Passwords do not match")
        return
      }

      // Validate password length
      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long")
        return
      }

      const newUser: AppUser = {
        id: Date.now().toString(),
        username: newUsername,
        email: newEmail,
        role: newRole,
        password: newPassword, // In production, this should be hashed
        createdAt: new Date().toISOString(),
      }
      saveUsers([...users, newUser])
      setNewUsername("")
      setNewEmail("")
      setNewPassword("")
      setConfirmPassword("")
      setNewRole("readonly")
      setShowAddUser(false)
    }
  }

  const deleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      alert("You cannot delete your own account")
      return
    }
    const updatedUsers = users.filter((user) => user.id !== userId)
    saveUsers(updatedUsers)
  }

  const toggleRole = (userId: string) => {
    if (userId === currentUser?.id) {
      alert("You cannot change your own role")
      return
    }
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, role: user.role === "admin" ? "readonly" : "admin" } : user,
    )
    saveUsers(updatedUsers)
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
                  <p className="text-gray-600 mt-1">Manage application users and their permissions</p>
                </div>
              </div>

              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user account for the application.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Enter username"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUser()
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter email address"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUser()
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter password"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUser()
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUser()
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={newRole} onValueChange={(value: "admin" | "readonly") => setNewRole(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Full Access)</SelectItem>
                            <SelectItem value="readonly">Read-only (View Only)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Role Permissions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Role Permissions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold text-red-600 mb-2">Admin Role</h3>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Add, edit, and delete applications</li>
                              <li>• Manage users for applications</li>
                              <li>• Access visualization features</li>
                              <li>• Manage application users</li>
                              <li>• Full system access</li>
                            </ul>
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-600 mb-2">Read-only Role</h3>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• View applications and their users</li>
                              <li>• Access visualization features</li>
                              <li>• Cannot modify any data</li>
                              <li>• Cannot manage users</li>
                              <li>• View-only access</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddUser(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.preventDefault()
                          console.log("Add User button clicked in Manage Users page")
                          addUser()
                        }}
                      >
                        Add User
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                <Shield className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Read-only Users</CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.role === "readonly").length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Application Users</CardTitle>
              <CardDescription>Manage users who can access this application</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                          {user.role === "admin" ? "Admin" : "Read-only"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRole(user.id)}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.role === "admin" ? "Make Read-only" : "Make Admin"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                            disabled={user.id === currentUser?.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found. Add your first user to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
