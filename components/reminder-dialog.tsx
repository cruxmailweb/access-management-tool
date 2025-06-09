"use client"

import { useState, useEffect } from "react"
import { useData } from "@/lib/data-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Plus, Bell, Mail, Calendar, Trash2 } from "lucide-react"

interface Application {
  id: string
  name: string
  description: string
  users: any[]
}

interface ReminderDialogProps {
  application: Application
  onReminderSet: (applicationId: string, reminderData: any) => void
  isReadOnly?: boolean
}

export function ReminderDialog({ application, onReminderSet, isReadOnly = false }: ReminderDialogProps) {
  const { getApplicationReminder, addReminder, updateReminder, deleteReminder } = useData()
  const [open, setOpen] = useState(false)
  const [reminderFrequency, setReminderFrequency] = useState("monthly")
  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sendImmediateEmail, setSendImmediateEmail] = useState(false)
  const [existingReminder, setExistingReminder] = useState<any>(null)

  // Check for existing reminder when dialog opens
  useEffect(() => {
    if (open) {
      const reminder = getApplicationReminder(application.id)
      if (reminder) {
        setExistingReminder(reminder)
        setReminderFrequency(reminder.reminderFrequency)
        setNotificationEmails(reminder.notificationEmails || [])
      } else {
        setExistingReminder(null)
        setReminderFrequency("monthly")
        setNotificationEmails([])
      }
    }
  }, [open, application.id, getApplicationReminder])

  const addEmail = () => {
    if (newEmail.trim() && !notificationEmails.includes(newEmail.trim())) {
      setNotificationEmails([...notificationEmails, newEmail.trim()])
      setNewEmail("")
    }
  }

  const removeEmail = (emailToRemove: string) => {
    setNotificationEmails(notificationEmails.filter((email) => email !== emailToRemove))
  }

  const handleSetReminder = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: application.id,
          applicationName: application.name,
          reminderFrequency,
          notificationEmails,
          sendImmediateEmail,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Add reminder to local storage via context
        const reminderData = addReminder({
          applicationId: application.id,
          applicationName: application.name,
          reminderFrequency,
          nextReminderDate: new Date(result.data.nextReminderDate).getTime(),
          notificationEmails,
          isActive: true,
        })

        // Show success alert
        const emailInfo =
          sendImmediateEmail && notificationEmails.length > 0
            ? `\n📧 Immediate email sent to ${notificationEmails.length} recipient(s)`
            : ""

        alert(
          `✅ Reminder set successfully for "${application.name}"!\n\nFrequency: ${reminderFrequency}\nNext reminder: ${new Date(result.data.nextReminderDate).toLocaleDateString()}${emailInfo}`,
        )

        // Call the callback to update parent component
        onReminderSet(application.id, reminderData)

        // Close dialog and reset form
        setOpen(false)
        resetForm()
      } else {
        alert(`❌ Failed to set reminder for "${application.name}": ${result.error}`)
      }
    } catch (error) {
      console.error("Error setting reminder:", error)
      alert(`❌ Error setting reminder for "${application.name}". Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateReminder = async () => {
    if (!existingReminder) return

    setIsLoading(true)

    try {
      // Update reminder in context
      updateReminder(existingReminder.id, {
        reminderFrequency,
        notificationEmails,
        nextReminderDate: new Date(
          Date.now() +
            (reminderFrequency === "weekly" ? 7 : reminderFrequency === "monthly" ? 30 : 90) * 24 * 60 * 60 * 1000,
        ).getTime(),
      })

      alert(`✅ Reminder updated successfully for "${application.name}"!`)
      setOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error updating reminder:", error)
      alert(`❌ Error updating reminder for "${application.name}". Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReminder = async () => {
    if (!existingReminder) return

    if (confirm(`Are you sure you want to delete the reminder for "${application.name}"?`)) {
      deleteReminder(existingReminder.id)
      alert(`🗑️ Reminder deleted for "${application.name}"`)
      setOpen(false)
      resetForm()
    }
  }

  const handleSendTestEmail = async () => {
    if (notificationEmails.length === 0) {
      alert("Please add at least one email address to send a test email.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/reminders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reminderId: existingReminder?.id || "test",
          applicationName: application.name,
          notificationEmails,
          reminderFrequency,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`📧 Test email sent successfully to ${notificationEmails.length} recipient(s)!`)
      } else {
        alert(`❌ Failed to send test email: ${result.error}`)
      }
    } catch (error) {
      console.error("Error sending test email:", error)
      alert("❌ Error sending test email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setReminderFrequency("monthly")
    setNotificationEmails([])
    setNewEmail("")
    setSendImmediateEmail(false)
    setExistingReminder(null)
  }

  const handleButtonClick = () => {
    console.log("Button clicked for application:", application.name)
    setOpen(true)
  }

  const isEditing = !!existingReminder

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleButtonClick}>
        <Bell className="w-4 h-4 mr-2" />
        {isReadOnly ? "View Reminder" : isEditing ? "Edit Reminder" : "Set Reminder"}
        {isEditing && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Active
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isReadOnly ? "View" : isEditing ? "Edit" : "Set"} Access Review Reminder</DialogTitle>
            <DialogDescription>
              Configure automatic reminders for "{application.name}" access review
              {isEditing && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Next reminder: {new Date(existingReminder.nextReminderDate).toLocaleDateString()}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isReadOnly ? (
              <>
                {/* Reminder Frequency */}
                <div>
                  <Label htmlFor="frequency">Reminder Frequency</Label>
                  <Select value={reminderFrequency} onValueChange={setReminderFrequency} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notification Emails */}
                <div>
                  <Label htmlFor="emails">Notification Emails</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="emails"
                      type="email"
                      placeholder="Enter email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addEmail()}
                      disabled={isReadOnly}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addEmail} disabled={isReadOnly}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Email Tags */}
                  {notificationEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {notificationEmails.map((email) => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          {email}
                          <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Test Email Button */}
                  {notificationEmails.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSendTestEmail}
                      disabled={isLoading || isReadOnly}
                      className="mt-2"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Test Email
                    </Button>
                  )}
                </div>

                {/* Send Immediate Email Option */}
                {!isEditing && notificationEmails.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="immediate-email"
                      checked={sendImmediateEmail}
                      onCheckedChange={setSendImmediateEmail}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="immediate-email" className="text-sm">
                      Send immediate confirmation email
                    </Label>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <Label>Reminder Frequency</Label>
                  <p>{reminderFrequency}</p>
                </div>
                <div>
                  <Label>Notification Emails</Label>
                  {notificationEmails.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {notificationEmails.map((email) => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p>No notification emails set.</p>
                  )}
                </div>
              </>
            )}

            {/* Application Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm">{application.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{application.description}</p>
              <p className="text-xs text-gray-500 mt-1">{application.users.length} users</p>
            </div>

            {/* Action Buttons */}
            {!isReadOnly && (
              <div className="flex justify-between">
                <div>
                  {isEditing && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteReminder} disabled={isLoading}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={isEditing ? handleUpdateReminder : handleSetReminder} disabled={isLoading}>
                    {isLoading ? "Processing..." : isEditing ? "Update Reminder" : "Set Reminder"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
