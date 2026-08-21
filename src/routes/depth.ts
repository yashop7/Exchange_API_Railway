import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_DEPTH } from "../types";
import { asyncHandler } from "../middleware/asyncHandler";

export const depthRouter = Router();

depthRouter.get("/", asyncHandler(async (req, res) => {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== "string") {
        return res.status(400).json({ error: "symbol is required" });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_DEPTH,
        data: {
            market: symbol
        }
    });

    res.json(response.payload);
}));
