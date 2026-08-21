import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { CREATE_ORDER, CANCEL_ORDER, ON_RAMP, GET_OPEN_ORDERS } from "../types";
import { asyncHandler } from "../middleware/asyncHandler";

export const orderRouter = Router();

orderRouter.post("/", asyncHandler(async (req, res) => { //User makes a Request Here
    const { market, price, quantity, side, userId } = req.body;
    if (!market || !userId || price === undefined || quantity === undefined || !side) {
        return res.status(400).json({ error: "market, price, quantity, side and userId are required" });
    }

    const response = await RedisManager.getInstance().sendAndAwait({ //Sending it to Queue and then waiting for the 
        type: CREATE_ORDER,
        data: {
            market,
            price,
            quantity,
            side,
            userId
        }
    });
    res.json(response.payload);
}));

orderRouter.delete("/", asyncHandler(async (req, res) => {
    const { orderId, market } = req.body;
    if (!orderId || !market) {
        return res.status(400).json({ error: "orderId and market are required" });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: CANCEL_ORDER,
        data: {
            orderId,
            market
        }
    });
    res.json(response.payload);
}));

orderRouter.get("/open", asyncHandler(async (req, res) => {
    const { userId, market } = req.query;
    if (typeof userId !== "string" || typeof market !== "string") {
        return res.status(400).json({ error: "userId and market are required" });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_OPEN_ORDERS,
        data: {
            userId,
            market
        }
    });
    res.json(response.payload);
}));

orderRouter.post("/onramp", asyncHandler(async (req, res) => {
    const { amount, userId } = req.body;
    if (amount === undefined || !userId) {
        return res.status(400).json({ error: "amount and userId are required" });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: ON_RAMP,
        data: {
            amount,
            userId,
            // txnId
        }
    });
    res.json(response.payload);
}));

orderRouter.get("/balance", asyncHandler(async (req, res) => {
    const { userId, market } = req.query;
    if (typeof userId !== "string") {
        return res.status(400).json({ error: "userId is required" });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: "GET_BALANCE",
        data: {
            userId,
            market: market as string
        },
    });
    res.json(response.payload);
}));
