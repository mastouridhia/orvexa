import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from '../utils/openapi.js';
import { versionInfo } from '../utils/version.js';

export const docsRouter = Router();

docsRouter.get('/docs.json', (_req, res) => {
  res.json(buildOpenApiDocument(versionInfo.version));
});

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: { url: '/docs.json' },
    customSiteTitle: 'Orvexa API Docs',
  }),
);
