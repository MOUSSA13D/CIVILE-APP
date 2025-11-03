import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './env.js';
const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'CIVILE-APP API',
            version: '1.0.0',
            description: 'Documentation OpenAPI pour CIVILE-APP',
            contact: {
                name: 'Support',
                email: 'support@civile-app.com',
            },
        },
        servers: [
            {
                url: `${env.backendUrl}/api`,
                description: process.env.NODE_ENV === 'production'
                    ? 'API Server (Production)'
                    : 'API Server (Local)',
            },
        ],
        components: {
            schemas: {
                UpdateDeclaration: {
                    type: 'object',
                    properties: {
                        child: {
                            type: 'object',
                            properties: {
                                firstName: { type: 'string' },
                                lastName: { type: 'string' },
                                birthDate: { type: 'string', format: 'date' },
                                birthPlace: { type: 'string' },
                                sex: { type: 'string', enum: ['M', 'F'] },
                                weightAtBirth: { type: 'number' },
                                heightAtBirth: { type: 'number' }
                            }
                        },
                        mother: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                nationality: { type: 'string' },
                                birthDate: { type: 'string', format: 'date' },
                                profession: { type: 'string' },
                                phoneNumber: { type: 'string' },
                                address: {
                                    type: 'object',
                                    properties: {
                                        street: { type: 'string' },
                                        city: { type: 'string' },
                                        postalCode: { type: 'string' },
                                        country: { type: 'string' }
                                    }
                                }
                            }
                        },
                        father: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                nationality: { type: 'string' },
                                birthDate: { type: 'string', format: 'date' },
                                profession: { type: 'string' },
                                phoneNumber: { type: 'string' },
                                address: {
                                    type: 'object',
                                    properties: {
                                        street: { type: 'string' },
                                        city: { type: 'string' },
                                        postalCode: { type: 'string' },
                                        country: { type: 'string' }
                                    }
                                }
                            }
                        },
                        hospital: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                phoneNumber: { type: 'string' },
                                address: {
                                    type: 'object',
                                    properties: {
                                        street: { type: 'string' },
                                        city: { type: 'string' },
                                        postalCode: { type: 'string' },
                                        country: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        phone: { type: 'string' },
                        address: { type: 'string' },
                        role: { type: 'string', enum: ['parent', 'mairie', 'hopital'] },
                        isVerified: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Declaration: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        parent: { $ref: '#/components/schemas/User' },
                        status: {
                            type: 'string',
                            enum: ['pending', 'in_verification', 'validated', 'rejected']
                        },
                        child: { type: 'object' },
                        mother: { type: 'object' },
                        father: { type: 'object' },
                        hospital: { type: 'object' },
                        rejectionReason: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
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
        'src/routes/*.ts',
        'src/models/*.ts',
    ],
};
export const swaggerSpec = swaggerJSDoc(options);
// Fonction pour configurer Swagger UI
export function setupSwagger(app) {
    // Route pour la documentation Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'CIVILE-APP API Documentation',
    }));
    // Route pour le fichier JSON de la spécification
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
    console.log('[Swagger] Documentation disponible à /api-docs');
}
// Export par défaut pour la rétrocompatibilité
export default swaggerSpec;
//# sourceMappingURL=swagger.js.map