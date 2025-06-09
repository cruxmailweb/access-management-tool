import mysql from "mysql2/promise"

// Database connection pool
let pool: mysql.Pool

export async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })

    console.log("Database connection pool initialized")
    return pool
  } catch (error) {
    console.error("Failed to initialize database connection:", error)
    throw error
  }
}

export async function getConnection() {
  if (!pool) {
    await initDb()
  }
  return pool
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const connection = await getConnection()
  try {
    const [results] = await connection.execute(sql, params)
    return results as T
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}
