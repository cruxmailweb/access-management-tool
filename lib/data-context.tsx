"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string | number
  name: string
  email: string
  isAdmin: boolean
}

interface Reminder {
  id: string | number
  applicationId: string | number
  applicationName: string
  reminderFrequency: string
  nextReminderDate: number | string | Date
  notificationEmails: string[]
  createdAt: string
  lastSent?: string
  isActive: boolean
}

interface Application {
  id: string | number
  name: string
  description: string
  users: User[]
  reminder?: Reminder
}

interface DataContextType {
  applications: Application[]
  reminders: Reminder[]
  setApplications: (apps: Application[]) => void
  addApplication: (app: Omit<Application, "id">) => Promise<Application>
  updateApplication: (id: string | number, app: Partial<Application>) => Promise<void>
  deleteApplication: (id: string | number) => Promise<void>
  addReminder: (reminder: Omit<Reminder, "id" | "createdAt">) => Promise<Reminder>
  updateReminder: (id: string | number, updates: Partial<Reminder>) => Promise<void>
  deleteReminder: (id: string | number) => Promise<void>
  getApplicationReminder: (applicationId: string | number) => Reminder | undefined
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [applications, setApplicationsState] = useState<Application[]>([])
  const [reminders, setRemindersState] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch applications and reminders from API
  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Fetch applications
      const response = await fetch("/api/applications")

      if (!response.ok) {
        throw new Error("Failed to fetch applications")
      }

      const data = await response.json()
      setApplicationsState(data)

      // Extract reminders from applications
      const extractedReminders: Reminder[] = []
      data.forEach((app: Application) => {
        if (app.reminder) {
          extractedReminders.push(app.reminder)
        }
      })

      setRemindersState(extractedReminders)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [])

  const setApplications = (apps: Application[]) => {
    setApplicationsState(apps)
  }

  const addApplication = async (app: Omit<Application, "id">): Promise<Application> => {
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: app.name,
          description: app.description,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add application")
      }

      const newApp = await response.json()
      setApplicationsState((prev) => [...prev, newApp])

      return newApp
    } catch (error) {
      console.error("Error adding application:", error)
      throw error
    }
  }

  const updateApplication = async (id: string | number, updates: Partial<Application>): Promise<void> => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update application")
      }

      setApplicationsState((prev) => prev.map((app) => (app.id === id ? { ...app, ...updates } : app)))
    } catch (error) {
      console.error("Error updating application:", error)
      throw error
    }
  }

  const deleteApplication = async (id: string | number): Promise<void> => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete application")
      }

      setApplicationsState((prev) => prev.filter((app) => app.id !== id))
      setRemindersState((prev) => prev.filter((reminder) => reminder.applicationId !== id))
    } catch (error) {
      console.error("Error deleting application:", error)
      throw error
    }
  }

  const addReminder = async (reminderData: Omit<Reminder, "id" | "createdAt">): Promise<Reminder> => {
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reminderData),
      })

      if (!response.ok) {
        throw new Error("Failed to add reminder")
      }

      const data = await response.json()
      const newReminder = data.data

      // Remove any existing reminder for this application
      const filteredReminders = reminders.filter((r) => r.applicationId !== reminderData.applicationId)
      setRemindersState([...filteredReminders, newReminder])

      // Update the application with reminder reference
      setApplicationsState((prev) =>
        prev.map((app) => (app.id === reminderData.applicationId ? { ...app, reminder: newReminder } : app)),
      )

      return newReminder
    } catch (error) {
      console.error("Error adding reminder:", error)
      throw error
    }
  }

  const updateReminder = async (id: string | number, updates: Partial<Reminder>): Promise<void> => {
    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update reminder")
      }

      const updatedReminders = reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, ...updates } : reminder,
      )
      setRemindersState(updatedReminders)

      // Update application reference
      const updatedReminder = updatedReminders.find((r) => r.id === id)
      if (updatedReminder) {
        setApplicationsState((prev) =>
          prev.map((app) => (app.id === updatedReminder.applicationId ? { ...app, reminder: updatedReminder } : app)),
        )
      }
    } catch (error) {
      console.error("Error updating reminder:", error)
      throw error
    }
  }

  const deleteReminder = async (id: string | number): Promise<void> => {
    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete reminder")
      }

      const reminderToDelete = reminders.find((r) => r.id === id)
      setRemindersState((prev) => prev.filter((reminder) => reminder.id !== id))

      // Remove reminder reference from application
      if (reminderToDelete) {
        setApplicationsState((prev) =>
          prev.map((app) => (app.id === reminderToDelete.applicationId ? { ...app, reminder: undefined } : app)),
        )
      }
    } catch (error) {
      console.error("Error deleting reminder:", error)
      throw error
    }
  }

  const getApplicationReminder = (applicationId: string | number): Reminder | undefined => {
    return reminders.find((reminder) => reminder.applicationId === applicationId && reminder.isActive)
  }

  const refreshData = async (): Promise<void> => {
    await fetchData()
  }

  return (
    <DataContext.Provider
      value={{
        applications,
        reminders,
        setApplications,
        addApplication,
        updateApplication,
        deleteApplication,
        addReminder,
        updateReminder,
        deleteReminder,
        getApplicationReminder,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
