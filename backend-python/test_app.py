"""Tests for the Flask backend.

    pytest

The environment has to be set up before importing app, because the module
seeds its SQLite database on import.
"""

import os
import tempfile

TEST_DB = os.path.join(tempfile.gettempdir(), "animes-test-python.db")
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)  # always start from a freshly seeded DB

os.environ["DB_PATH"] = TEST_DB
os.environ["DATA_PATH"] = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "anime.json"
)
os.environ["DELAY_MIN_MS"] = "0"  # no artificial delay while testing
os.environ["DELAY_MAX_MS"] = "0"

import pytest  # noqa: E402

from app import app  # noqa: E402


@pytest.fixture
def get():
    """Return a helper that GETs the list endpoint and parses the JSON."""
    client = app.test_client()

    def _get(query=""):
        return client.get(f"/api/animes?{query}").get_json()

    return _get


def test_returns_a_page_of_animes(get):
    data = get("page=1&page_size=5")

    assert len(data["results"]) == 5
    assert sorted(data["results"][0]) == ["id", "image", "rating", "title"]


def test_search_only_returns_matching_animes(get):
    data = get("q=frieren")

    assert len(data["results"]) > 0
    assert all("frieren" in a["title"].lower() for a in data["results"])


# Your turn: add a test that fails because of the bug in the list endpoint.
