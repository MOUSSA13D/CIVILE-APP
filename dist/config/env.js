import dotenv from 'dotenv';
dotenv.config();
export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 4000),
    mongoUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    corsOrigin: process.env.CORS_ORIGIN || '*',
};
if (!env.mongoUri) {
    // Allow empty for first run, but log a warning
    // eslint-disable-next-line no-console
    console.warn('[env] MONGODB_URI is not set. Set it in .env before connecting to DB.');
}
