import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CIVILE-APP API',
      version: '1.0.0',
      description: 'Documentation OpenAPI générée depuis le code (JSDoc) pour CIVILE-APP.',
    },
    servers: [
      {
        url: env.backendUrl,
        description:
          process.env.NODE_ENV === 'production'
            ? 'API Server (Production)'
            : 'API Server (Local)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['src/routes/**/*.ts'],
};

console.log('[Swagger] URL du serveur utilisé :', env.backendUrl);

export const swaggerSpec = swaggerJSDoc(options);
