import { NextFunction, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';

const fileMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.files) {
        console.log(req.files);
      const fileeData = req.files;
      const filesTooLard = [];
      for (let key in fileeData) {
        if (fileeData[key][0].size > 2000000) return filesTooLard.push(fileeData[key][0].fieldname);
      }
      if (filesTooLard.length > 0) {
        console.log(filesTooLard);
        return next(new HttpException(401, `${filesTooLard} too large`));
      }
      next();
    } else if (req.file) {
      const fileData = req.file;
      if (fileData.size > 2000000) return next(new HttpException(401, `${fileData.fieldname} is too large`));
      next();
    } else {
      next(new HttpException(404, 'file needed'));
    }
  } catch (error) {
    next(new HttpException(401, error));
  }
};

export default fileMiddleware;
