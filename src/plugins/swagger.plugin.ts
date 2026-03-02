import type { Application } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from '@/common/config';

export const registerSwagger = (app: Application): void => {
  const specification = swaggerJSDoc({
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Loan Management System API',
        version: '1.0.0',
        description: 'Scaffolded API documentation for the Loan Management System.',
      },
      servers: [
        {
          url: config.api.baseUrl,
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
    },
    apis: ['src/app.ts', 'src/modules/**/*.ts'],
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specification));
};
