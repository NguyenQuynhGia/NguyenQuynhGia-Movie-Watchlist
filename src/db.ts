import * as SQLite from "expo-sqlite";

export type WatchedFlag = 0 | 1;

export type MovieRecord = {
  id: number;
  title: string;
  year: number | null;
  watched: WatchedFlag;
  rating: number | null;
  created_at: number;
};

const DATABASE_NAME = "movies.db";

const SAMPLE_MOVIES: Array<{ title: string; year?: number; rating?: number }> =
  [
    { title: "Inception", year: 2010, rating: 5 },
    { title: "Interstellar", year: 2014, rating: 5 },
    { title: "The Prestige", year: 2006, rating: 4 },
  ];

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  // Web không hỗ trợ tốt sync API nên dùng bản async và cache Promise lại để gọi 1 lần.
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();

  // Tạo bảng và bật WAL để cải thiện tốc độ ghi/đọc cơ bản cho app nhỏ.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      year INTEGER,
      watched INTEGER DEFAULT 0,
      rating INTEGER,
      created_at INTEGER
    );
  `);

  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM movies",
  );

  // Seed dữ liệu mẫu duy nhất khi bảng đang trống giúp demo nhanh.
  if (!existing || existing.count === 0) {
    const now = Date.now();
    await db.withTransactionAsync(async () => {
      for (const [index, movie] of SAMPLE_MOVIES.entries()) {
        await db.runAsync(
          "INSERT INTO movies (title, year, watched, rating, created_at) VALUES (?, ?, 0, ?, ?)",
          movie.title,
          movie.year ?? null,
          movie.rating ?? null,
          now + index,
        );
      }
    });
  }
}

export async function getAllMovies() {
  const db = await getDatabase();
  return db.getAllAsync<MovieRecord>(
    "SELECT * FROM movies ORDER BY created_at DESC",
  );
}

export async function addMovie(payload: {
  title: string;
  year?: number | null;
  rating?: number | null;
}) {
  const db = await getDatabase();
  const now = Date.now();
  return db.runAsync(
    "INSERT INTO movies (title, year, watched, rating, created_at) VALUES (?, ?, 0, ?, ?)",
    payload.title,
    payload.year ?? null,
    payload.rating ?? null,
    now,
  );
}
