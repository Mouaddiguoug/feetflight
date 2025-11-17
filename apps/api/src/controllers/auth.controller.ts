import { NextFunction, Request, Response } from 'express';
import { RequestWithUser } from '@interfaces/auth.interface';
import { User } from '@feetflight/shared-types';
import AuthService from '@services/auth.service';

/**
 * @deprecated This Express controller is deprecated and will be removed in a future version.
 * Controller logic has been migrated directly into Elysia route handlers in src/routes/auth.route.ts.
 *
 * Migration:
 * - Express pattern: Route → Controller → Service
 * - Elysia pattern: Route (with inline handler) → Service
 *
 * Benefits of new pattern:
 * - Eliminates unnecessary controller layer
 * - Direct access to Elysia context (auth, neo4j, log plugins)
 * - Type-safe request/response handling with TypeBox schemas
 * - Automatic validation and error handling
 * - Better performance (fewer function calls)
 * - Modern email delivery with Resend + React Email (replaces nodemailer + handlebars)
 *
 * The controller's responsibilities are now handled by:
 * 1. TypeBox schemas for validation (replaces manual checks)
 * 2. Route handlers for request/response logic (replaces controller methods)
 * 3. Error plugin for error handling (replaces try-catch with console.log)
 * 4. Service layer for business logic (refactored to be context-free)
 * 5. Resend + React Email for email delivery (replaces nodemailer + handlebars)
 *
 * To use the new Elysia routes:
 * ```typescript
 * import { authRoutes } from '@/routes/auth.route';
 *
 * const app = new Elysia()
 *   .use(authPlugin())
 *   .use(neo4jPlugin())
 *   .use(authRoutes())
 *   .listen(3000);
 * ```
 *
 * This controller will be removed once all Express dependencies are eliminated.
 */
class AuthController {
  public authService = new AuthService();

  public signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const signUpUserData = await this.authService.signup(userData);

      signUpUserData.message
        ? res.status(400).json(signUpUserData)
        : res.status(201).json(signUpUserData);
    } catch (error) {
      console.log(error);
    }
  };

  public logIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const loggedInData = await this.authService.login(userData);
      loggedInData.message
        ? res.status(403).json(loggedInData)
        : res.status(200).json(loggedInData);
    } catch (error) {
      console.log(error);
    }
  };

  public resendVerificationEMail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const email = String(req.params.email);
      await this.authService.resendVerificationEmail(email);
      res.status(200);
    } catch (error) {
      console.log(error);
    }
  };

  public changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userData = req.body;
      const email = String(req.params.email);
      const chengedData = await this.authService.changePassword(email, userData);
      console.log(chengedData.message);

      res.status(200).json(chengedData);
    } catch (error) {
      console.log(error);
    }
  };

  public generateRefreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.body.id;
      const loggedInData = await this.authService.refreshToken(id);
      res.status(200).json(loggedInData);
    } catch (error) {
      next(error);
    }
  };

  public logOut = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
