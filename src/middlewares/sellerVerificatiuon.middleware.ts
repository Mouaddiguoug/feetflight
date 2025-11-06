import { NextFunction, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { SECRET_KEY } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { initializeDbConnection } from '@/app';

/**
 * @deprecated This Express middleware is deprecated and will be removed in a future version.
 * Use the Elysia `sellerGuard()` plugin from `src/plugins/seller.plugin.ts` instead.
 *
 * ⚠️ WARNING: This middleware contains a bug in the Cypher query (line 14):
 * Current: 'match (u:user {u:user userId: $userId}-[:IS_A]-(s:seller) return s'
 * The query syntax is malformed: `{u:user userId:` should be `{id:`
 *
 * This bug is fixed in the new sellerGuard plugin.
 *
 * Migration: See `src/plugins/seller.plugin.ts` for the correct implementation.
 */
const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const isSellerVerifiedSession = initializeDbConnection().session();
    const userId = String(req.params.id);
    if (userId) {
      const isSellerVerified = await isSellerVerifiedSession.executeRead(tx =>
        tx.run('match (u:user {u:user userId: $userId}-[:IS_A]-(s:seller) return s', {
          userId: userId,
        }),
      );

      if (isSellerVerified.records.map(record => record.get('s').properties.verified)) {
        next();
      } else {
        next(new HttpException(401, 'this user is not verified yet'));
      }
    } else {
      next(new HttpException(404, 'user id needed'));
    }
  } catch (error) {
    next(new HttpException(401, error));
  }
};

export default authMiddleware;
