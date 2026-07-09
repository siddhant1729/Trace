import uuid
from trace.library.vector_store import COLLECTION_NAME, ingest_corpus

import chromadb
import pytest
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """Provides required env vars for all tests so config loads without a real .env."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-for-pytest")


class FakeEmbeddingFunction(EmbeddingFunction):
    """Deterministic, offline embedding function for tests.

    Hashes each document's characters into a fixed-width vector — no network,
    no Gemini API. Similar strings land near each other, which is enough to
    exercise ChromaDB's ANN query path without any real embedding model.
    """

    def __init__(self, dim: int = 64) -> None:
        self._dim = dim

    def __call__(self, input: Documents) -> Embeddings:
        vectors: Embeddings = []
        for text in input:
            vec = [0.0] * self._dim
            for i, ch in enumerate(text):
                vec[i % self._dim] += (ord(ch) % 97) / 97.0
            vectors.append(vec)
        return vectors

    @staticmethod
    def name() -> str:
        return "fake-test"

    def get_config(self) -> dict:
        return {"dim": self._dim}

    @staticmethod
    def build_from_config(config: dict) -> "FakeEmbeddingFunction":
        return FakeEmbeddingFunction(dim=config.get("dim", 64))


# Sample docs used to seed the in-memory store. Deliberately spans multiple
# stacks so metadata-filter tests can prove non-matching stacks are excluded.
SAMPLE_DOCS = [
    {
        "id": "sample-fastapi-route",
        "document": "FastAPI router with a POST endpoint and Pydantic request model.",
        "metadata": {"type": "service", "stack": "fastapi"},
    },
    {
        "id": "sample-redis-cache",
        "document": "Redis cache-aside helper with a TTL and JSON serialization.",
        "metadata": {"type": "cache", "stack": "redis"},
    },
    {
        "id": "sample-postgres-ddl",
        "document": "PostgreSQL CREATE TABLE DDL with a foreign key and index.",
        "metadata": {"type": "database", "stack": "postgres"},
    },
    {
        "id": "sample-rabbitmq-consumer",
        "document": "RabbitMQ durable consumer with manual ack and prefetch.",
        "metadata": {"type": "queue", "stack": "rabbitmq"},
    },
]


@pytest.fixture
def fake_embedding_function() -> FakeEmbeddingFunction:
    return FakeEmbeddingFunction()


def _fresh_collection(embedding_function):
    """A uniquely-named in-memory collection.

    ``EphemeralClient()`` is a process-wide singleton, so every fixture shares
    one in-memory DB — a unique collection name per fixture keeps them isolated.
    """
    client = chromadb.EphemeralClient()
    name = f"{COLLECTION_NAME}_{uuid.uuid4().hex[:12]}"
    return client.get_or_create_collection(
        name, embedding_function=embedding_function
    )


@pytest.fixture
def seeded_collection(fake_embedding_function):
    """In-memory ChromaDB collection seeded with SAMPLE_DOCS via the fake embedder."""
    collection = _fresh_collection(fake_embedding_function)
    ingest_corpus(collection=collection, corpus=SAMPLE_DOCS)
    return collection


@pytest.fixture
def empty_collection(fake_embedding_function):
    """In-memory ChromaDB collection with no documents."""
    return _fresh_collection(fake_embedding_function)
