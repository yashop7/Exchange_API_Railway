# Exchange API

REST API server for a stock exchange. Acts as the gateway between clients and the matching engine — it receives HTTP requests, forwards them to the engine via a Redis queue, awaits the response over Redis pub/sub, and returns the result.

## Architecture

```
Client
  │
  ▼
Exchange API  (this repo — Express + TypeScript)
  │   ▲
  │   │  Redis queue (lPush "messages") + pub/sub (per-request channel)
  ▼   │
Matching Engine  (Hono — processes orders, manages orderbook)
  │
  ▼
PostgreSQL  (kline / candlestick data)
```

The API is stateless. Every request that needs engine interaction generates a random channel ID, subscribes to it, pushes the message to the `messages` queue, and resolves when the engine publishes the response back on that channel.

## Endpoints

All routes are prefixed with `/api/v1`.

### Orders — `/api/v1/order`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/order` | Place a new limit order |
| `DELETE` | `/api/v1/order` | Cancel an existing order |
| `GET` | `/api/v1/order/open?userId=&market=` | List open orders for a user |
| `POST` | `/api/v1/order/onramp` | Credit INR balance to a user account |
| `GET` | `/api/v1/order/balance?userId=&market=` | Get user balance and open orders |

**POST /api/v1/order body:**
```json
{
  "market": "TATA_INR",
  "price": "100",
  "quantity": "10",
  "side": "buy",
  "userId": "user123"
}
```

### Market Data

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/v1/depth` | `symbol` | Order book depth (bids & asks) |
| `GET` | `/api/v1/trades` | `market` | Recent trades (stub) |
| `GET` | `/api/v1/klines` | `market`, `interval`, `startTime`, `endTime` | Candlestick data from PostgreSQL |
| `GET` | `/api/v1/tickers` | — | List available markets |

**Kline intervals:** `1m`, `1h`, `1w`  
**Kline time params:** Unix timestamps (seconds)

### Health

```
GET /health  →  200 "Hello World"
```

## Rate Limits

| Route | Limit |
|-------|-------|
| All routes | 100 req/min per IP |
| `POST/DELETE /api/v1/order` | 30 req/min per IP |
| `GET /api/v1/klines` | 20 req/min per IP |

Standard `RateLimit-*` headers are included in every response.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_API_ENGINE_URL` | Yes | Redis connection URL (shared with the matching engine) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (for kline data) |
| `PORT` | No | HTTP port (default: `3003`) |

Copy `.env.example` and fill in the values:

```bash
cp .env.example .env
```

## Running Locally

**Prerequisites:** Node.js ≥ 20, Bun, a Redis instance, a PostgreSQL instance.

```bash
# Install dependencies
bun install

# Build TypeScript
bun run build

# Start
node dist/index.js
```

For development (build + run in one step):

```bash
bun run start
```

## Deployment (Railway)

The repo includes [`railway.json`](railway.json) and [`nixpacks.toml`](nixpacks.toml) for zero-config deploys on Railway.

1. Push to GitHub and import the repo in Railway.
2. Set `REDIS_API_ENGINE_URL` and `DATABASE_URL` in Railway's environment variable panel.
3. Railway auto-detects the Nixpacks config and runs `bun run start`.

The server sets `trust proxy 1` so `express-rate-limit` reads the real client IP from Railway's `X-Forwarded-For` header.

## Project Structure

```
src/
├── index.ts          # Express app setup, rate limiters, route mounting
├── config.ts         # Env var validation and exports
├── RedisManager.ts   # Singleton Redis client (queue publish + pub/sub subscribe)
├── routes/
│   ├── order.ts      # Order CRUD + balance + on-ramp
│   ├── depth.ts      # Order book depth
│   ├── trades.ts     # Recent trades
│   ├── kline.ts      # Candlestick data (PostgreSQL)
│   └── ticker.ts     # Available markets
└── types/
    ├── index.ts      # Message types from engine (responses)
    └── to.ts         # Message types to engine (requests)
```
