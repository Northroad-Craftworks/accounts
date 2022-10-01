import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { apiSpec } from '../lib/api-spec.js';
import { disableLog, enableLog } from './logger.js';

const router = new Router();
export default router;

const options = {
  customCss: '.swagger-ui .topbar { display: none }',
  customCssUrl: '/css/swagger-dark.css'
}

// Serve the API docs.
router.use('/api-docs', disableLog, swaggerUi.serve, enableLog);
router.get('/api-docs', swaggerUi.setup(apiSpec, options));
