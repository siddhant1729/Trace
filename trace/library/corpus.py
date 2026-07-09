"""
Code-pattern corpus for Trace's retrieval-augmented generation (RAG).

Each entry is a canonical, production-shaped snippet for a common architecture
component. During code generation, ``vector_store.get_relevant_patterns`` embeds
the user's diagram/query and pulls the closest snippets from ChromaDB so the LLM
can ground its output in real, idiomatic implementations rather than inventing
them from scratch.

Schema for every entry::

    {
        "id":       <stable unique string>,   # used for idempotent ingestion
        "document": <the snippet text>,        # what gets embedded + retrieved
        "metadata": {
            "type":  <service|database|cache|queue|middleware|gateway>,
            "stack": <fastapi|redis|postgres|sqlalchemy|rabbitmq|kafka|...>,
        },
    }

``type`` describes the architectural role of the component; ``stack`` is the
concrete technology, which callers may pass to ``get_relevant_patterns(stack=...)``
to constrain retrieval.
"""

CORPUS: list[dict] = [
    # ── Services (API layer) ────────────────────────────────────────────────
    {
        "id": "fastapi-crud-route",
        "metadata": {"type": "service", "stack": "fastapi"},
        "document": (
            "FastAPI CRUD router with Pydantic models and dependency-injected DB session.\n"
            "from fastapi import APIRouter, Depends, HTTPException\n"
            "from pydantic import BaseModel\n"
            "from sqlalchemy.orm import Session\n\n"
            "router = APIRouter(prefix='/items', tags=['items'])\n\n"
            "class ItemIn(BaseModel):\n"
            "    name: str\n"
            "    price: float\n\n"
            "class ItemOut(ItemIn):\n"
            "    id: int\n\n"
            "@router.post('/', response_model=ItemOut, status_code=201)\n"
            "def create_item(payload: ItemIn, db: Session = Depends(get_db)):\n"
            "    item = Item(**payload.model_dump())\n"
            "    db.add(item)\n"
            "    db.commit()\n"
            "    db.refresh(item)\n"
            "    return item\n\n"
            "@router.get('/{item_id}', response_model=ItemOut)\n"
            "def read_item(item_id: int, db: Session = Depends(get_db)):\n"
            "    item = db.get(Item, item_id)\n"
            "    if item is None:\n"
            "        raise HTTPException(status_code=404, detail='Item not found')\n"
            "    return item\n"
        ),
    },
    {
        "id": "fastapi-app-factory",
        "metadata": {"type": "service", "stack": "fastapi"},
        "document": (
            "FastAPI application factory with CORS, lifespan startup/shutdown, and router mounting.\n"
            "from contextlib import asynccontextmanager\n"
            "from fastapi import FastAPI\n"
            "from fastapi.middleware.cors import CORSMiddleware\n\n"
            "@asynccontextmanager\n"
            "async def lifespan(app: FastAPI):\n"
            "    await init_db()          # startup\n"
            "    yield\n"
            "    await close_db()         # shutdown\n\n"
            "def create_app() -> FastAPI:\n"
            "    app = FastAPI(title='Service', lifespan=lifespan)\n"
            "    app.add_middleware(\n"
            "        CORSMiddleware, allow_origins=['*'],\n"
            "        allow_methods=['*'], allow_headers=['*'],\n"
            "    )\n"
            "    app.include_router(items_router)\n"
            "    return app\n"
        ),
    },
    {
        "id": "fastapi-background-task",
        "metadata": {"type": "service", "stack": "fastapi"},
        "document": (
            "FastAPI endpoint that offloads slow work to a BackgroundTasks worker so the request returns fast.\n"
            "from fastapi import APIRouter, BackgroundTasks\n\n"
            "router = APIRouter()\n\n"
            "def send_welcome_email(address: str) -> None:\n"
            "    mailer.send(to=address, template='welcome')\n\n"
            "@router.post('/signup')\n"
            "async def signup(email: str, tasks: BackgroundTasks):\n"
            "    user = await create_user(email)\n"
            "    tasks.add_task(send_welcome_email, email)\n"
            "    return {'id': user.id}\n"
        ),
    },
    {
        "id": "flask-blueprint-route",
        "metadata": {"type": "service", "stack": "flask"},
        "document": (
            "Flask blueprint exposing a JSON REST resource with error handling.\n"
            "from flask import Blueprint, jsonify, request, abort\n\n"
            "bp = Blueprint('orders', __name__, url_prefix='/orders')\n\n"
            "@bp.post('/')\n"
            "def create_order():\n"
            "    data = request.get_json(silent=True) or abort(400, 'invalid json')\n"
            "    order = Order.create(**data)\n"
            "    return jsonify(order.to_dict()), 201\n\n"
            "@bp.get('/<int:order_id>')\n"
            "def get_order(order_id):\n"
            "    order = Order.query.get_or_404(order_id)\n"
            "    return jsonify(order.to_dict())\n"
        ),
    },
    # ── Databases / persistence ─────────────────────────────────────────────
    {
        "id": "sqlalchemy-orm-model",
        "metadata": {"type": "database", "stack": "sqlalchemy"},
        "document": (
            "SQLAlchemy 2.0 declarative ORM model with typed columns, relationship, and timestamps.\n"
            "from datetime import datetime\n"
            "from sqlalchemy import ForeignKey, String, func\n"
            "from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship\n\n"
            "class Base(DeclarativeBase):\n"
            "    pass\n\n"
            "class User(Base):\n"
            "    __tablename__ = 'users'\n"
            "    id: Mapped[int] = mapped_column(primary_key=True)\n"
            "    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)\n"
            "    created_at: Mapped[datetime] = mapped_column(server_default=func.now())\n"
            "    orders: Mapped[list['Order']] = relationship(back_populates='user')\n\n"
            "class Order(Base):\n"
            "    __tablename__ = 'orders'\n"
            "    id: Mapped[int] = mapped_column(primary_key=True)\n"
            "    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))\n"
            "    user: Mapped['User'] = relationship(back_populates='orders')\n"
        ),
    },
    {
        "id": "sqlalchemy-session-factory",
        "metadata": {"type": "database", "stack": "sqlalchemy"},
        "document": (
            "SQLAlchemy engine + session factory with a FastAPI-style get_db dependency.\n"
            "from sqlalchemy import create_engine\n"
            "from sqlalchemy.orm import sessionmaker\n\n"
            "engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10)\n"
            "SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)\n\n"
            "def get_db():\n"
            "    db = SessionLocal()\n"
            "    try:\n"
            "        yield db\n"
            "    finally:\n"
            "        db.close()\n"
        ),
    },
    {
        "id": "postgres-ddl-users",
        "metadata": {"type": "database", "stack": "postgres"},
        "document": (
            "PostgreSQL DDL: users and orders tables with a foreign key, indexes, and an updated_at trigger.\n"
            "CREATE TABLE users (\n"
            "    id          BIGSERIAL PRIMARY KEY,\n"
            "    email       TEXT NOT NULL UNIQUE,\n"
            "    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),\n"
            "    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()\n"
            ");\n\n"
            "CREATE TABLE orders (\n"
            "    id       BIGSERIAL PRIMARY KEY,\n"
            "    user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n"
            "    total    NUMERIC(12,2) NOT NULL DEFAULT 0\n"
            ");\n"
            "CREATE INDEX idx_orders_user_id ON orders(user_id);\n"
        ),
    },
    {
        "id": "postgres-connection-pool",
        "metadata": {"type": "database", "stack": "postgres"},
        "document": (
            "Async PostgreSQL connection pool with asyncpg for high-throughput services.\n"
            "import asyncpg\n\n"
            "pool: asyncpg.Pool | None = None\n\n"
            "async def init_db() -> None:\n"
            "    global pool\n"
            "    pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=2, max_size=10)\n\n"
            "async def fetch_user(user_id: int) -> dict | None:\n"
            "    async with pool.acquire() as conn:\n"
            "        row = await conn.fetchrow('SELECT * FROM users WHERE id = $1', user_id)\n"
            "        return dict(row) if row else None\n"
        ),
    },
    {
        "id": "mongodb-repository",
        "metadata": {"type": "database", "stack": "mongodb"},
        "document": (
            "MongoDB async repository using Motor with an upsert and an indexed query.\n"
            "from motor.motor_asyncio import AsyncIOMotorClient\n\n"
            "client = AsyncIOMotorClient(MONGO_URL)\n"
            "products = client.shop.products\n\n"
            "async def ensure_indexes() -> None:\n"
            "    await products.create_index('sku', unique=True)\n\n"
            "async def upsert_product(sku: str, doc: dict) -> None:\n"
            "    await products.update_one({'sku': sku}, {'$set': doc}, upsert=True)\n\n"
            "async def find_in_stock(limit: int = 20) -> list[dict]:\n"
            "    cursor = products.find({'stock': {'$gt': 0}}).limit(limit)\n"
            "    return await cursor.to_list(length=limit)\n"
        ),
    },
    # ── Caches ──────────────────────────────────────────────────────────────
    {
        "id": "redis-cache-aside",
        "metadata": {"type": "cache", "stack": "redis"},
        "document": (
            "Redis cache-aside helper: read-through with JSON serialization and a TTL.\n"
            "import json\n"
            "import redis.asyncio as redis\n\n"
            "r = redis.from_url(REDIS_URL, decode_responses=True)\n\n"
            "async def get_user_cached(user_id: int) -> dict:\n"
            "    key = f'user:{user_id}'\n"
            "    hit = await r.get(key)\n"
            "    if hit is not None:\n"
            "        return json.loads(hit)\n"
            "    user = await fetch_user_from_db(user_id)\n"
            "    await r.set(key, json.dumps(user), ex=300)  # 5-minute TTL\n"
            "    return user\n"
        ),
    },
    {
        "id": "redis-rate-limiter",
        "metadata": {"type": "cache", "stack": "redis"},
        "document": (
            "Fixed-window rate limiter backed by Redis INCR + EXPIRE.\n"
            "import redis.asyncio as redis\n\n"
            "r = redis.from_url(REDIS_URL)\n\n"
            "async def allow_request(client_id: str, limit: int = 100, window: int = 60) -> bool:\n"
            "    key = f'rl:{client_id}'\n"
            "    count = await r.incr(key)\n"
            "    if count == 1:\n"
            "        await r.expire(key, window)\n"
            "    return count <= limit\n"
        ),
    },
    {
        "id": "redis-distributed-lock",
        "metadata": {"type": "cache", "stack": "redis"},
        "document": (
            "Redis distributed lock using SET NX with a token so only the owner releases it.\n"
            "import redis.asyncio as redis\n\n"
            "r = redis.from_url(REDIS_URL)\n"
            "_RELEASE = \"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end\"\n\n"
            "async def acquire(name: str, token: str, ttl_ms: int = 10000) -> bool:\n"
            "    return bool(await r.set(f'lock:{name}', token, nx=True, px=ttl_ms))\n\n"
            "async def release(name: str, token: str) -> None:\n"
            "    await r.eval(_RELEASE, 1, f'lock:{name}', token)\n"
        ),
    },
    # ── Message queues / streaming ──────────────────────────────────────────
    {
        "id": "rabbitmq-consumer",
        "metadata": {"type": "queue", "stack": "rabbitmq"},
        "document": (
            "RabbitMQ durable consumer with manual ack and prefetch for back-pressure (pika).\n"
            "import pika\n\n"
            "conn = pika.BlockingConnection(pika.URLParameters(AMQP_URL))\n"
            "channel = conn.channel()\n"
            "channel.queue_declare(queue='tasks', durable=True)\n"
            "channel.basic_qos(prefetch_count=10)\n\n"
            "def on_message(ch, method, properties, body):\n"
            "    try:\n"
            "        handle(body)\n"
            "        ch.basic_ack(delivery_tag=method.delivery_tag)\n"
            "    except Exception:\n"
            "        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)\n\n"
            "channel.basic_consume(queue='tasks', on_message_callback=on_message)\n"
            "channel.start_consuming()\n"
        ),
    },
    {
        "id": "kafka-consumer-group",
        "metadata": {"type": "queue", "stack": "kafka"},
        "document": (
            "Kafka consumer-group loop with manual offset commit after successful processing.\n"
            "from confluent_kafka import Consumer\n\n"
            "consumer = Consumer({\n"
            "    'bootstrap.servers': KAFKA_BROKERS,\n"
            "    'group.id': 'orders-worker',\n"
            "    'enable.auto.commit': False,\n"
            "    'auto.offset.reset': 'earliest',\n"
            "})\n"
            "consumer.subscribe(['orders'])\n\n"
            "while True:\n"
            "    msg = consumer.poll(1.0)\n"
            "    if msg is None or msg.error():\n"
            "        continue\n"
            "    process(msg.value())\n"
            "    consumer.commit(msg, asynchronous=False)\n"
        ),
    },
    {
        "id": "celery-task-worker",
        "metadata": {"type": "queue", "stack": "celery"},
        "document": (
            "Celery task with retry/backoff, using Redis as broker and result backend.\n"
            "from celery import Celery\n\n"
            "app = Celery('worker', broker=REDIS_URL, backend=REDIS_URL)\n\n"
            "@app.task(bind=True, max_retries=3, default_retry_delay=10)\n"
            "def process_payment(self, order_id: int):\n"
            "    try:\n"
            "        charge(order_id)\n"
            "    except TransientError as exc:\n"
            "        raise self.retry(exc=exc)\n"
        ),
    },
    # ── Middleware / cross-cutting ──────────────────────────────────────────
    {
        "id": "jwt-auth-middleware",
        "metadata": {"type": "middleware", "stack": "jwt"},
        "document": (
            "FastAPI JWT bearer auth dependency that decodes and validates the token.\n"
            "import jwt\n"
            "from fastapi import Depends, HTTPException, status\n"
            "from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer\n\n"
            "bearer = HTTPBearer()\n\n"
            "def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:\n"
            "    try:\n"
            "        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=['HS256'])\n"
            "    except jwt.PyJWTError:\n"
            "        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Invalid token')\n"
            "    return {'id': payload['sub'], 'scopes': payload.get('scopes', [])}\n"
        ),
    },
    {
        "id": "asgi-request-logging-middleware",
        "metadata": {"type": "middleware", "stack": "fastapi"},
        "document": (
            "Starlette/FastAPI middleware that logs each request with a correlation id and latency.\n"
            "import time\n"
            "import uuid\n"
            "from starlette.middleware.base import BaseHTTPMiddleware\n\n"
            "class RequestLogMiddleware(BaseHTTPMiddleware):\n"
            "    async def dispatch(self, request, call_next):\n"
            "        rid = request.headers.get('x-request-id', str(uuid.uuid4()))\n"
            "        start = time.perf_counter()\n"
            "        response = await call_next(request)\n"
            "        elapsed = (time.perf_counter() - start) * 1000\n"
            "        logger.info('%s %s -> %s %.1fms', request.method, request.url.path, response.status_code, elapsed)\n"
            "        response.headers['x-request-id'] = rid\n"
            "        return response\n"
        ),
    },
    # ── Gateway / infra ─────────────────────────────────────────────────────
    {
        "id": "nginx-reverse-proxy",
        "metadata": {"type": "gateway", "stack": "nginx"},
        "document": (
            "Nginx reverse proxy / load balancer in front of an upstream API pool with TLS termination.\n"
            "upstream api {\n"
            "    least_conn;\n"
            "    server api1:8000;\n"
            "    server api2:8000;\n"
            "}\n\n"
            "server {\n"
            "    listen 443 ssl;\n"
            "    server_name example.com;\n"
            "    ssl_certificate     /etc/nginx/certs/fullchain.pem;\n"
            "    ssl_certificate_key /etc/nginx/certs/privkey.pem;\n\n"
            "    location /api/ {\n"
            "        proxy_pass http://api/;\n"
            "        proxy_set_header Host $host;\n"
            "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
            "    }\n"
            "}\n"
        ),
    },
    {
        "id": "dockerfile-python-service",
        "metadata": {"type": "gateway", "stack": "docker"},
        "document": (
            "Multi-stage Dockerfile for a Python FastAPI service: small runtime image, non-root user.\n"
            "FROM python:3.12-slim AS builder\n"
            "WORKDIR /app\n"
            "COPY requirements.txt .\n"
            "RUN pip install --no-cache-dir --prefix=/install -r requirements.txt\n\n"
            "FROM python:3.12-slim\n"
            "WORKDIR /app\n"
            "COPY --from=builder /install /usr/local\n"
            "COPY . .\n"
            "RUN useradd -m appuser && chown -R appuser /app\n"
            "USER appuser\n"
            "EXPOSE 8000\n"
            "CMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n"
        ),
    },
]
