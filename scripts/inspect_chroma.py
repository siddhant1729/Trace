#!/usr/bin/env python
"""
Inspect the persistent Trace pattern collection in ChromaDB.

Prints the document count and a few sample entries (id, metadata, and a snippet
preview). Read-only: it never embeds or mutates anything, so it works without a
Gemini API key.

Usage:
    python scripts/inspect_chroma.py
"""

import sys
from pathlib import Path

# Allow running as a plain script (python scripts/inspect_chroma.py).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from trace.config import settings  # noqa: E402
from trace.library.vector_store import COLLECTION_NAME, get_client  # noqa: E402


def main() -> None:
    print(f"CHROMA_PATH: {settings.chroma_path}")
    client = get_client()

    try:
        # Fetch without an embedding function — we only read stored data.
        collection = client.get_collection(COLLECTION_NAME)
    except Exception:
        print(
            f"Collection '{COLLECTION_NAME}' not found. "
            "Run `python -m trace.library.vector_store` to ingest the corpus first."
        )
        return

    count = collection.count()
    print(f"Collection '{COLLECTION_NAME}' holds {count} document(s).\n")

    if count == 0:
        return

    sample = collection.get(limit=5)
    ids = sample["ids"]
    documents = sample["documents"]
    metadatas = sample["metadatas"]

    print(f"Showing {len(ids)} sample entr(y/ies):")
    print("=" * 60)
    for doc_id, meta, doc in zip(ids, metadatas, documents):
        preview = doc.strip().splitlines()[0][:80] if doc else ""
        print(f"id:       {doc_id}")
        print(f"metadata: {meta}")
        print(f"preview:  {preview}")
        print("-" * 60)


if __name__ == "__main__":
    main()
