import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request } from "express";

const num = (name: string, fallback: number): number => {
    const raw = process.env[name];
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const base: Partial<Options> = {
    standardHeaders: true,
    legacyHeaders: false,
    // /health must stay reachable — Railway's probe and the cron ping share one IP
    skip: (req: Request) => req.path === "/health",
};

const json = (error: string) => ({ error });

// Burst guard: absorbs floods in the first second instead of waiting a full minute
export const burstLimiter = rateLimit({
    ...base,
    windowMs: 1000,
    limit: num("RATE_LIMIT_BURST", 15),
    message: json("Slow down — too many requests per second."),
});

// Global ceiling per IP
export const globalLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: num("RATE_LIMIT_GLOBAL", 100),
    message: json("Too many requests, please try again later."),
});

// Order writes touch the engine queue
export const orderLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: num("RATE_LIMIT_ORDER", 30),
    message: json("Too many order requests, please slow down."),
});

// Per-account ceiling, so one user can't multiply their quota by rotating IPs.
// Chained after orderLimiter — an attacker rotating userIds still hits the IP limit.
export const orderUserLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: num("RATE_LIMIT_ORDER_USER", 60),
    keyGenerator: (req: Request) => {
        const userId = req.body?.userId ?? req.query?.userId;
        if (typeof userId === "string" && userId) return `user:${userId}`;
        // ipKeyGenerator masks IPv6 to its /64 — otherwise a v6 client rotates
        // addresses within its own prefix and walks straight past this limit
        return `anon:${ipKeyGenerator(req.ip ?? "")}`;
    },
    message: json("Too many order requests for this account, please slow down."),
});

// Kline hits Postgres
export const klineLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: num("RATE_LIMIT_KLINE", 20),
    message: json("Too many kline requests, please slow down."),
});

// Depth hits Redis + the engine on every call
export const depthLimiter = rateLimit({
    ...base,
    windowMs: 60 * 1000,
    limit: num("RATE_LIMIT_DEPTH", 60),
    message: json("Too many depth requests, please slow down."),
});
