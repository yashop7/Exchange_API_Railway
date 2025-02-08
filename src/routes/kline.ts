import { Client } from 'pg';
import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { dbUrl } from '../config';

const pgClient = new Client({
    connectionString: dbUrl, // Railway's full connection URL
  });
  
  pgClient
    .connect()
    .then(() => console.log("🚀 Connected to Railway PostgreSQL!"))
    .catch((err) => console.error("❌ Connection error", err));

export const klineRouter = Router();

klineRouter.get("/", async (req, res) => {
    console.log("Fetching kline data...");
    const { market, interval, startTime, endTime } = req.query;

    let query;
    switch (interval) {
        case '1m':
            query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2`;
            break;
        case '1h':
            query = `SELECT * FROM klines_1h WHERE  bucket >= $1 AND bucket <= $2`;
            break;
        case '1w':
            query = `SELECT * FROM klines_1w WHERE bucket >= $1 AND bucket <= $2`;
            break;
        default:
            return res.status(400).send('Invalid interval');
    }

    try {
        //@ts-ignore
        const result = await pgClient.query(query, [new Date(startTime * 1000 as string), new Date(endTime * 1000 as string)]);
        res.json(result.rows.map(x => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quoteVolume,
            start: x.start,
            trades: x.trades,
            volume: x.volume,
        })));
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});