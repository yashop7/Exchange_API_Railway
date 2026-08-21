import type { Request, Response, NextFunction, RequestHandler } from "express";

// Express 4 does not catch rejections from async handlers — they surface as
// unhandled rejections and kill the process. Every async route goes through this.
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
