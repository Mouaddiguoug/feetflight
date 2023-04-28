import { NextFunction, Request, Response } from 'express';
import adminService from '@/services/admin.service';

class AdminController {
  public adminService = new adminService();

  public getSellerIdentityCardSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userid = String(req.params.id);
      const identityCard = await this.adminService.getSellerIdentityCard(userid);

      res.status(201).json({ identityCardData: identityCard });
    } catch (error) {
      console.log(error);
    }
  };

  public getUnverifiedSellers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const unverifiedSellers = await this.adminService.getUnverifiedSellers();

      res.status(201).json({ unverifiedSellers: unverifiedSellers });
    } catch (error) {
      console.log(error);
    }
  };
}

export default AdminController;
