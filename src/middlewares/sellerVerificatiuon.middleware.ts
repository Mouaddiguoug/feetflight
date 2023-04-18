import { NextFunction, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { SECRET_KEY } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { initializeDbConnection } from '@/app';

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

      if (isSellerVerified.records.map(record => record.get("s").properties.verified)) {
        req.data.user = isSellerVerified.records.map(record => record.get("s").properties;
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
