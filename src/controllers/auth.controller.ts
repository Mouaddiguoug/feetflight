import { NextFunction, Request, Response } from 'express';
import { CreateUserDto } from '@dtos/users.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { User } from '@interfaces/users.interface';
import AuthService from '@services/auth.service';

class AuthController {
  public authService = new AuthService();

  public signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const signUpUserData = await this.authService.signup(userData);

      signUpUserData.message ? res.status(201).json(signUpUserData) : res.status(302).json(signUpUserData);
    } catch (error) {
      console.log(error);
    }
  };

  public logIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const loggedInData = await this.authService.login(userData);
      res.status(200).json(loggedInData);
    } catch (error) {
      console.log(error)
    }
  };

  public generateRefreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.body.data.token;
      const loggedInData = await this.authService.refreshToken(token);
      res.status(200).json(loggedInData);
    } catch (error) {
      next(error);
    }
  };

  public logOut = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData: User = req.user;
      const logOutUserData: User = await this.authService.logout(userData);

      res.setHeader('Set-Cookie', ['Authorization=; Max-age=0']);
      res.status(200).json({ data: logOutUserData, message: 'logout' });
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
