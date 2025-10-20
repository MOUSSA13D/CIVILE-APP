import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/error.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

import authRoutes from './routes/auth.routes.js';
import declarationRoutes from './routes/declarations.routes.js';
import mairieRoutes from './routes/mairie.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';

async function main() {
  await connectDB();

  const app = express();

  // Sécurité et logs
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan('dev'));

  // Limitation de requêtes
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 200,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    })
  );

  // Route de test
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'CIVILE-APP Backend',
      status: 'ok',
      environment: env.nodeEnv,
      time: new Date().toISOString(),
    });
  });

  // Routes API
  app.use('/auth', authRoutes);
  app.use('/declarations', declarationRoutes);
  app.use('/mairie', mairieRoutes);
  app.use('/hopital', hospitalRoutes);

  // Swagger UI (OpenAPI)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Middleware d'erreurs
  app.use(errorHandler);

  // Démarrage serveur
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
    if (env.nodeEnv === 'production') {
      console.log(`[Production] Swagger disponible via ${env.backendUrl}/api-docs`);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
