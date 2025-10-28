import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db';
import { errorHandler, notFound } from './middleware/error';
import authRoutes from './routes/auth.routes';
import declarationRoutes from './routes/declarations.routes';
import mairieRoutes from './routes/mairie.routes';
import hospitalRoutes from './routes/hospital.routes';
import { setupSwagger } from './config/swagger';

// Initialiser l'application Express
const app = express();

// Configuration CORS
const allowedOrigins = ['http://localhost:3000', 'http://localhost:4000'];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration Swagger
setupSwagger(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/declarations', declarationRoutes);
app.use('/api/mairie', mairieRoutes);
app.use('/api/hopital', hospitalRoutes);

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

// Connexion à la base de données
connectDB();

export default app;
