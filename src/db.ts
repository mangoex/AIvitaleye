import sqlite3 from "sqlite3";
import { Pool } from "pg";
import crypto from "crypto";

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

const isPostgres = !!process.env.DATABASE_URL;

// Password hashing helper
export function hashPassword(password: string): string {
  const randomSalt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, randomSalt, 1000, 64, "sha512").toString("hex");
  return `${randomSalt}:${hash}`;
}

// Password verification helper
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  const salt = parts[0];
  const hash = parts[1];
  if (!salt || !hash) return false;
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return checkHash === hash;
}

export async function initDb() {
  if (isPostgres) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    
    // Test connection
    const client = await pgPool.connect();
    client.release();
    console.log("[DB] Connected to PostgreSQL successfully");

    // Create tables
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        age INTEGER,
        gender VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50),
        date VARCHAR(100),
        evaluation_json TEXT,
        report_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    sqliteDb = new sqlite3.Database("./iridology.db", (err) => {
      if (err) {
        console.error("[DB] Error opening SQLite database:", err);
      } else {
        console.log("[DB] Connected to SQLite database successfully");
      }
    });

    // Create tables
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        user_id INTEGER,
        type TEXT,
        date TEXT,
        evaluation_json TEXT,
        report_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  // Seed super admin user
  const adminEmail = "mangoex@gmail.com";
  const existingAdmin = await query("SELECT * FROM users WHERE email = ?", [adminEmail]);
  if (existingAdmin.length === 0) {
    const hashedPassword = hashPassword("531698");
    await query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      [adminEmail, hashedPassword, "admin"]
    );
    console.log("[DB] Seeded super admin user:", adminEmail);
  }
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  if (isPostgres) {
    if (!pgPool) throw new Error("PostgreSQL pool not initialized");
    // Translate placeholders from ? to $1, $2...
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const result = await pgPool.query(pgSql, params);
    return result.rows;
  } else {
    if (!sqliteDb) throw new Error("SQLite database not initialized");
    return new Promise((resolve, reject) => {
      sqliteDb!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
}
