# MultiAPI Aggregator — Market Data API

A production-ready, resilient backend API built with **Node.js, Express, PostgreSQL, and Redis** that pulls data from multiple external market APIs (**Twelve Data, Zerodha Kite, Alpha Vantage, Tiingo**), normalizes the payload into a unified schema, and serves it with caching and rate limiting.

---

## 🏗️ Architecture & Flow Overview

```
+-----------------------------------------------------------------------+
|                             Client / UI                               |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|                        Express REST API                               |
|        (Endpoint-Specific Rate Limiting & Error Handling)             |
+-----+-----------------------------+-----------------------------+-----+
      |                             |                             |
      v                             v                             v
+-----+-------+             +-------+-------+             +-------+-------+
| GET /trending|             | GET /sources  |             | POST /refresh |
+-----+-------+             +-------+-------+             +-------+-------+
      |                             |                             |
      v                             v                             v
+-----+-----------------------------+-----------------------------+-----+
|                     Redis Read-Through Cache                          |
|         (Serves high-speed feed; fallback to Memory Store)            |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|                   PostgreSQL Database Storage                         |
|      (Schema Evolution: v1 base table, v2 composite B-Tree indexes)   |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------+-----------------------------------+
|               Resilient Multi-Source Fetching Engine                   |
|                (Promise.allSettled Fault Tolerance)                   |
|     +---------------+---------------+---------------+---------------+ |
|     |  Twelve Data  | Zerodha Kite  | Alpha Vantage |    Tiingo     | |
|     +---------------+---------------+---------------+---------------+ |
+-----------------------------------------------------------------------+
```

---

## ⚡ Key Features

1. **Multi-Source Market Data Normalization**:
   - Ingests data from **Twelve Data**, **Zerodha Kite**, **Alpha Vantage**, and **Tiingo**.
   - Standardizes disparate payloads into a single unified JSON schema:
     ```json
     {
       "id": "twelvedata_AAPL",
       "title": "Apple Inc (AAPL) - Twelve Data Quote",
       "url": "https://twelvedata.com",
       "source": "twelvedata",
       "score": 190,
       "fetched_at": "2026-07-29T11:00:00.000Z",
       "metadata": {
         "symbol": "AAPL",
         "price": 190.25,
         "exchange": "NASDAQ"
       }
     }
     ```

2. **Integration Resilience (`Promise.allSettled`)**:
   - Executes multi-source API requests concurrently. If 1 or 2 external APIs time out or hit rate limits, the system records degraded status gracefully and continues serving available source data without crashing.

3. **Database Schema Evolution & Indexing**:
   - **Migration 001** (`001_create_aggregated_records.sql`): Creates base table `aggregated_records`.
   - **Migration 002** (`002_add_indexes.sql`): Demonstrates schema evolution with composite performance B-Tree indexes on `(source)` and `(source, fetched_at DESC)`.

4. **Redis Read-Through Cache**:
   - `GET /trending` responses are cached in Redis with configurable TTL (`CACHE_TTL=300`).
   - Automatically falls back to an in-memory `Map` store if Redis is unavailable locally.

5. **Endpoint Rate Limiting**:
   - `GET /trending`: 60 requests per minute
   - `GET /sources`: 30 requests per minute
   - `POST /refresh`: 5 requests per minute

6. **Non-Blocking Background Refresh**:
   - `POST /refresh` requires authorization header (`Bearer secret123`) and returns `202 Accepted` immediately while processing background ingestion asynchronously (`setImmediate`).

---

## 🚀 How to Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker & Docker Compose](https://www.docker.com/) (Optional for containerized run)

### 2. Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Database Migration
Run PostgreSQL schema migrations:
```bash
npm run migrate
```

### 4. Start the Application
Run in development mode:
```bash
npm run dev
```

### 5. Run with Docker Compose
To spin up PostgreSQL, Redis, and the API server in Docker:
```bash
docker-compose up --build
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Core service health check |
| `GET` | `/trending` | Public | Returns unified trending market items across sources |
| `GET` | `/trending?source=kite` | Public | Returns market items filtered by source |
| `GET` | `/sources` | Public | Returns health, latency, and status per upstream source API |
| `POST` | `/refresh` | Protected | Manual background data ingestion (Requires `Bearer secret123`) |

---

## ⚖️ Trade-offs & Future Improvements

- **Trade-off**: Used parameterized SQL queries in `recordModel.js` rather than a heavy ORM (like Prisma/TypeORM) to keep runtime memory footprint low and queries completely transparent.
- **Future Improvements**:
  - Add BullMQ / Redis-backed job queue for background worker persistence across process restarts.
  - Implement WebSockets to stream real-time price updates directly to connected frontend clients.

---

## 🤖 AI Disclosure

- **AI Tools Used**: Used AI coding assistants for boilerplate structure generation, initial implementation plan drafting, and documentation formatting.
- **Self-Written Components**: Architecture design, MVC endpoint wiring, database schema evolution logic, `Promise.allSettled` resilience handling, and custom rate limiting middleware.