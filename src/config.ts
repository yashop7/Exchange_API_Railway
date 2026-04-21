require('dotenv').config();

export const redisUrl = process.env.REDIS_API_ENGINE_URL;
export const dbUrl = process.env.DATABASE_URL; // Your Railway PostgreSQL URL

export const port = process.env.PORT || 3003;