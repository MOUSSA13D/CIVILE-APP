import dotenv from 'dotenv';
import path from 'path';

const envFile =
  process.env.NODE_ENV === 'production'
    ? path.resolve(process.cwd(), '.env.production')
    : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envFile });

// URL de base pour les environnements de production
const productionUrl = process.env.RENDER_EXTERNAL_URL 
  ? `https://${process.env.RENDER_EXTERNAL_URL}`
  : 'https://civile-app.onrender.com';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN
    ? [
        ...process.env.CORS_ORIGIN.split(',').map((url) => url.trim()),
        productionUrl
      ]
    : [
        'http://localhost:3000', 
        'http://localhost:4000',
        productionUrl
      ],
  backendUrl: process.env.BACKEND_URL || 
    (process.env.NODE_ENV === 'production' 
      ? productionUrl 
      : `http://localhost:${process.env.PORT || 4000}`),
};

if (!env.mongoUri) {
  console.warn('[env] ⚠️ MONGODB_URI n’est pas défini !');
}

console.log('[CORS] Origines autorisées :', env.corsOrigin);

