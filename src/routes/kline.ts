import { Router } from "express";
import { Pool } from 'pg';
import { dbUrl } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';

// Bounded pool + per-statement timeout: under a flood the DB is the first thing
// to fall over, and an unbounded pool turns that into a dead server.
const pgPool = new Pool({
    connectionString: dbUrl,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 5_000,
});

pgPool.on('error', (err) => console.error('Postgres pool error:', err.message));

pgPool.connect()
    .then((client) => { client.release(); console.log("🚀 Connected to Railway PostgreSQL!"); })
    .catch((err) => console.error("❌ Connection error", err));

// Hard ceiling on rows per response — one request must not be able to pull the
// whole table into memory.
const MAX_ROWS = Number(process.env.KLINE_MAX_ROWS) || 1500;

export const klineRouter = Router();

klineRouter.get("/", asyncHandler(async (req, res) => {
    const { market, interval, startTime, endTime } = req.query;

    if (!market || typeof market !== 'string') {
        return res.status(400).json({ error: 'market is required' });
    }
    if (!startTime || !endTime || isNaN(Number(startTime)) || isNaN(Number(endTime))) {
        return res.status(400).json({ error: 'startTime and endTime must be valid unix timestamps' });
    }
    if (Number(startTime) > Number(endTime)) {
        return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    let table: string;
    switch (interval) {
        case '1m': table = 'klines_1m'; break;
        case '1h': table = 'klines_1h'; break;
        case '1w': table = 'klines_1w'; break;
        default:
            return res.status(400).json({ error: 'interval must be 1m, 1h, or 1w' });
    }

    // currency_code is null for legacy rows — treat null as TATA_INR
    const query = `
        SELECT * FROM ${table}
        WHERE COALESCE(currency_code, 'TATA_INR') = $1
          AND bucket >= $2
          AND bucket <= $3
        ORDER BY bucket ASC
        LIMIT $4
    `;
    const start = new Date(Number(startTime) * 1000);
    const end = new Date(Number(endTime) * 1000);

    const result = await pgPool.query(query, [market, start, end, MAX_ROWS]);
    res.json(result.rows.map(x => ({
        open:        x.open,
        high:        x.high,
        low:         x.low,
        close:       x.close,
        volume:      x.volume,
        start:       x.bucket,
        end:         x.bucket,
        quoteVolume: null,
        trades:      null,
    })));
}));
