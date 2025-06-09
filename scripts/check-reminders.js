#!/usr/bin/env node

/**
 * This script checks for reminders that need to be sent
 * It is run by the cron job set up in setup-cron.js
 */

require("dotenv").config()
const mysql = require("mysql2/promise")
const nodemailer = require("nodemailer")

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || "smtp.example.com",
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "user@example.com",
    pass: process.env.EMAIL_PASSWORD || "password",
  },
}

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "access_management",
}

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig)

// Generate email content
function generateReminderEmailContent(applicationName, frequency) {
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

// Send email
async function sendEmail(to, subject, htmlContent, textContent) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "access-management@example.com",
      to,
      subject,
      text: textContent,
      html: htmlContent,
    })
    console.log("Email sent: %s", info.messageId)
  } catch (error) {
    console.error("Error sending email:", error)
  }
}

// Main function to check reminders and send emails
async function checkReminders() {
  const connection = await mysql.createConnection(dbConfig)
  try {
    const [rows] = await connection.execute(
      "SELECT application_name, frequency, email FROM reminders WHERE next_reminder_date <= CURDATE()",
    )
    for (const row of rows) {
      const { application_name, frequency, email } = row
      const { subject, textContent, htmlContent } = generateReminderEmailContent(application_name, frequency)
      await sendEmail(email, subject, htmlContent, textContent)
    }
  } catch (error) {
    console.error("Error executing query:", error)
  } finally {
    await connection.end()
  }
}

// Run the main function
checkReminders()
