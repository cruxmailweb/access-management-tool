"use client"

import { useState, useEffect, useCallback } from "react" // Import useCallback
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
  id: string | number; // Allow number as ID from database
  username: string
  email: string
  role: "admin" | "readonly"
  // password: string // Avoid fetching or storing password on frontend
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

  // Function to fetch users from the backend
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Optionally show an alert or other error indicator
    }
  }, []); // fetchUsers does not depend on any external state, so dependencies array is empty


  const isAdmin = currentUser?.role === "admin"

  const addUser = useCallback(async () => {
    // Frontend validation checks
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim() || !confirmPassword.trim()) {
        alert("Please fill out all fields");
        return;
    }

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

    // Frontend check if email already exists (optional, backend provides a more robust check)
    const existingUser = users.find(
      (user) => user.email.toLowerCase() === newEmail.trim().toLowerCase(),
    );

    if (existingUser) {
      alert("A user with this email already exists.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: newUsername.trim(), email: newEmail.trim(), password: newPassword, role: newRole }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add user");
      }

      // Refresh the list after adding a user to get the latest data from the database
      await fetchUsers();

      // Clear form fields and close dialog on success
      setNewUsername("")
      setNewEmail("")
      setNewPassword("")
      setConfirmPassword("")
      setNewRole("readonly")
      setShowAddUser(false); // Close dialog on success


    } catch (error: any) {
      console.error("Error adding user:", error)
      alert(`Error adding user: ${error.message || "Please try again."}`)
       setShowAddUser(false); // Close dialog on error as well
    }
  }, [newUsername, newEmail, newPassword, confirmPassword, newRole, fetchUsers, users]) // Added fetchUsers and users to dependencies

  // Fetch users on component mount and when currentUser changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Depend on fetchUsers


  const deleteUser = useCallback(
    async (userId: string | number) => { // Allow string or number for userId
      if (userId === currentUser?.id) {
        alert("You cannot delete your own account");
        return;
      }
      // Frontend check for admin role (button is also disabled)
      if (currentUser?.role !== "admin") {
        alert("You do not have permission to delete users");
        return;
      }

      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to delete user");
        }
        // Update local state after successful deletion
        setUsers(users.filter((user) => user.id !== userId));
      } catch (error: any) {
        console.error("Error deleting user:", error);
        alert(`Error deleting user: ${error.message || "Please try again."}`);
      }
    },
    [currentUser, users] // Depend on currentUser and users
  );

  const toggleRole = useCallback(
    async (userId: string | number) => { // Allow string or number for userId
      if (userId === currentUser?.id) {
        alert("You cannot change your own role");
        return;
      }

      // Frontend check for admin role (button is also disabled)
      if (currentUser?.role !== "admin") {
        alert("You do not have permission to change user roles");
        return;
      }

      const userToUpdate = users.find(user => user.id === userId);
      if (!userToUpdate) {
        console.error("User not found for role toggle:", userId);
        return;
      }

      const newRoleStatus = userToUpdate.role === "admin" ? "readonly" : "admin";

      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRoleStatus }), // Send the new role
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to update user role");
        }
        // Update local state only after successful API call
        setUsers(prevUsers =>
            prevUsers.map(user =>
                user.id === userId ? { ...user, role: newRoleStatus } : user
            )
        );
      } catch (error: any) {
        console.error("Error updating user role:", error);
        alert(`Error updating user role: ${error.message || "Please try again."}`);
      }
    },
    [currentUser, users] // Depend on currentUser and users
  );


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
                            disabled={user.id === currentUser?.id || !isAdmin} // Disable if not admin
                          >
                            {user.role === "admin" ? "Make Read-only" : "Make Admin"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                            disabled={user.id === currentUser?.id || !isAdmin} // Disable if not admin
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
