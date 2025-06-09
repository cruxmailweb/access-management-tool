"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useData } from "@/lib/data-context"
import { ProtectedRoute } from "@/components/protected-route"
import { ReminderDialog } from "@/components/reminder-dialog"
import { CSVImportExport } from "@/components/csv-import-export"
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
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Users, Trash2, BarChart3, LogOut, UserCog, Grid, List, Bell, Calendar, Settings } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Application } from "@/lib/types" // Assuming you have a type definition for Application

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  application_users_id?: number; // Add this to store the application_users id
}

export default function AccessManagement() {
  const { currentUser, logout } = useAuth()
  const { applications, setApplications, getApplicationReminder, refreshData } = useData()
  // Removed duplicate useState declaration for applications and setApplications
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [showAddApp, setShowAddApp] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [newAppName, setNewAppName] = useState("")
  const [newAppDescription, setNewAppDescription] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [showAppSettings, setShowAppSettings] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [editAppName, setEditAppName] = useState("")
  const [editAppDescription, setEditAppDescription] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)

  // Fetch applications on component mount (This is now handled by the useData hook's useEffect)
  // useEffect(() => {
  //   const fetchApplications = async () => {
  //     const res = await fetch('/api/applications');
  //     const data = await res.json();
  //     setApplications(data);
  //   };
  //   fetchApplications();
  // }, []);


  const isAdmin = currentUser?.role === "admin"

  const addApplication = async () => {
    if (!newAppName.trim()) {
      alert("Application name is required");
      return;
    }

    try {
      const newApp = await addApplication({ name: newAppName.trim(), description: newAppDescription.trim() });
      // The setApplications and setShowAddApp is handled within the addApplication function in useData
      clearAddUserForm(); // Clear the add application form
    } catch (error) {
      console.error("Error adding application:", error);
      alert("Error adding application. Please try again.");
    }
  };


  const addUser = async () => {
      // Removed stray console.error and alert

    if (!selectedApp) {
      console.error("No selected app for adding user.");
      alert("Error: No application selected.");
      return;
    }

    if (!newUserName.trim()) {
      alert("Please enter a user name");
      return;
    }

    if (!newUserEmail.trim()) {
      alert("Please enter a user email");
      return;
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUserEmail.trim())) {
      alert("Please enter a valid email address");
      return;
    }

    // Check if user already exists in the selected application (This check might need to be done on the backend for accuracy)
    const existingUser = selectedApp.users.find(
      (user: User) => user.email.toLowerCase() === newUserEmail.trim().toLowerCase(),
    );

    if (existingUser) {
      alert("A user with this email already exists in this application");
      return;
    }


    try {
      const response = await fetch(`/api/applications/${selectedApp.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newUserName.trim(), email: newUserEmail.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user to application');
      }

      // Assuming the backend returns the updated application with the new user
      const updatedApp = await response.json();
      // Instead of directly updating selectedApp, refresh all data to ensure consistency
      await refreshData(); // Assuming refreshData fetches applications with their users
      clearAddUserForm(); // Use a helper function to clear form

    } catch (error) {
      console.error("Error adding user:", error)
      alert("Error adding user. Please try again.")
    }
  }

  // Function to remove a user from the selected application
  const removeUser = async (userId: string) => {
    if (!selectedApp || !selectedApp.id) {
      console.error("No application selected or selected application has no ID for removing user.");
      alert("Error: No application selected.");
      return;
    }

    try {
      const response = await fetch(`/api/applications/${selectedApp.id}/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user from application');
      }

      // Refetch application data to update the state after deletion
      await refreshData(); // Assuming refreshData fetches applications with their users

    } catch (error) {
      console.error("Error removing user:", error);
      alert("Error removing user. Please try again.");
    }
  };

  const openUserManagement = (app: any) => {
    setSelectedApp(app)
    setShowUserManagement(true)
  }

  // Helper function to update applications state after API calls
  const updateApplicationsState = (updatedApp: Application) => {
      setApplications(prevApps =>
          prevApps.map(app => (app.id === updatedApp.id ? updatedApp : app))
      );
      setSelectedApp(updatedApp);
  };

  // Helper function to clear the add user form
  const clearAddUserForm = () => {
    setNewUserName("");
    setNewUserEmail("");
  }

  const handleReminderSet = (applicationId: string, reminderData: any) => {
    console.log("Reminder set for application:", applicationId, reminderData)
    // The reminder is already saved in the context via the ReminderDialog component
    // This callback is mainly for UI updates if needed
  }

  const getReminderStatus = (app: any) => {
    const reminder = getApplicationReminder(app.id)
    if (!reminder) return null

    const nextDate = new Date(reminder.nextReminderDate)
    const isOverdue = nextDate < new Date()

    return {
      reminder,
      nextDate,
      isOverdue,
      frequency: reminder.reminderFrequency,
      emailCount: reminder.notificationEmails?.length || 0,
    }
  }

  const openAppSettings = (app: any) => {
    setEditingApp(app)
    setEditAppName(app.name)
    setEditAppDescription(app.description)
    setShowAppSettings(true)
  }

  const updateApplication = async () => {
    if (editingApp && editAppName.trim()) {
      try {
        const res = await fetch(`/api/applications/${editingApp.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: editAppName, description: editAppDescription }),
        });

        if (!res.ok) {
          throw new Error('Failed to update application');
        }

        // Instead of directly updating local state, refresh data from backend
        await refreshData(); // Assuming refreshData updates the applications state
        setShowAppSettings(false);

      } catch (error) {
        console.error('Error updating application:', error);
        alert('Error updating application. Please try again.');
      }
    } else {
        alert('Application name is required.');
    }

  }

  const deleteApplication = async () => {
    if (editingApp) {
      try {
        const res = await fetch(`/api/applications/${editingApp.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Failed to delete application');
        }

        // Instead of directly updating local state, refresh data from backend
        await refreshData(); // Assuming refreshData updates the applications state
        setShowDeleteConfirm(false);
        setShowAppSettings(false);

      } catch (error) {
        console.error('Error deleting application:', error);
        alert('Error deleting application. Please try again.');
      }
    }
  }

  // Handle CSV import
  const handleImportUsers = async (importedUsers: Omit<User, "id">[]) => {
    if (!selectedApp || !selectedApp.id) {
      console.error("No application selected for importing users.");
      alert("Error: No application selected.");
      return;
    }

    // Basic validation for imported users
    if (!importedUsers || importedUsers.length === 0) {
        alert("No users to import.");
        return;
    }

    try {
      const response = await fetch(`/api/applications/${selectedApp.id}/users/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importedUsers),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import users');
      }

      // Refetch application data to update the state with imported users
      await refreshData(); // Assuming refreshData fetches applications with their users
      alert('Users imported successfully!');

    } catch (error) {
      console.error("Error importing users:", error);
      alert("Error importing users. Please check the CSV format and try again.");
    }
  };


  // Helper function to toggle admin status (needs backend implementation)
  const toggleAdmin = async (userId: string) => {
      if (!selectedApp || !selectedApp.id) {
          console.error("No application selected for toggling admin status.");
          alert("Error: No application selected.");
          return;
      }

      // Find the user in the selected application
      const userToToggle = selectedApp.users.find(user => user.id === userId);
      if (!userToToggle) {
          console.error("User not found in selected application:", userId);
          alert("Error: User not found.");
          return;
      }

      const newAdminStatus = !userToToggle.isAdmin;

      try {
          const response = await fetch(`/api/applications/${selectedApp.id}/users/${userId}`, {
              method: 'PUT', // Assuming PUT is used for updating user within application
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ isAdmin: newAdminStatus }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to toggle admin status');
          }

          // Refetch application data to update the state
          await refreshData(); // Assuming refreshData fetches applications with their users

      } catch (error) {
          console.error("Error toggling admin status:", error);
          alert("Error toggling admin status. Please try again.");
      }
  };


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
                <p className="text-gray-600 mt-1">
                  Welcome back, {currentUser?.username} ({currentUser?.role})
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link href="/manage-users">
                    <Button variant="outline" size="sm">
                      <UserCog className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                  </Link>
                )}

                <Link href="/visualization">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Visualize Data
                  </Button>
                </Link>

                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>

            {isAdmin && (
              <Dialog open={showAddApp} onOpenChange={setShowAddApp}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Application
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Application</DialogTitle>
                    <DialogDescription>Create a new application to manage user access.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="app-name">Application Name</Label>
                      <Input
                        id="app-name"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        placeholder="Enter application name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="app-description">Description</Label>
                      <Input
                        id="app-description"
                        value={newAppDescription}
                        onChange={(e) => setNewAppDescription(e.target.value)}
                        placeholder="Enter application description"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddApp(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addApplication}>Add Application</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Applications Display */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app) => {
                const reminderStatus = getReminderStatus(app)

                return (
                  <Card key={app.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => openUserManagement(app)}>
                          <CardTitle className="text-lg hover:text-blue-600 transition-colors cursor-pointer">
                            {app.name}
                            {reminderStatus && (
                              <Badge
                                variant={reminderStatus.isOverdue ? "destructive" : "secondary"}
                                className="ml-2 text-xs"
                              >
                                <Bell className="w-3 h-3 mr-1" />
                                {reminderStatus.frequency}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-2">{app.description}</CardDescription>
                          {reminderStatus && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Next: {reminderStatus.nextDate.toLocaleDateString()}
                              {reminderStatus.emailCount > 0 && (
                                <span className="ml-2">📧 {reminderStatus.emailCount}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto hover:bg-transparent"
                            onClick={() => openAppSettings(app)}
                          >
                            <Settings className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{app.users.length} users</span>
                        </div>
                        <div className="flex gap-1">
                          {app.users.filter((user: User) => user.isAdmin).length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {app.users.filter((user: User) => user.isAdmin).length} admin
                              {app.users.filter((user: User) => user.isAdmin).length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Reminder Button */}
                      <div className="w-full">
                        <ReminderDialog application={app} onReminderSet={handleReminderSet} isReadOnly={!isAdmin} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>All applications and their user counts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Total Users</TableHead>
                      <TableHead>Admins</TableHead>
                      <TableHead>Reminder Status</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Reminders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => {
                      const reminderStatus = getReminderStatus(app)

                      return (
                        <TableRow key={app.id}>
                          <TableCell
                            className={`font-medium ${isAdmin ? "cursor-pointer hover:text-blue-600 hover:underline" : ""}`}
                            onClick={() => openUserManagement(app)}
                          >
                            {app.name}
                          </TableCell>
                          <TableCell
                            className={isAdmin ? "cursor-pointer hover:text-blue-600" : ""}
                            onClick={() => openUserManagement(app)}
                          >
                            {app.description}
                          </TableCell>
                          <TableCell className="text-center">{app.users.length}</TableCell>
                          <TableCell>{app.users.filter((user: User) => user.isAdmin).length}</TableCell>
                          <TableCell>
                            {reminderStatus ? (
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant={reminderStatus.isOverdue ? "destructive" : "secondary"}
                                  className="text-xs w-fit"
                                >
                                  {reminderStatus.frequency}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {reminderStatus.nextDate.toLocaleDateString()}
                                </span>
                                {reminderStatus.emailCount > 0 && (
                                  <span className="text-xs text-gray-500">📧 {reminderStatus.emailCount} emails</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No reminder</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdmin && (
                              <Button variant="outline" size="sm" onClick={() => openUserManagement(app)}>
                                Manage Users
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <ReminderDialog application={app} onReminderSet={handleReminderSet} isReadOnly={!isAdmin} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* User Management Dialog */}
          <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Manage Users - {selectedApp?.name} {isAdmin ? "" : "(View Only)"}
                </DialogTitle>
                <DialogDescription>
                  {isAdmin
                    ? "Add users and manage their access permissions for this application."
                    : "View users and their access permissions for this application."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* CSV Import/Export (conditionally rendered) */}
                {selectedApp && isAdmin && showImportExport && (
                  <CSVImportExport
                    users={selectedApp.users}
                    onImport={handleImportUsers}
                    applicationName={selectedApp.name}
                  />
                )}

                {/* Add User Form */}
                {isAdmin && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Add New User</h3>
                      <Button variant="outline" size="sm" onClick={() => setShowImportExport(!showImportExport)}>
                        {showImportExport ? "Hide Import/Export" : "Show Import/Export"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="user-name">Name</Label>
                        <Input
                          id="user-name"
                          value={newUserName}
                          onChange={(e) => {
                            console.log("Name changed:", e.target.value)
                            setNewUserName(e.target.value)
                          }}
                          placeholder="Enter user name"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUser()
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                          id="user-email"
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => {
                            console.log("Email changed:", e.target.value)
                            setNewUserEmail(e.target.value)
                          }}
                          placeholder="Enter user email"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addUser()
                            }
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        console.log("Add User button clicked")
                        addUser()
                      }}
                      className="mt-3"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Users List */}
                <div>
                  <h3 className="font-semibold mb-3">Current Users ({selectedApp?.users.length || 0})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedApp?.users.map((user: User) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                        <div className="flex-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <Button
                              variant={user.isAdmin ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleAdmin(user.id)}
                            >
                              {user.isAdmin ? "Admin" : "Make Admin"}
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUser(user.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!selectedApp?.users || selectedApp.users.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No users added yet. Add your first user above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* Application Settings Dialog */}
        {isAdmin && (
          <Dialog open={showAppSettings} onOpenChange={setShowAppSettings}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Application Settings</DialogTitle>
                <DialogDescription>Edit application details or remove the application.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-app-name">Application Name</Label>
                  <Input
                    id="edit-app-name"
                    value={editAppName}
                    onChange={(e) => setEditAppName(e.target.value)}
                    placeholder="Enter application name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-app-description">Description</Label>
                  <Input
                    id="edit-app-description"
                    value={editAppDescription}
                    onChange={(e) => setEditAppDescription(e.target.value)}
                    placeholder="Enter application description"
                  />
                </div>
                <div className="flex justify-between">
                  <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Application
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAppSettings(false)}>
                      Cancel
                    </Button>
                    <Button onClick={updateApplication}>Save Changes</Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the application "{editingApp?.name}" and remove all associated user access
                records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteApplication} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}
