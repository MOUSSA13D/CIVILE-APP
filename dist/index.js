import express from 'express';
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
    app.use(helmet());
    app.use(cors({ origin: env.corsOrigin, credentials: true }));
    app.use(express.json({ limit: '5mb' }));
    app.use(morgan('dev'));
    app.use(rateLimit({
        windowMs: 60 * 1000,
        limit: 200,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    }));
    app.get('/', (_req, res) => {
        res.json({ name: 'CIVILE-APP Backend', status: 'ok', time: new Date().toISOString() });
    });
    app.use('/auth', authRoutes);
    app.use('/declarations', declarationRoutes);
    app.use('/mairie', mairieRoutes);
    app.use('/hopital', hospitalRoutes);
    // Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.use(errorHandler);
    app.listen(env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`API listening on http://localhost:${env.port}`);
    });
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
