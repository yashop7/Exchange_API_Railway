require('dotenv').config();

const required = (name: string): string => {
    const val = process.env[name];
    if (!val) throw new Error(`Missing required env var: ${name}`);
    return val;
};

export const redisUrl = required('REDIS_API_ENGINE_URL');
export const dbUrl    = required('DATABASE_URL');
export const port     = process.env.PORT || 3003;