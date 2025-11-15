import * as SQLite from "expo-sqlite";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const CREATE_MOVIES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS movies(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    watched INTEGER DEFAULT 0,
    rating INTEGER,
    created_at INTEGER
  )
`;

const SAMPLE_MOVIES = [
  { title: "Inception", year: 2010, rating: 5 },
  { title: "Interstellar", year: 2014, rating: 5 },
  { title: "The Prestige", year: 2006, rating: 4 },
] as const;

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

/**
 * Ensures the movies table exists and seeds sample data on first run.
 */
export async function initializeDatabase() {
  const db = await getDatabase();

  await db.runAsync(CREATE_MOVIES_TABLE_SQL);

  const [{ count } = { count: 0 }] = await db.getAllAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM movies",
  );

  if (count > 0) {
    return;
  }

  const now = Date.now();
  for (const movie of SAMPLE_MOVIES) {
    await db.runAsync(
      `INSERT INTO movies (title, year, watched, rating, created_at) VALUES (?, ?, ?, ?, ?)`,
      [movie.title, movie.year, 0, movie.rating ?? null, now],
    );
  }
}
