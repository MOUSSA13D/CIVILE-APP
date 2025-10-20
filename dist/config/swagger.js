import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';
const port = env.port;
const serverUrl = `http://localhost:${port}`;
const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'CIVILE-APP API',
            version: '1.0.0',
            description: 'Documentation OpenAPI pour CIVILE-APP',
        },
        servers: [
            { url: serverUrl, description: 'Local dev' },
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
    apis: [
        'src/routes/**/*.ts',
        'src/**/*.ts',
    ],
};
export const swaggerSpec = swaggerJSDoc(options);
