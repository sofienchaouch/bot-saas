import { Request, Response, NextFunction } from 'express';
import { readTenantsStore, claimTenantOwnership } from '../services/db';
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

  const tenantId = req.params.id ?? (req.params as Record<string, string>).tenantId;
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

    // Unowned tenant: first authenticated user to access it claims ownership
    // (atomic — a concurrent claim by another user wins or loses cleanly).
    if (!tenant.ownerId) {
      const owner = await claimTenantOwnership(tenantId, user.uid);
      if (owner !== user.uid) {
        logger.warn(
          { tenantId, uid: user.uid, ownerId: owner },
          'Cross-tenant access blocked (lost ownership claim race)'
        );
        res.status(403).json({ error: 'Forbidden: you do not own this tenant' });
        return;
      }
      logger.info({ tenantId, uid: user.uid }, 'Tenant ownership claimed on first access');
      return next();
    }

    if (tenant.ownerId !== user.uid) {
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
