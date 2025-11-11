
const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const Authorization = req.cookies['Authorization'] || (req.header('Authorization') ? req.header('Authorization').split('Bearer ')[1] : null);
  const authMiddlewareSession = initializeDbConnection().session();
  if (Authorization) {
    try {
      const secretKey: string = SECRET_KEY;
      const verificationResponse = verify(Authorization, secretKey) as DataStoredInToken;

      const userId = verificationResponse.id;
      console.log(verificationResponse);

      const foundUser = await authMiddlewareSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: userId,
        }),
      );

      if (foundUser.records.length > 0) {
        next();
      } else {
        next(new HttpException(400, 'Wrong authentication token'));
      }
    } catch (error) {
      console.log(error);
      next(new HttpException(401, 'missing token'));
    }
  } else {
    next(new HttpException(400, 'Authentication token missing'));
  }
};

export default authMiddleware;
