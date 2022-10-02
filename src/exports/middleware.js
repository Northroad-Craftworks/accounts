import defaultLogger from '../lib/logger.js';
import { Router } from 'express';

export default function createAccountsMiddleware(options) {
    const logger = options?.logger || defaultLogger;

    const router = new Router();
    router.use((req, res, next) => {
        logger.warn("You're using the Accounts middleware, but it's not working yet!");
        next();
    })

    return router;
}