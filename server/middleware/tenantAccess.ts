import { Request, Response, NextFunction } from 'express';
import { readTenantsStore } from '../services/db';
import { NODE_ENV } from '../config';
import { logger } from '../lib/logger';

export async function tenantAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Test bypass — skip ownership check but still allow through
  if (NODE_ENV === 'test' && req.headers['x-test-auth-bypass'] === 'true') {
    return next();
  }

  const tenantId = req.params.id;
  const user = (req as any).user;

  if (!user?.uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const store = await readTenantsStore();
    const tenant = store[tenantId];

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    // Allow access if tenant has no ownerId set yet (migration grace period)
    // OR if ownerId matches the authenticated user's Firebase UID
    if (tenant.ownerId && tenant.ownerId !== user.uid) {
      logger.warn(
        { tenantId, uid: user.uid, ownerId: tenant.ownerId },
        'Cross-tenant access blocked'
      );
      res.status(403).json({ error: 'Forbidden: you do not own this tenant' });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err, tenantId }, 'tenantAccessMiddleware error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
