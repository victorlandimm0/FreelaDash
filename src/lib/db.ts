import "server-only";

import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

type GlobalWithDb = typeof globalThis & {
  freeladashDb?: DatabaseSync;
};

const defaultDatabasePath = path.join(os.tmpdir(), "FreelaDash", "freeladash.db");
const databasePath = process.env.SQLITE_PATH ?? defaultDatabasePath;
const resolvedPath = path.isAbsolute(databasePath)
  ? databasePath
  : path.join(process.cwd(), databasePath);
const schema = readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");

mkdirSync(path.dirname(resolvedPath), { recursive: true });

function createDatabase() {
  const database = new DatabaseSync(resolvedPath);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(schema);
  const invoiceColumns = database.prepare("PRAGMA table_info(invoices)").all() as { name: string }[];

  if (!invoiceColumns.some((column) => column.name === "project_id")) {
    database.exec("ALTER TABLE invoices ADD COLUMN project_id INTEGER;");
  }

  database.exec("CREATE INDEX IF NOT EXISTS idx_invoices_user_project ON invoices(user_id, project_id);");

  return database;
}

const globalForDb = globalThis as GlobalWithDb;

export const db = globalForDb.freeladashDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.freeladashDb = db;
}

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_url: string | null;
  default_hourly_rate_cents: number;
  created_at: string;
  updated_at: string;
};
