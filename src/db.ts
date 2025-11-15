import * as SQLite from "expo-sqlite";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Returns a singleton SQLite database instance backed by movies.db.
 */
export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("movies.db");
  }
  return databasePromise;
}

/**
 * Runs a SQL statement that doesn't return rows (CREATE, INSERT, UPDATE, DELETE).
 */
export async function runStatement(
  sql: string,
  params: SQLite.SQLStatementArg[] = [],
) {
  const db = await getDatabase();
  return db.runAsync(sql, params);
}

/**
 * Utility helper for SELECT queries that return rows.
 */
export async function getRows<T = Record<string, unknown>>(
  sql: string,
  params: SQLite.SQLStatementArg[] = [],
) {
  const db = await getDatabase();
  return db.getAllAsync<T>(sql, params);
}
