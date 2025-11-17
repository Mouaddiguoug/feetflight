import { InternalServerError, NotFoundError } from '@/plugins/error.plugin';
import type { Session } from 'neo4j-driver';
import { Tneo4j } from '@/plugins/neo4j.plugin';
import { Logger } from 'pino';

export interface AdminServiceDeps {
  neo4j: Tneo4j;
  log?: Logger;
}

export async function getUnverifiedSellers(deps: AdminServiceDeps): Promise<any[]> {
  const { neo4j, log } = deps;

  try {
    const sellers = await neo4j.withSession(async (session: Session) => {
      const result = await session.executeRead((tx) =>
        tx.run('MATCH (s:seller {verified: false}) RETURN s')
      );
      return result.records.map((record) => record.get('s').properties);
    });

    return sellers;
  } catch (error) {
    log?.error({ error }, 'Get unverified sellers failed');
    throw new InternalServerError(
      `Failed to get unverified sellers: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getSellerIdentityCard(
  userId: string,
  deps: AdminServiceDeps
): Promise<{ frontSide: string; backSide: string }> {
  const { neo4j, log } = deps;

  try {
    const identityCard = await neo4j.withSession(async (session: Session) => {
      const result = await session.executeRead((tx) =>
        tx.run('MATCH (user {id: $userid})-[:IS_A]-(s:seller) RETURN s', {
          userid: userId,
        })
      );

      if (result.records.length === 0) {
        throw new NotFoundError('Seller not found');
      }

      const sellerProperties = result.records[0]?.get('s').properties;

      return {
        frontSide: sellerProperties.frontIdentityCard,
        backSide: sellerProperties.backIdentityCard, // Fixed typo: was backtIdentityCard
      };
    });

    return identityCard;
  } catch (error) {
    log?.error({ error, userId }, 'Get seller identity card failed');

    // Re-throw NotFoundError as-is
    if (error instanceof NotFoundError) {
      throw error;
    }

    throw new InternalServerError(
      `Failed to get seller identity card: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * @deprecated Legacy adminService class for backward compatibility with Express controller
 */
class adminService {
  private deps: AdminServiceDeps;

  /**
   * Constructor accepting optional dependencies.
   * If no dependencies provided, methods will throw errors.
   *
   * @param deps - Optional admin service dependencies (neo4j, log)
   */
  constructor(deps?: AdminServiceDeps) {
    if (!deps) {
      throw new Error(
        'adminService now requires dependencies to be passed to constructor. ' +
          'Pass { neo4j, log } to the constructor, or use the exported functions directly.'
      );
    }
    this.deps = deps;
  }

  /**
   * @deprecated Use the exported getUnverifiedSellers() function instead
   */
  public async getUnverifiedSellers(): Promise<any> {
    return getUnverifiedSellers(this.deps);
  }

  /**
   * @deprecated Use the exported getSellerIdentityCard() function instead
   */
  public async getSellerIdentityCard(userid: string): Promise<any> {
    return getSellerIdentityCard(userid, this.deps);
  }
}

export default adminService;
