import { Router } from "express";
import { Pool } from 'pg';
import { dbUrl } from '../config';

const pgPool = new Pool({ connectionString: dbUrl });

pgPool.connect()
    .then(() => console.log("🚀 Connected to Railway PostgreSQL!"))
    .catch((err) => console.error("❌ Connection error", err));

export const klineRouter = Router();

klineRouter.get("/", async (req, res) => {
    const { market, interval, startTime, endTime } = req.query;

    if (!market || typeof market !== 'string') {
        return res.status(400).json({ error: 'market is required' });
    }
    if (!startTime || !endTime || isNaN(Number(startTime)) || isNaN(Number(endTime))) {
        return res.status(400).json({ error: 'startTime and endTime must be valid unix timestamps' });
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
    `;
    const start = new Date(Number(startTime) * 1000);
    const end = new Date(Number(endTime) * 1000);

    try {
        const result = await pgPool.query(query, [market, start, end]);
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
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
