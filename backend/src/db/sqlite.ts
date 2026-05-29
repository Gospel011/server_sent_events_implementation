import Database from "better-sqlite3";
import path from "node:path";

export interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  passwordHash: string;
}

const dbFilePath = path.resolve(
  process.cwd(),
  process.env.SQLITE_DB_PATH ?? "auth.sqlite",
);

const db = new Database(dbFilePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const findUserByEmailStmt = db.prepare(`
  SELECT
    id,
    full_name AS fullName,
    email,
    password_hash AS passwordHash
  FROM users
  WHERE email = ?
`);

const createUserStmt = db.prepare(`
  INSERT INTO users (full_name, email, password_hash)
  VALUES (?, ?, ?)
`);

export function findUserByEmail(email: string): UserRecord | undefined {
  return findUserByEmailStmt.get(email) as UserRecord | undefined;
}

export function createUser({
  fullName,
  email,
  passwordHash,
}: {
  fullName: string;
  email: string;
  passwordHash: string;
}) {
  const result = createUserStmt.run(fullName, email, passwordHash);
  return Number(result.lastInsertRowid);
}
