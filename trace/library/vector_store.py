
"""
ChromaDB-backed vector retrieval for Trace's RAG pipeline.

This module owns the whole retrieval story:

* :class:`GeminiEmbeddingFunction` — the production embedder. It turns text into
  vectors via the Gemini embeddings API (same provider as the rest of Trace).
* :func:`ingest_corpus` — idempotently embeds :data:`~trace.library.corpus.CORPUS`
  into a persistent ChromaDB collection at ``settings.chroma_path``.
* :func:`get_relevant_patterns` — embeds a query, optionally filters by ``stack``,
  and returns the top-k matching code-pattern snippets.

The embedding function is injectable everywhere so tests can substitute a
deterministic, offline fake (see ``tests/conftest.py``) and never touch the
network or the real Gemini API.

Run ``python -m trace.library.vector_store`` to (re-)ingest the corpus.
"""

from __future__ import annotations

from trace.config import settings
from trace.library.corpus import CORPUS
from typing import Optional

import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

COLLECTION_NAME = "trace_patterns"


# ─────────────────────────────────────────
# Embedding function
# ─────────────────────────────────────────

class GeminiEmbeddingFunction(EmbeddingFunction):
    """Chroma embedding function backed by the Gemini embeddings API.

    The genai client is created lazily on first use so importing this module
    (and merely constructing the embedder) never performs any network I/O.
    """

    def __init__(self, model: Optional[str] = None) -> None:
        self._model = model or settings.embedding_model
        self._client = None  # built lazily on first __call__

    def _ensure_client(self):
        if self._client is None:
            from google import genai

            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    def __call__(self, input: Documents) -> Embeddings:
        client = self._ensure_client()
        resp = client.models.embed_content(model=self._model, contents=list(input))
        return [list(e.values) for e in resp.embeddings]

    # Chroma >=1.0 requires these three so a collection's embedder can be
    # serialized to / rebuilt from its persisted config.
    @staticmethod
    def name() -> str:
        return "gemini"

    def get_config(self) -> dict:
        return {"model": self._model}

    @staticmethod
    def build_from_config(config: dict) -> "GeminiEmbeddingFunction":
        return GeminiEmbeddingFunction(model=config.get("model"))


def default_embedding_function() -> GeminiEmbeddingFunction:
    """The embedder used in production when no override is injected."""
    return GeminiEmbeddingFunction()


# ─────────────────────────────────────────
# Client / collection helpers
# ─────────────────────────────────────────

def get_client(path: Optional[str] = None) -> chromadb.ClientAPI:
    """Persistent ChromaDB client rooted at ``path`` (defaults to CHROMA_PATH)."""
    return chromadb.PersistentClient(path=path or settings.chroma_path)


def get_collection(
    client: Optional[chromadb.ClientAPI] = None,
    embedding_function: Optional[EmbeddingFunction] = None,
    *,
    create: bool = True,
):
    """Open (or create) the pattern collection.

    With ``create=False`` this raises if the collection does not exist yet,
    which callers use to detect an un-ingested store.
    """
    client = client or get_client()
    embedding_function = embedding_function or default_embedding_function()
    if create:
        return client.get_or_create_collection(
            COLLECTION_NAME, embedding_function=embedding_function
        )
    return client.get_collection(
        COLLECTION_NAME, embedding_function=embedding_function
    )


# ─────────────────────────────────────────
# Ingestion
# ─────────────────────────────────────────

def ingest_corpus(collection=None, corpus: Optional[list[dict]] = None):
    """Embed the corpus into ChromaDB, idempotently.

    Only entries whose ``id`` is not already present are embedded and added, so
    re-running never duplicates documents. Pass ``collection`` to target an
    existing collection (e.g. an in-memory one in tests); otherwise the
    persistent collection at CHROMA_PATH is used.
    """
    corpus = CORPUS if corpus is None else corpus
    collection = collection if collection is not None else get_collection()

    existing = set(collection.get()["ids"])
    pending = [item for item in corpus if item["id"] not in existing]
    if pending:
        collection.add(
            ids=[item["id"] for item in pending],
            documents=[item["document"] for item in pending],
            metadatas=[item["metadata"] for item in pending],
        )
    return collection


# ─────────────────────────────────────────
# Retrieval
# ─────────────────────────────────────────

def get_relevant_patterns(
    query: str,
    stack: Optional[str] = None,
    k: int = 5,
    collection=None,
) -> list[dict]:
    """Return the top-``k`` code-pattern snippets most relevant to ``query``.

    Args:
        query: Natural-language / diagram-derived text to match against.
        stack: Optional exact-match filter on the ``stack`` metadata field
            (e.g. ``"redis"``) — non-matching stacks are excluded entirely.
        k: Maximum number of snippets to return.
        collection: Optional pre-opened collection (used by tests). When omitted,
            the persistent collection at CHROMA_PATH is opened read-only.

    Returns:
        A list of ``{"id", "document", "metadata", "distance"}`` dicts, closest
        first. Returns ``[]`` gracefully when the store is missing or empty, or
        the query is blank — retrieval never raises into the caller.
    """
    if not query or not query.strip():
        return []

    if collection is None:
        try:
            collection = get_collection(create=False)
        except Exception:
            # Collection has never been ingested — degrade to no patterns.
            return []

    count = collection.count()
    if count == 0:
        return []

    where = {"stack": stack} if stack else None
    result = collection.query(
        query_texts=[query],
        n_results=min(k, count),
        where=where,
    )

    ids = result.get("ids", [[]])[0]
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = (result.get("distances") or [[None] * len(ids)])[0]

    return [
        {
            "id": ids[i],
            "document": documents[i],
            "metadata": metadatas[i],
            "distance": distances[i],
        }
        for i in range(len(ids))
    ]


if __name__ == "__main__":
    col = ingest_corpus()
    print(f"[vector_store] Ingested corpus into '{COLLECTION_NAME}'.")
    print(f"[vector_store] Collection now holds {col.count()} documents.")
