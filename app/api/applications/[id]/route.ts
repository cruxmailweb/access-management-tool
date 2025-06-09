import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie } from "@/lib/auth"
import { query } from "@/lib/db"

// Get application by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const applicationId = params.id

    // Check if user has access to this application
    if (session.user.role !== "admin") {
      const access = await query<any[]>(
        `
        SELECT 1 FROM application_users
        WHERE application_id = ? AND user_id = ?
      `,
        [applicationId, session.user.id],
      )

      if (access.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Get application details
    const applications = await query<any[]>(
      `
      SELECT * FROM applications
      WHERE id = ?
    `,
      [applicationId],
    )

    if (applications.length === 0) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const app = applications[0]

    // Get users for the application
    const users = await query<any[]>(
      `
      SELECT u.id, u.username as name, u.email, au.is_admin as isAdmin
      FROM users u
      JOIN application_users au ON u.id = au.user_id
      WHERE au.application_id = ?
    `,
      [applicationId],
    )

    app.users = users

    // Get reminder for the application
    const reminders = await query<any[]>(
      `
      SELECT * FROM reminders
      WHERE application_id = ? AND is_active = TRUE
      LIMIT 1
    `,
      [applicationId],
    )

    if (reminders.length > 0) {
      const reminder = reminders[0]

      // Get emails for the reminder
      const emails = await query<any[]>(
        `
        SELECT email
        FROM reminder_emails
        WHERE reminder_id = ?
      `,
        [reminder.id],
      )

      app.reminder = {
        id: reminder.id,
        applicationId: app.id,
        applicationName: app.name,
        reminderFrequency: reminder.reminder_frequency,
        nextReminderDate: reminder.next_reminder_date,
        notificationEmails: emails.map((e) => e.email),
        createdAt: reminder.created_at,
        lastSent: reminder.last_sent,
        isActive: reminder.is_active,
      }
    }

    return NextResponse.json(app)
  } catch (error) {
    console.error("Error fetching application:", error)
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 })
  }
}

// Update application
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const applicationId = params.id
    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Application name is required" }, { status: 400 })
    }

    // Update application
    await query(
      `
      UPDATE applications
      SET name = ?, description = ?
      WHERE id = ?
    `,
      [name, description || "", applicationId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating application:", error)
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 })
  }
}

// Delete application
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const applicationId = params.id

    // Delete application (cascade will delete related records)
    await query(
      `
      DELETE FROM applications
      WHERE id = ?
    `,
      [applicationId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting application:", error)
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 })
  }
}
