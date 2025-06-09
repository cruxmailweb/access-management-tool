"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, AlertCircle, CheckCircle2 } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

interface CSVImportExportProps {
  users: User[]
  onImport: (users: Omit<User, "id">[]) => void
  applicationName: string
}

export function CSVImportExport({ users, onImport, applicationName }: CSVImportExportProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Download users as CSV
  const downloadCSV = () => {
    // Create CSV header
    const csvHeader = "Name,Email,IsAdmin\n"

    // Convert users to CSV rows
    const csvRows = users.map(
      (user) => `${user.name.replace(/,/g, "")},${user.email},${user.isAdmin ? "true" : "false"}`,
    )

    // Combine header and rows
    const csvContent = csvHeader + csvRows.join("\n")

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Create a download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${applicationName.replace(/\s+/g, "_")}_users.csv`)

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Clean up
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Handle file selection for import
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    setImportSuccess(null)

    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setImportError("Please upload a valid CSV file")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Read file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const importedUsers = parseCSV(csvText)

        if (importedUsers.length === 0) {
          setImportError("No valid users found in the CSV file")
          return
        }

        onImport(importedUsers)
        setImportSuccess(`Successfully imported ${importedUsers.length} users`)

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ""
      } catch (error) {
        setImportError("Error parsing CSV file. Please check the format.")
        console.error("CSV parse error:", error)
      }
    }

    reader.onerror = () => {
      setImportError("Error reading the file")
    }

    reader.readAsText(file)
  }

  // Parse CSV content to user objects
  const parseCSV = (csvText: string): Omit<User, "id">[] => {
    // Split by lines and remove empty lines
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "")

    if (lines.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row")
    }

    // Get header row and check format
    const header = lines[0].toLowerCase()
    if (!header.includes("name") || !header.includes("email")) {
      throw new Error("CSV header must contain 'name' and 'email' columns")
    }

    // Parse header to find column indices
    const headerCols = header.split(",").map((col) => col.trim().toLowerCase())
    const nameIndex = headerCols.findIndex((col) => col === "name")
    const emailIndex = headerCols.findIndex((col) => col === "email")
    const isAdminIndex = headerCols.findIndex((col) => col === "isadmin" || col === "is admin" || col === "admin")

    if (nameIndex === -1 || emailIndex === -1) {
      throw new Error("Could not find required columns in CSV header")
    }

    // Parse data rows
    const users: Omit<User, "id">[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line === "") continue

      // Handle quoted values with commas inside
      const values: string[] = []
      let inQuotes = false
      let currentValue = ""

      for (let j = 0; j < line.length; j++) {
        const char = line[j]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(currentValue)
          currentValue = ""
        } else {
          currentValue += char
        }
      }

      values.push(currentValue) // Add the last value

      // Extract user data
      const name = values[nameIndex]?.trim().replace(/^"|"$/g, "") || ""
      const email = values[emailIndex]?.trim().replace(/^"|"$/g, "") || ""

      // Validate required fields
      if (!name || !email) continue

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) continue

      // Parse isAdmin value if available
      let isAdmin = false
      if (isAdminIndex !== -1) {
        const adminValue = values[isAdminIndex]?.trim().toLowerCase()
        isAdmin = adminValue === "true" || adminValue === "yes" || adminValue === "1"
      }

      users.push({ name, email, isAdmin })
    }

    return users
  }

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold">Import/Export Users</h3>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Download CSV */}
        <div className="flex-1">
          <Label className="mb-2 block">Export Users</Label>
          <Button variant="outline" onClick={downloadCSV} disabled={users.length === 0} className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
          {users.length === 0 && <p className="text-xs text-gray-500 mt-1">No users to export</p>}
        </div>

        {/* Upload CSV */}
        <div className="flex-1">
          <Label htmlFor="csv-upload" className="mb-2 block">
            Import Users
          </Label>
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-sm"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">CSV must include name and email columns</p>
        </div>
      </div>

      {/* Error message */}
      {importError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {importSuccess && (
        <Alert className="py-2 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{importSuccess}</AlertDescription>
        </Alert>
      )}

      {/* CSV Format Help */}
      <div className="text-xs text-gray-500 mt-2">
        <p className="font-medium">CSV Format:</p>
        <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
          Name,Email,IsAdmin
          <br />
          John Doe,john@example.com,true
          <br />
          Jane Smith,jane@example.com,false
        </pre>
      </div>
    </div>
  )
}
