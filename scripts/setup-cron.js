#!/usr/bin/env node

/**
 * This script sets up a cron job to check for reminders that need to be sent
 * It should be run on the server during deployment
 */

const fs = require("fs")
const { execSync } = require("child_process")
const path = require("path")

// Path to the reminder check script
const reminderScriptPath = path.join(__dirname, "check-reminders.js")

// Make the script executable
execSync(`chmod +x ${reminderScriptPath}`)

// Create a cron job to run the script every hour
const cronJob = `0 * * * * ${process.env.NODE_ENV === "production" ? "node" : "node"} ${reminderScriptPath} >> /var/log/reminder-cron.log 2>&1\n`

// Add the cron job to the crontab
try {
  // Get existing crontab
  const existingCrontab = execSync("crontab -l").toString()

  // Check if the job already exists
  if (!existingCrontab.includes(reminderScriptPath)) {
    // Write the new crontab
    fs.writeFileSync("/tmp/crontab", existingCrontab + cronJob)
    execSync("crontab /tmp/crontab")
    fs.unlinkSync("/tmp/crontab")

    console.log("Cron job added successfully")
  } else {
    console.log("Cron job already exists")
  }
} catch (error) {
  // If crontab is empty, create a new one
  if (error.message.includes("no crontab")) {
    fs.writeFileSync("/tmp/crontab", cronJob)
    execSync("crontab /tmp/crontab")
    fs.unlinkSync("/tmp/crontab")

    console.log("Cron job added successfully")
  } else {
    console.error("Error setting up cron job:", error)
    process.exit(1)
  }
}
