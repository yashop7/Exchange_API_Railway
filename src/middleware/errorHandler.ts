import type { Request, Response, NextFunction } from "express";

export const notFound = (_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
};

export const errorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status >= 500) {
        console.error("Unhandled error:", err?.message ?? err);
    }
    if (res.headersSent) return;
    // Only errors we raised ourselves (expose) may show their message on a 5xx —
    // anything else could leak internals to the caller
    const safe = status < 500 || err?.expose === true;
    res.status(status).json({
        error: safe ? err?.message ?? "Request failed" : "Internal server error",
    });
};
