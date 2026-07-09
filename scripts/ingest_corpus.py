#!/usr/bin/env python
"""
Ingest the code-pattern corpus into the persistent ChromaDB store.

Embeds every entry in ``trace.library.corpus.CORPUS`` (via the Gemini embeddings
API) into the collection at ``settings.chroma_path``. Idempotent — re-running
only adds entries that aren't already present, so it's safe to run repeatedly.

Usage:
    python scripts/ingest_corpus.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from trace.library.vector_store import COLLECTION_NAME, ingest_corpus  # noqa: E402


def main() -> None:
    collection = ingest_corpus()
    print(f"Ingested corpus into '{COLLECTION_NAME}'.")
    print(f"Collection now holds {collection.count()} document(s).")


if __name__ == "__main__":
    main()
