import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order";
import { depthRouter } from "./routes/depth";
import { tradesRouter } from "./routes/trades";
import { klineRouter } from "./routes/kline";
import { tickersRouter } from "./routes/ticker";
import * as cron from 'node-cron';

const PORT = process.env.PORT || 3003;
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineRouter);
app.use("/api/v1/tickers", tickersRouter);


app.get("/health", (req , res) => {
    res.send("Hello World");
});

app.listen(PORT, () => {
    console.log("Health check - server is alive from the HTTP");
    console.log(`API Server running on port ${PORT}`);
  });
  
  
  // Cron job to keep the server alive
cron.schedule('*/12 * * * *', () => {
    console.log('Health check - server is alive');
});
