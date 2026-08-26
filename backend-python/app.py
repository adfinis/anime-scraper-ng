"""Anime Scraper NG - Flask backend.

Loads the shared data/anime.json into SQLite on startup and exposes a single
searchable, paginated list endpoint.
"""

import json
import os
import random
import sqlite3
import time

from flask import Flask, g, jsonify, request

DB_PATH = os.environ.get("DB_PATH", "/tmp/animes.db")
DATA_PATH = os.environ.get("DATA_PATH", "/data/anime.json")
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
# Deliberate latency so loading states are visible and requests are easy to
# follow in the network tab.
DELAY_MIN_MS = float(os.environ.get("DELAY_MIN_MS", 200))
DELAY_MAX_MS = float(os.environ.get("DELAY_MAX_MS", 1000))

app = Flask(__name__)


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create the table and seed it from the shared JSON file (once)."""
    db = sqlite3.connect(DB_PATH)
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS animes (
            id     INTEGER PRIMARY KEY,
            title  TEXT NOT NULL,
            rating REAL,
            image  TEXT NOT NULL
        )
        """
    )

    already_seeded = db.execute("SELECT COUNT(*) FROM animes").fetchone()[0]
    if not already_seeded:
        with open(DATA_PATH, encoding="utf-8") as fh:
            animes = json.load(fh)
        db.executemany(
            "INSERT INTO animes (id, title, rating, image) VALUES (?, ?, ?, ?)",
            [(a["id"], a["title"], a["rating"], a["image"]) for a in animes],
        )
        print(f"seeded {len(animes)} animes")

    db.commit()
    db.close()


@app.after_request
def allow_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.after_request
def slow_down(response):
    time.sleep(random.uniform(DELAY_MIN_MS, DELAY_MAX_MS) / 1000)
    return response


def read_int(name, default, minimum, maximum):
    try:
        value = int(request.args.get(name, default))
    except ValueError:
        return default
    return max(minimum, min(value, maximum))


@app.get("/api/animes")
def list_animes():
    query = request.args.get("q", "").strip()
    page = read_int("page", 1, 1, 10_000)
    page_size = read_int("page_size", DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)

    where, params = "", []
    if query:
        where = "WHERE title LIKE ?"
        params.append(f"%{query}%")

    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM animes").fetchone()[0]

    offset = (page - 1) * page_size
    rows = db.execute(
        f"SELECT id, title, rating, image FROM animes {where} "
        "ORDER BY rating DESC, id ASC LIMIT ? OFFSET ?",
        [*params, page_size, offset],
    ).fetchall()

    return jsonify(
        {
            "results": [dict(row) for row in rows],
            "page": page,
            "page_size": page_size,
            "total": total,
            "has_more": offset + len(rows) < total,
        }
    )


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
