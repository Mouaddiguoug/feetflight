//@ts-ignore


/**
 * @deprecated This Express middleware is deprecated and will be removed in a future version.
 * Use the Elysia `sellerGuard()` plugin from `src/plugins/seller.plugin.ts` instead.
 *
 * Migration example:
 * Before (Express):
 *   router.get('/sellers/payout/:id', authMiddleware, sellerMiddleware, controller.getPayoutAccounts)
 *
 * After (Elysia):
 *   .use(authGuard()).use(sellerGuard()).get('/sellers/payout/:id', ({ user, seller }) => { ... })
 *
 * Benefits of new plugin:
 * - Properly closes Neo4j sessions (fixes session leak)
 * - Uses correct HTTP status code (403 Forbidden instead of 400 Bad Request)
 * - Type-safe context extension
 * - Structured logging with Pino
 * - Consistent error handling with custom error classes
 */
const sellerMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const userId = String(req.params.id);

  const isVerifiedSession = initializeDbConnection().session();

  try {
    const isVerifiedUser = await isVerifiedSession.executeRead(tx =>
      tx.run('match (u:user {id: $userId})-[:IS_A]-(s:seller) return u, s', {
        userId: userId,
      }),
    );

    console.log(isVerifiedUser.records.map(record => record.get('u').properties.verified)[0]);

    if (isVerifiedUser.records.map(record => record.get('s')).length > 0) {
      if (isVerifiedUser.records.map(record => record.get('u').properties.verified)[0]) {
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
