import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { orderRouter } from "./routes/order";
import { depthRouter } from "./routes/depth";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";
import { tickersRouter } from "./routes/ticker";
import * as cron from 'node-cron';

const PORT = process.env.PORT || 3003;
const app = express();
// Railway (and most PaaS) sit behind a reverse proxy — trust one hop so
// express-rate-limit can read the real client IP from X-Forwarded-For
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Global limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});

// Stricter limiter for order writes: 30 per minute per IP
const orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many order requests, please slow down." },
});

// Kline hits the DB — cap at 20 per minute per IP
const klineLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many kline requests, please slow down." },
});

app.use(globalLimiter);

app.use("/api/v1/order", orderLimiter, orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineLimiter, klineRouter);
app.use("/api/v1/tickers", tickersRouter);

app.get("/health", (_req, res) => {
    res.send("Hello World");
});

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

// Cron job to keep the server alive
cron.schedule('*/12 * * * *', () => {
    console.log('Health check - server is alive');
});
