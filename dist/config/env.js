import dotenv from 'dotenv';
import path from 'path';
const envFile = process.env.NODE_ENV === 'production'
    ? path.resolve(process.cwd(), '.env.production')
    : path.resolve(process.cwd(), '.env');
dotenv.config({ path: envFile });
export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 4000),
    mongoUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    corsOrigin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((url) => url.trim())
        : ['http://localhost:3000', 'http://localhost:4000'],
    backendUrl: process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 4000}`,
};
if (!env.mongoUri) {
    console.warn('[env] ⚠️ MONGODB_URI n’est pas défini !');
}
console.log('[CORS] Origines autorisées :', env.corsOrigin);
//# sourceMappingURL=env.js.map