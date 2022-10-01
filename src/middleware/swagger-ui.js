import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { apiSpec } from '../lib/api-spec.js';
import { disableLog, enableLog } from './logger.js';
import logger from '../lib/logger.js'

const router = new Router();
export default router;

// Serve the API docs.
router.use('/api-docs', disableLog, swaggerUi.serve, enableLog);
router.get('/api-docs', swaggerUi.setup(apiSpec, { customCssUrl: '/css/swagger-dark.css' }));
