import { NextFunction, Request, Response } from 'express';
import { CreateUserDto } from '@dtos/users.dto';
import { User } from '@interfaces/users.interface';
import userService from '@services/users.service';

class UsersController {
  public userService = new userService();

  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const findAllUsersData: User[] = await this.userService.findAllUser();

      res.status(200).json({ data: findAllUsersData, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const findOneUserData = await this.userService.findUserById(userId);

      res.status(200).json({ data: findOneUserData });
    } catch (error) {
      next(error);
    }
  };

  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const email = String(req.params.email);
      const userData = req.body;
      const findOneUserData = await this.userService.changePassword(email, userData);

      res.status(200).json({ data: findOneUserData, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public emailConfirming = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = String(req.params.token);
      const confirmed = await this.userService.emailConfirming(token);

      res.status(201).json({ data: confirmed });
    } catch (error) {
      next(error);
    }
  };

  public buyPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = String(req.params.id);
      const saleData = req.body;

      const boughtPost = await this.userService.buyPosts(userId, saleData);

      res.status(200).json({ data: boughtPost });
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = Number(req.params.id);
      const userData: CreateUserDto = req.body;
      const updateUserData: User[] = await this.userService.updateUser(userId, userData);

      res.status(200).json({ data: updateUserData, message: 'updated' });
    } catch (error) {
      next(error);
    }
  };

  public desactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = Number(req.params.id);
      const desactivatedUser = await this.userService.desactivateUser(userId);

      res.status(200).json({ data: desactivatedUser });
    } catch (error) {
      next(error);
    }
  };
}

export default UsersController;
