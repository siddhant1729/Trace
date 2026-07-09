"""Tests for the ChromaDB retrieval pipeline (trace/library/vector_store.py).

All tests run against an in-memory ChromaDB seeded with a deterministic, offline
fake embedding function (see conftest.py) — no Gemini API calls, no network.
"""

from trace.library import corpus as corpus_module
from trace.library.corpus import CORPUS
from trace.library.vector_store import get_relevant_patterns, ingest_corpus


def test_retrieval_returns_results(seeded_collection):
    """A query against a populated store returns ranked snippets."""
    results = get_relevant_patterns(
        "cache user data with a TTL", k=3, collection=seeded_collection
    )
    assert results, "expected at least one pattern"
    assert len(results) <= 3
    for item in results:
        assert set(item) == {"id", "document", "metadata", "distance"}
        assert item["document"]
        assert "stack" in item["metadata"]


def test_metadata_filter_excludes_non_matching_stacks(seeded_collection):
    """Filtering by stack returns only that stack; other stacks are excluded."""
    results = get_relevant_patterns(
        "how does the cache work", stack="redis", k=5, collection=seeded_collection
    )
    assert results, "expected redis patterns to match"
    assert all(item["metadata"]["stack"] == "redis" for item in results)
    # The seed set contains fastapi/postgres/rabbitmq docs — none must leak in.
    assert not any(item["metadata"]["stack"] != "redis" for item in results)


def test_metadata_filter_with_absent_stack_returns_empty(seeded_collection):
    """Filtering on a stack that isn't present yields no results (no crash)."""
    results = get_relevant_patterns(
        "anything", stack="cobol", k=5, collection=seeded_collection
    )
    assert results == []


def test_empty_store_does_not_crash(empty_collection):
    """Querying an empty collection returns [] rather than raising."""
    results = get_relevant_patterns(
        "any query at all", k=5, collection=empty_collection
    )
    assert results == []


def test_blank_query_returns_empty(seeded_collection):
    """A blank query short-circuits to [] without touching the store."""
    assert get_relevant_patterns("   ", collection=seeded_collection) == []


def test_k_caps_number_of_results(seeded_collection):
    """k limits how many snippets come back."""
    results = get_relevant_patterns(
        "service", k=1, collection=seeded_collection
    )
    assert len(results) == 1


def test_ingest_is_idempotent(seeded_collection):
    """Re-ingesting the same corpus does not duplicate documents."""
    before = seeded_collection.count()
    from tests.conftest import SAMPLE_DOCS

    ingest_corpus(collection=seeded_collection, corpus=SAMPLE_DOCS)
    assert seeded_collection.count() == before


def test_missing_store_returns_empty_without_collection(monkeypatch):
    """With no collection injected and none ingested, retrieval degrades to []."""

    def _raise(*args, **kwargs):
        raise RuntimeError("collection does not exist")

    monkeypatch.setattr(
        "trace.library.vector_store.get_collection", _raise
    )
    assert get_relevant_patterns("query", k=3) == []


def test_corpus_schema_is_valid():
    """Every real corpus entry has the required id/document/metadata shape."""
    allowed_types = {"service", "database", "cache", "queue", "middleware", "gateway"}
    seen_ids = set()
    assert corpus_module.CORPUS is CORPUS
    for item in CORPUS:
        assert item["id"] not in seen_ids, f"duplicate id {item['id']}"
        seen_ids.add(item["id"])
        assert item["document"].strip()
        assert item["metadata"]["type"] in allowed_types
        assert item["metadata"]["stack"]
