import { NextFunction, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { SECRET_KEY } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface';
import { initializeDbConnection } from '@/app';
import { RolesEnum } from '@/enums/RolesEnums';

const sellerMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const userId = String(req.params.id);
  

  const isVerifiedSession = initializeDbConnection().session();

  try {
    var isVerifiedUser = await isVerifiedSession.executeRead(
      tx => tx.run("match (u:user {id: $userId})-[:IS_A]-(s:seller) return u, s", {
        userId: userId
      })
    )

    console.log(isVerifiedUser.records.map(record => record.get("u").properties.verified)[0]);
    
  
    if (isVerifiedUser.records.map(record => record.get("s")).length > 0) {
      if(isVerifiedUser.records.map(record => record.get("u"). properties.verified)[0]){
        next();
      } else {
        next(new HttpException(400, 'this user is not verified yet'));
      }
    } else {
      next(new HttpException(400, 'this user is not a seller'));
    }
  } catch (error) {
    console.log(error);
  }
};

export default sellerMiddleware;
