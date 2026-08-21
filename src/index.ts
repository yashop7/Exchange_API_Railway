import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order";
import { depthRouter } from "./routes/depth";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";
import { tickersRouter } from "./routes/ticker";
import {
    burstLimiter,
    globalLimiter,
    orderLimiter,
    orderUserLimiter,
    klineLimiter,
    depthLimiter,
} from "./middleware/rateLimit";
import { notFound, errorHandler } from "./middleware/errorHandler";
import * as cron from 'node-cron';

const PORT = process.env.PORT || 3003;
const app = express();
// Railway (and most PaaS) sit behind a reverse proxy — trust one hop so
// express-rate-limit can read the real client IP from X-Forwarded-For
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Health check is registered before the limiters so a flood can never make the
// platform think the app is down and cycle it.
app.get("/health", (_req, res) => {
    res.send("Hello World");
});

app.use(cors());
// Cap body size — an unbounded JSON body is a cheap way to exhaust memory
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "10kb" }));

app.use(burstLimiter);
app.use(globalLimiter);

app.use("/api/v1/order", orderLimiter, orderUserLimiter, orderRouter);
app.use("/api/v1/depth", depthLimiter, depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineLimiter, klineRouter);
app.use("/api/v1/tickers", tickersRouter);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

// Drop slow/idle attacker connections instead of holding sockets open forever
server.keepAliveTimeout = 20_000;
server.headersTimeout = 25_000;
server.requestTimeout = 30_000;

// Last line of defence: a stray rejection or throw must not take the process down
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});

// Cron job to keep the server alive
cron.schedule('*/12 * * * *', () => {
    console.log('Health check - server is alive');
});
