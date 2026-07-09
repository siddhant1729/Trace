"""Trace's RAG code-pattern library: corpus + ChromaDB vector retrieval."""

from trace.library.corpus import CORPUS
from trace.library.vector_store import (
    COLLECTION_NAME,
    GeminiEmbeddingFunction,
    get_relevant_patterns,
    ingest_corpus,
)

__all__ = [
    "CORPUS",
    "COLLECTION_NAME",
    "GeminiEmbeddingFunction",
    "get_relevant_patterns",
    "ingest_corpus",
]
