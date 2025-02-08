require('dotenv').config();

export const redisUrl = process.env.REDIS_IO; // Your Upstash Redis URL
export const dbUrl = process.env.DATABASE_URL; // Your Railway PostgreSQL URL

export const pusherCluster = process.env.PUSHER_CLUSTER || "";
export const pusherId = process.env.PUSHER_APP_ID || "";
export const port = process.env.PORT || 3003;