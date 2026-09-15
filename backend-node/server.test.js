/**
 * Tests for the Express backend.
 *
 *   docker compose exec backend-node pnpm test
 *
 * Uses Node's built-in test runner - no test framework to install.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TEST_DB = path.join(os.tmpdir(), "animes-test-node.db");
fs.rmSync(TEST_DB, { force: true }); // always start from a freshly seeded DB

process.env.DB_PATH = TEST_DB;
process.env.DATA_PATH = path.join(__dirname, "..", "data", "anime.json");
process.env.DELAY_MIN_MS = "0"; // no artificial delay while testing
process.env.DELAY_MAX_MS = "0";

const app = require("./server");

/** Start the app on a random free port and return a fetch helper. */
async function withServer(run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run((query) =>
      fetch(`${base}/api/animes?${query}`).then((r) => r.json()),
    );
  } finally {
    server.close();
  }
}

test("returns a page of animes", async () => {
  await withServer(async (get) => {
    const data = await get("page=1&page_size=5");

    assert.strictEqual(data.results.length, 5);
    assert.deepStrictEqual(Object.keys(data.results[0]).sort(), [
      "id",
      "image",
      "rating",
      "title",
    ]);
  });
});

test("search only returns matching animes", async () => {
  await withServer(async (get) => {
    const data = await get("q=frieren");

    assert.ok(data.results.length > 0);
    for (const anime of data.results) {
      assert.match(anime.title.toLowerCase(), /frieren/);
    }
  });
});

// Your turn: add a test that fails because of the bug in the list endpoint.
