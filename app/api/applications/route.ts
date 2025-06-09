import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie } from "@/lib/auth"
import { query } from "@/lib/db"

// Get all applications
export async function GET(request: NextRequest) {
  try {
    //const session = await getSessionFromCookie()

    // if (!session) {
    //  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const token = request.cookies.get('session_token')?.value
    const session = token ? await getSessionFromCookie(token) : null
  
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // If admin, get all applications
    // If readonly, get only applications the user has access to
    let applications

    if (session.user.role === "admin") {
      applications = await query<any[]>(`
        SELECT a.*, 
          (SELECT COUNT(*) FROM application_users WHERE application_id = a.id) as user_count,
          (SELECT COUNT(*) FROM application_users WHERE application_id = a.id AND is_admin = TRUE) as admin_count
        FROM applications a
        ORDER BY a.name
      `)
    } else {
      applications = await query<any[]>(
        `
        SELECT a.*, 
          (SELECT COUNT(*) FROM application_users WHERE application_id = a.id) as user_count,
          (SELECT COUNT(*) FROM application_users WHERE application_id = a.id AND is_admin = TRUE) as admin_count
        FROM applications a
        JOIN application_users au ON a.id = au.application_id
        WHERE au.user_id = ?
        ORDER BY a.name
      `,
        [userId],
      )
    }

    // Get users for each application
    for (const app of applications) {
      const users = await query<any[]>(
        `
        SELECT u.id, u.username as name, u.email, au.is_admin as isAdmin
        FROM users u
        JOIN application_users au ON u.id = au.user_id
        WHERE au.application_id = ?
      `,
        [app.id],
      )

      app.users = users

      // Get reminder for the application
      const reminders = await query<any[]>(
        `
        SELECT r.*, 
          (SELECT COUNT(*) FROM reminder_emails WHERE reminder_id = r.id) as email_count
        FROM reminders r
        WHERE r.application_id = ? AND r.is_active = TRUE
        LIMIT 1
      `,
        [app.id],
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
    }

    return NextResponse.json(applications)
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 })
  }
}

// Create a new application
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Application name is required" }, { status: 400 })
    }

    // Insert application
    const result = await query<any>(
      `
      INSERT INTO applications (name, description)
      VALUES (?, ?)
    `,
      [name, description || ""],
    )

    const applicationId = result.insertId

    // Add current user as admin
    await query(
      `
      INSERT INTO application_users (application_id, user_id, is_admin)
      VALUES (?, ?, TRUE)
    `,
      [applicationId, session.user.id],
    )

    return NextResponse.json({
      id: applicationId,
      name,
      description,
      users: [
        {
          id: session.user.id,
          name: session.user.username,
          email: session.user.email,
          isAdmin: true,
        },
      ],
      created_at: new Date(),
    })
  } catch (error) {
    console.error("Error creating application:", error)
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 })
  }
}
