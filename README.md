# Anime Scraper NG

A small full-stack exercise: a plain-JS anime browser backed by two
interchangeable APIs (Flask and Express), both reading the same SQLite-seeded
dataset.

## Stack

| Part              | Tech                                         | Port |
| ----------------- | -------------------------------------------- | ---- |
| Frontend          | Plain JS + Tailwind (CDN)                    | 8080 |
| Backend (Python)  | Flask + SQLite (Python 3.14)                 | 8000 |
| Backend (Node.js) | Express + better-sqlite3 (Node 24 LTS, pnpm) | 8001 |

Both backends implement the exact same API and seed their SQLite database from
the shared `data/anime.json` on startup.

Both also delay every response by a **random 200-1000 ms on purpose**, so
loading states are visible and the request pattern is easy to follow in the
network tab.

Override it with `DELAY_MIN_MS` / `DELAY_MAX_MS` - the same variables in both
backends; the tests set them to zero.

## Running it

```bash
docker compose up -d --build
```

Then open <http://localhost:8080>.

Use the `backend` query parameter to choose which backend the frontend talks
to. It accepts `python` or `node`, and defaults to `python`:

- Flask: <http://localhost:8080/?backend=python>
- Express: <http://localhost:8080/?backend=node>

Anything else (or no parameter at all) falls back to `python`.

## API

Both backends expose one endpoint:

```
GET /api/animes?q=<search>&page=<n>&page_size=<n>
```

| Parameter   | Default | Notes                         |
| ----------- | ------- | ----------------------------- |
| `q`         | `""`    | Case-insensitive title search |
| `page`      | `1`     | 1-based                       |
| `page_size` | `20`    | Capped at 100                 |

Response:

```json
{
  "results": [
    {
      "id": 52991,
      "title": "Sousou no Frieren",
      "rating": 9.26,
      "image": "https://cdn.myanimelist.net/images/anime/1015/138006.jpg"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 500,
  "has_more": true
}
```

## The dataset

`data/anime.json` is committed so everything works offline. It was scraped from
the [AniList API](https://graphql.anilist.co) (500 most popular, safe for work)
and keeps only the four fields the frontend needs.

## Running the tests

Each backend has a small test suite covering the list endpoint. The tests run
inside the containers, like everything else here - there is nothing to install
on your machine. With the stack up, run the suite for the backend you picked:

```bash
# Flask - pytest is already in the image
docker compose exec backend-python pytest

# Express - Node's built-in test runner, nothing extra to install
docker compose exec backend-node pnpm test
```

Test files are part of the bind-mounted source, so editing a test and running
it again needs no rebuild.

If the stack is not up, `run` starts a throwaway container instead:

```bash
docker compose run --rm backend-python pytest
docker compose run --rm backend-node pnpm test
```

The tests import the app directly and seed their own throwaway SQLite database,
so nothing has to be listening on port 8000 or 8001. They also switch the
artificial delay off.

## Debugging

Code is mounted into the containers and both backends watch it, so **editing a
file is enough - no rebuild**. Only dependency changes (`requirements.txt`,
`package.json`) need `docker compose up --build`.

**Flask.** Runs with `--debug`, so an unhandled exception renders an
interactive traceback in the browser. For a breakpoint, drop a `breakpoint()`
into the code, then **attach first and trigger the request second**:

```bash
docker compose attach --detach-keys="ctrl-p,ctrl-q" backend-python
```

**Express.** The V8 inspector is on port 9229. It speaks the Chrome DevTools
Protocol, which **Firefox cannot talk to** - Firefox's debugger only attaches to
Firefox. Pick one of:

- `node inspect localhost:9229` - Node's built-in terminal debugger, no browser
  at all. `sb("server.js", 69)` sets a breakpoint, `cont` runs, `repl` inspects
  variables. Closest thing to pdb.
- **VS Code** (or any DAP editor) attaching to `localhost:9229`. Map the paths
  or breakpoints will not bind: `"localRoot": "${workspaceFolder}/backend-node"`,
  `"remoteRoot": "/app"`, plus `"restart": true` so it survives `--watch`.
- **Chrome/Chromium** via `chrome://inspect`, if you have one installed.

`console.log` plus `docker compose logs -f backend-node` is often quicker than
any of them.

**The database.** Both containers ship the `sqlite3` CLI, and both seed their
database to `/tmp/animes.db` (override with the `DB_PATH` environment
variable). Open a shell into either one and poke at it:

```bash
docker compose exec backend-python sqlite3 /tmp/animes.db
docker compose exec backend-node sqlite3 /tmp/animes.db
```

## The exercise

Three parts: fix what is broken, build something new, then pin one of the
fixes with a test.

**First, pick a backend.** Flask and Express are behavioural clones - they
exist so you can work in whichever language you are most comfortable with.
Choose one at the start and stay in it for the whole exercise; you can ignore
the other entirely. Point the frontend at your choice with
`?backend=python` or `?backend=node`.

### Ground rules

> [!WARNING]
> **Please do this without an AI assistant.** No Claude, ChatGPT, Copilot,
> Cursor or equivalent - not for writing the code, not for finding the bugs,
> not for explaining the code back to you. Turn inline completions off in your
> editor before you start.

These are all fair game:

- [MDN](https://developer.mozilla.org/)
- [Stack Overflow](https://stackoverflow.com/)
- [SQLite SQL reference](https://sqlite.org/lang.html)
- [Tailwind](https://tailwindcss.com/docs) - the frontend uses the CDN build

If you picked Flask:

- [Python documentation](https://docs.python.org/3/), including
  [`sqlite3`](https://docs.python.org/3/library/sqlite3.html)
- [Flask documentation](https://flask.palletsprojects.com/)
- [pytest documentation](https://docs.pytest.org/)

If you picked Express:

- [Node.js documentation](https://nodejs.org/api/), including
  [`node:test`](https://nodejs.org/api/test.html)
- [Express documentation](https://expressjs.com/)

### Part 1 - fix three bugs

This repo has **three deliberate bugs** - two in the frontend, one in the
backends. All are visible by using the app:

1. **Search debounce.** The search box is supposed to wait 300 ms after the
   user stops typing before hitting the API. It doesn't behave that way.
2. **Infinite scroll.** Scrolling to the bottom is supposed to append the next
   page of results. It doesn't do that either.
3. **Search pagination.** Once the first two are fixed, the count above the
   grid disagrees with the grid - search for something and it still claims
   there are 500 animes.

Bug 3 is present in both backends, so you will find it in whichever one you
picked - `backend-python/app.py` or `backend-node/server.js`.

Your task:

- Find and fix all three bugs.
- Explain what was wrong and why your fix is correct.

Open the network tab while typing and while scrolling - every bug shows up
clearly there. The backends delay each response on purpose, which makes the
request pattern easy to see.

### Part 2 - add ordering and filtering

Two new controls above the grid, then the URL state that goes with them.

#### 2a) Ordering

Let the user order the results by:

| Field  | Directions               |
| ------ | ------------------------ |
| Title  | A-Z and Z-A              |
| Rating | highest and lowest first |

Requirements:

- **Order in the backend, not the browser.** The grid is paginated, so sorting
  the already-loaded cards client-side would only reorder whatever happens to
  be on screen. The database has to do the sorting.
- **It has to work with search.** Ordering and the `q` filter must combine.
- **It has to work with infinite scroll.** Changing the order starts the list
  again from the first page; scrolling on from there keeps the chosen order.
- **Use a `<select>`.**

#### 2b) Minimum rating

Let the user restrict the grid to animes rated at or above a chosen value.

Requirements:

- **Filter in the backend**, for the same reason as ordering.
- **All three combine.** Search, ordering and the rating filter have to work at
  the same time, in any combination.
- **Use an `<input type="range">`.** The dataset runs from 5.0 to 9.1 in steps
  of 0.1. Show the current value next to the slider - a range input displays
  nothing on its own, so without it the user cannot tell what they picked.

#### 2c) Keep the state in the URL

Do this once 2a and 2b work, not before.

The frontend already reads `?backend=` from the URL on startup. Extend that to
the search term, the ordering and the filter, so a view can be linked to and
survives a reload. The back button has to stay usable afterwards.

### Part 3 - a regression test

Bug 3 shipped because nothing checked for it. Write a test in your backend's
suite that **fails on the original bug and passes once it is fixed**.

`backend-python/test_app.py` and `backend-node/server.test.js` already contain
a couple of examples to copy the shape from.

To watch it fail first, undo your fix to bug 3, run the suite, and put the fix
back. A test that passes both before and after the fix is not testing the bug.

Keep it focused - one test that pins the behaviour is worth more than five that
restate it.
