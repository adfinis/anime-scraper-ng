/**
 * Anime Scraper NG - Express backend.
 *
 * Loads the shared data/anime.json into SQLite on startup and exposes a single
 * searchable, paginated list endpoint (same contract as the Flask backend).
 */
const fs = require("fs");
const express = require("express");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/tmp/animes.db";
const DATA_PATH = process.env.DATA_PATH || "/data/anime.json";
const PORT = process.env.PORT || 8001;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
// Deliberate latency so loading states are visible and requests are easy to
// follow in the network tab.
const DELAY_MIN_MS = Number(process.env.DELAY_MIN_MS ?? 200);
const DELAY_MAX_MS = Number(process.env.DELAY_MAX_MS ?? 1000);

const db = new Database(DB_PATH);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS animes (
      id     INTEGER PRIMARY KEY,
      title  TEXT NOT NULL,
      rating REAL,
      image  TEXT NOT NULL
    )
  `);

  const alreadySeeded = db.prepare("SELECT COUNT(*) AS n FROM animes").get().n;
  if (!alreadySeeded) {
    const animes = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    const insert = db.prepare(
      "INSERT INTO animes (id, title, rating, image) VALUES (?, ?, ?, ?)",
    );
    const insertAll = db.transaction((rows) => {
      for (const a of rows) insert.run(a.id, a.title, a.rating, a.image);
    });
    insertAll(animes);
    console.log(`seeded ${animes.length} animes`);
  }
}

function readInt(value, fallback, minimum, maximum) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(minimum, Math.min(parsed, maximum));
}

const app = express();

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  next();
});

app.use((req, res, next) => {
  setTimeout(
    next,
    DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS),
  );
});

app.get("/api/animes", (req, res) => {
  const query = (req.query.q || "").trim();
  const page = readInt(req.query.page, 1, 1, 10000);
  const pageSize = readInt(
    req.query.page_size,
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );

  const where = query ? "WHERE title LIKE ?" : "";
  const params = query ? [`%${query}%`] : [];

  const total = db.prepare("SELECT COUNT(*) AS n FROM animes").get().n;

  const offset = (page - 1) * pageSize;
  const results = db
    .prepare(
      `SELECT id, title, rating, image FROM animes ${where}
       ORDER BY rating DESC, id ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset);

  res.json({
    results,
    page,
    page_size: pageSize,
    total,
    has_more: offset + results.length < total,
  });
});

initDb();

// Only listen when started directly, so tests can import the app instead.
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => console.log(`listening on ${PORT}`));
}

module.exports = app;
