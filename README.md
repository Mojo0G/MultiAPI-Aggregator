# MultiAPI Aggregator — Market Data API Service

A production-ready, resilient backend API built with **Node.js, Express, PostgreSQL, and Redis** that aggregates live stock market data from multiple external providers (**Twelve Data, Financial Modeling Prep, Alpha Vantage, Tiingo**), normalizes the payload into a unified JSON schema, and serves it with caching and rate limiting.

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
|       (Promise.allSettled & Outgoing Provider Rate Limiters)          |
|     +---------------+---------------+---------------+---------------+ |
|     |  Twelve Data  |      FMP      | Alpha Vantage |    Tiingo     | |
|     +---------------+---------------+---------------+---------------+ |
+-----------------------------------------------------------------------+
```

---

## ⚡ Key Features

### 1. Multi-Source Market Data Normalization
Ingests data from **Twelve Data**, **Financial Modeling Prep (FMP)**, **Alpha Vantage**, and **Tiingo**. Standardizes disparate payloads into a single unified JSON schema:
```json
{
  "id": "twelvedata_AAPL",
  "title": "Apple Inc (AAPL) - Twelve Data Quote",
  "url": "https://twelvedata.com",
  "source": "twelvedata",
  "score": 190,
  "fetched_at": "2026-07-29T11:45:00.000Z",
  "metadata": {
    "symbol": "AAPL",
    "price": 190.25,
    "exchange": "NASDAQ"
  }
}
```

### 2. Provider Free Tier Rate Limiting (`apiRateLimiter.js`)
Pre-flight checks outgoing request limits before contacting upstream providers to preserve token quotas:
- **Twelve Data**: 800 requests/day
- **Financial Modeling Prep (FMP)**: 250 requests/day
- **Alpha Vantage**: 5 requests/min and 25 requests/day
- **Tiingo**: 50 requests/hour and 1,000 requests/day

### 3. Integration Resilience (`Promise.allSettled`)
Executes multi-source requests concurrently. If 1 or 2 external APIs fail or hit rate limits, the system logs the failure clearly, returns fallback data or active sources, and never crashes the server.

### 4. Database Schema Evolution & Auto Creation
- Auto-detects and creates `aggregator_db` if missing.
- **Migration 001** (`001_create_aggregated_records.sql`): Creates initial table `aggregated_records`.
- **Migration 002** (`002_add_indexes.sql`): Adds B-Tree performance composite indexes on `(source)` and `(source, fetched_at DESC)`.

### 5. Caching & Endpoint Rate Limiting
- **Redis Read-Through Cache**: `GET /trending` responses are cached in Redis (with TTL `300s`) and automatically fall back to an in-memory `Map` store if Redis is unavailable.
- **Client Endpoint Rate Limits**:
  - `GET /trending`: 60 requests/minute
  - `GET /sources`: 30 requests/minute
  - `POST /refresh`: 5 requests/minute

---

## 🚀 How to Run Locally

### 1. Setup Environment Variables
Configure `.env` with your database credentials and market API tokens:
```env
PORT=8000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Prax@2003
DB_NAME=aggregator_db

REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=300

REFRESH_TOKEN=secret123

TWELVE_DATA_API_KEY=your_key
FMP_API_KEY=your_key
ALPHA_VANTAGE_API_KEY=your_key
TIINGO_API_KEY=your_key
```

### 2. Run Database Migrations
Runs schema migrations (auto-creating `aggregator_db` if needed):
```bash
npm run migrate
```

### 3. Start Development Server
Starts the Express server with nodemon auto-reload:
```bash
npm run dev
```

### 4. Run with Docker Compose
Orchestrates isolated PostgreSQL, Redis, and API containers:
```bash
docker compose up --build
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Service health status |
| `GET` | `/trending` | Public | Returns market items aggregated across sources |
| `GET` | `/trending?source=fmp` | Public | Returns market items filtered by source |
| `GET` | `/sources` | Public | Upstream source API health, latency, and status |
| `POST` | `/refresh` | Protected | Manual background refresh trigger (Header: `Bearer secret123`) |

---

## ⚖️ Technical Trade-offs & Rationale

- **Raw SQL Queries vs ORM**: Used parameterized SQL queries in `recordModel.js` rather than an ORM to keep memory consumption minimal and queries explicit.
- **In-Memory Cache Fallback**: Implemented an in-memory `Map` fallback in `redis.js` so developers can run the API locally without forcing a local Redis daemon setup.

---

## 🤖 AI Disclosure

- **AI Tools Used**: Utilized AI coding tools for initial template setup, boilerplate syntax, and documentation formatting.
- **Self-Engineered Architecture**: Designed the MVC directory layout, multi-source payload normalization, `Promise.allSettled` error handling strategy, database migration evolution, and provider-specific rate limiters.