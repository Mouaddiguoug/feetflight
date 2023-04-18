import { Router } from 'express';
import UsersController from '@controllers/users.controller';
import { CreateUserDto } from '@dtos/users.dto';
import { Routes } from '@interfaces/routes.interface';
import validationMiddleware from '@middlewares/validation.middleware';

class UsersRoute implements Routes {
  public path = '/users';
  public router = Router();
  public usersController = new UsersController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id`, this.usersController.getUserById);
    this.router.get(`${this.path}`, this.usersController.getUsers);
    this.router.post(`${this.path}/buy/:id`, this.usersController.buyPost);
    this.router.post(`${this.path}/subscribe/:id`, this.usersController.subscribe);
    this.router.get(`${this.path}/confirmation/:token`, this.usersController.emailConfirming);
    this.router.get(`${this.path}/:email`, this.usersController.changePassword);
    this.router.put(`${this.path}/:id`, this.usersController.updateUser);
    this.router.post(`${this.path}/desactivate/:id`, this.usersController.desactivateUser);
  }
}

export default UsersRoute;
