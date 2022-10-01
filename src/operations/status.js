import { version } from '../lib/api-spec.js';
import { cacheHits, cacheMisses } from '../lib/database.js';

export function getStatus(req, res) {
    req.skipLog = true;
    res.json({
        version,
        hostname: process.env.HOSTNAME || 'local',
        cache: {
            hits: cacheHits,
            misses: cacheMisses,
            rate: `${Math.round(cacheHits / (cacheHits + cacheMisses) * 10000)/100}%`
        }
    });
}