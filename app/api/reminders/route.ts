import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromCookie } from "@/lib/auth"
import { query } from "@/lib/db"

// Email service configuration
const EMAIL_SERVICE_CONFIG = {
  // For production, you would use a service like:
  // - SendGrid API key
  // - AWS SES credentials
  // - Nodemailer with SMTP
  // - Resend API key
  // - Mailgun API key
  enabled: false, // Set to true when you configure an email service
  provider: "console", // "sendgrid" | "ses" | "smtp" | "resend" | "console"
}

// Mock email sending function - replace with actual email service
async function sendEmail(to: string[], subject: string, htmlContent: string, textContent: string) {
  if (!EMAIL_SERVICE_CONFIG.enabled) {
    // For development - just log to console
    console.log("📧 EMAIL WOULD BE SENT:")
    console.log("To:", to.join(", "))
    console.log("Subject:", subject)
    console.log("Content:", textContent)
    console.log("---")
    return { success: true, provider: "console" }
  }

  // Example implementation for different providers:
  switch (EMAIL_SERVICE_CONFIG.provider) {
    case "sendgrid":
      // return await sendWithSendGrid(to, subject, htmlContent)
      break
    case "resend":
      // return await sendWithResend(to, subject, htmlContent)
      break
    case "ses":
      // return await sendWithSES(to, subject, htmlContent)
      break
    default:
      console.log("📧 Mock email sent to:", to.join(", "))
      return { success: true, provider: "mock" }
  }
}

// Generate email content
function generateReminderEmailContent(applicationName: string, frequency: string) {
  const subject = `🔔 Access Review Reminder: ${applicationName}`

  const textContent = `
Access Review Reminder

Application: ${applicationName}
Reminder Frequency: ${frequency}
Date: ${new Date().toLocaleDateString()}

This is a scheduled reminder to review user access for the ${applicationName} application.

Please review:
- Current user list and permissions
- Remove any unnecessary access
- Update user roles as needed
- Verify admin permissions

Best regards,
Access Management System
  `.trim()

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        🔔 Access Review Reminder
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #007bff;">Application: ${applicationName}</h3>
        <p><strong>Reminder Frequency:</strong> ${frequency}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p>This is a scheduled reminder to review user access for the <strong>${applicationName}</strong> application.</p>

      <h4>Please review:</h4>
      <ul>
        <li>Current user list and permissions</li>
        <li>Remove any unnecessary access</li>
        <li>Update user roles as needed</li>
        <li>Verify admin permissions</li>
      </ul>

      <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <p style="margin: 0; font-size: 14px; color: #6c757d;">
          This is an automated reminder from the Access Management System.
        </p>
      </div>
    </div>
  `

  return { subject, textContent, htmlContent }
}

// Calculate next reminder date
function calculateNextReminderDate(frequency: string): Date {
  const now = new Date()
  const nextDate = new Date(now)

  switch (frequency) {
    case "weekly":
      nextDate.setDate(now.getDate() + 7)
      break
    case "monthly":
      nextDate.setMonth(now.getMonth() + 1)
      break
    case "quarterly":
      nextDate.setMonth(now.getMonth() + 3)
      break
    default:
      nextDate.setMonth(now.getMonth() + 1) // Default to monthly
  }

  return nextDate
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { applicationId, applicationName, reminderFrequency, notificationEmails, sendImmediateEmail } =
      await request.json()

    if (!applicationId || !applicationName) {
      return NextResponse.json({ error: "Application ID and name are required" }, { status: 400 })
    }

    const frequency = reminderFrequency || "monthly"
    const emails = notificationEmails || []

    // Calculate next reminder date
    const nextReminderDate = calculateNextReminderDate(frequency)

    // Check if reminder already exists for this application
    const existingReminders = await query<any[]>(
      `
      SELECT id FROM reminders
      WHERE application_id = ?
    `,
      [applicationId],
    )

    let reminderId

    if (existingReminders.length > 0) {
      // Update existing reminder
      reminderId = existingReminders[0].id

      await query(
        `
        UPDATE reminders
        SET reminder_frequency = ?, next_reminder_date = ?, is_active = TRUE
        WHERE id = ?
      `,
        [frequency, nextReminderDate, reminderId],
      )

      // Delete existing emails
      await query(
        `
        DELETE FROM reminder_emails
        WHERE reminder_id = ?
      `,
        [reminderId],
      )
    } else {
      // Create new reminder
      const result = await query<any>(
        `
        INSERT INTO reminders (application_id, reminder_frequency, next_reminder_date)
        VALUES (?, ?, ?)
      `,
        [applicationId, frequency, nextReminderDate],
      )

      reminderId = result.insertId
    }

    // Add notification emails
    for (const email of emails) {
      await query(
        `
        INSERT INTO reminder_emails (reminder_id, email)
        VALUES (?, ?)
      `,
        [reminderId, email],
      )
    }

    // Send immediate email if requested
    if (sendImmediateEmail && emails.length > 0) {
      const { subject, textContent, htmlContent } = generateReminderEmailContent(applicationName, frequency)

      try {
        const emailResult = await sendEmail(emails, subject, htmlContent, textContent)
        console.log("📧 Email sent successfully:", emailResult)
      } catch (emailError) {
        console.error("📧 Failed to send email:", emailError)
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reminder set successfully for ${applicationName}`,
      data: {
        id: reminderId,
        applicationId,
        applicationName,
        reminderFrequency: frequency,
        nextReminderDate: nextReminderDate.toISOString(),
        notificationEmails: emails,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error setting reminder:", error)
    return NextResponse.json({ error: "Failed to set reminder" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get("applicationId")

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 })
    }

    // Get reminder for application
    const reminders = await query<any[]>(
      `
      SELECT * FROM reminders
      WHERE application_id = ? AND is_active = TRUE
      LIMIT 1
    `,
      [applicationId],
    )

    if (reminders.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

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

    return NextResponse.json({
      success: true,
      data: {
        id: reminder.id,
        applicationId,
        reminderFrequency: reminder.reminder_frequency,
        nextReminderDate: reminder.next_reminder_date,
        notificationEmails: emails.map((e) => e.email),
        isActive: reminder.is_active,
        createdAt: reminder.created_at,
        lastSent: reminder.last_sent,
      },
    })
  } catch (error) {
    console.error("Error fetching reminder:", error)
    return NextResponse.json({ error: "Failed to fetch reminder" }, { status: 500 })
  }
}

// Send reminder email manually
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { reminderId, applicationName, notificationEmails, reminderFrequency } = await request.json()

    if (!reminderId || !applicationName) {
      return NextResponse.json({ error: "Reminder ID and application name are required" }, { status: 400 })
    }

    if (!notificationEmails || notificationEmails.length === 0) {
      return NextResponse.json({ error: "No notification emails provided" }, { status: 400 })
    }

    const { subject, textContent, htmlContent } = generateReminderEmailContent(applicationName, reminderFrequency)

    const emailResult = await sendEmail(notificationEmails, subject, htmlContent, textContent)

    // Update last_sent timestamp
    await query(
      `
      UPDATE reminders
      SET last_sent = NOW()
      WHERE id = ?
    `,
      [reminderId],
    )

    return NextResponse.json({
      success: true,
      message: `Reminder email sent for ${applicationName}`,
      data: {
        reminderId,
        emailsSent: notificationEmails.length,
        sentAt: new Date().toISOString(),
        emailResult,
      },
    })
  } catch (error) {
    console.error("Error sending reminder email:", error)
    return NextResponse.json({ error: "Failed to send reminder email" }, { status: 500 })
  }
}
