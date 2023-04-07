import { NextFunction, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { SECRET_KEY } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
      const secretKey: string = SECRET_KEY;
      const verificationResponse = (await verify(Authorization, secretKey)) as DataStoredInToken;
      const userId = verificationResponse.id;
      const IsVerfied = await authMiddlewareSession.executeRead(tx => tx.run('match (u:user {u:user userId: $userId} return u', {
        userId: userId
      }));

      if (foundUser) {
        req.data.user = foundUser;
        next();
      } else {
        next(new HttpException(401, 'Wrong authentication token'));
      }
  } catch (error) {
    next(new HttpException(401, 'Wrong authentication token'));
  }
};

export default authMiddleware;
