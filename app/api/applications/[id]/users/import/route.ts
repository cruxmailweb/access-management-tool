import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie, hashPassword } from "@/lib/auth";
import { query } from "@/lib/db"; // Assuming query can be used for simple inserts/selects

// Import users into application
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookie();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const applicationId = params.id;
    const usersToImport = await request.json();

    if (!Array.isArray(usersToImport)) {
      return NextResponse.json(
        { error: "Request body should be an array of users" },
        { status: 400 }
      );
    }

    // Note: For robust import with atomicity, a proper database transaction
    // mechanism should be implemented here if the 'query' function doesn't
    // implicitly handle it for multiple queries.

    for (const userData of usersToImport) {
      const { name, email } = userData;

      if (!name || !email) {
        console.warn(`Skipping user with missing name or email: ${JSON.stringify(userData)}`);
        continue; // Skip users with incomplete data
      }

      // Check if user exists in the users table
      const existingUsers = await query<any[]>(
        `
        SELECT id FROM users
        WHERE email = ?
      `,
        [email]
      );

      let userId;

      if (existingUsers.length === 0) {
        // Create new user if they don't exist
        // In a real application, you might want a more secure temporary password flow
        const randomPassword = Math.random().toString(36).slice(-8);
        const result: any = await query(
          `
          INSERT INTO users (username, email, password, role)
          VALUES (?, ?, ?, 'readonly')
        `,
          [name, email, randomPassword]
        );
        userId = result.insertId;
      } else {
        userId = existingUsers[0].id;
      }

      // Check if user is already in the application
      const existingApplicationUsers = await query<any[]>(
        `
        SELECT 1 FROM application_users
        WHERE application_id = ? AND user_id = ?
      `,
        [applicationId, userId]
      );

      if (existingApplicationUsers.length === 0) {
        // Add user to application if not already associated
        await query(
          `
          INSERT INTO application_users (application_id, user_id, is_admin)
          VALUES (?, ?, FALSE)
        `,
          [applicationId, userId]
        );
      }
      // If user already exists in the application, we just skip adding them again
    }

    // You might want to fetch the updated list of users for this application
    // and return it here, or just return a success message.
    // For simplicity, we'll return a success message and the frontend will
    // likely refetch the data.

    return NextResponse.json({
      message: "Users imported successfully",
    });
  } catch (error) {
    console.error("Error importing users:", error);
    return NextResponse.json(
      { error: "Failed to import users" },
      { status: 500 }
    );
  }
}