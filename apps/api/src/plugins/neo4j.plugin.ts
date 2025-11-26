import { Elysia } from 'elysia';
import neo4j, { Driver, Session, SessionConfig } from 'neo4j-driver';
import { appLogger } from './logger.plugin';

/**
 * Neo4j Plugin for Elysia
 *
 * Provides connection pooling and session management utilities for Neo4j database.
 */

let driverInstance: Driver | null = null;

export const neo4jPlugin = () => {
  return new Elysia({ name: 'plugin.neo4j', seed: 'plugin.neo4j' })
    .onStart(async () => {
      try {
        const uri = process.env.NEO4J_URI;
        const username = process.env.NEO4J_USERNAME;
        const password = process.env.NEO4J_PASSWORD;

        if (!uri || !username || !password) {
          throw new Error(
            'Neo4j connection credentials are not properly configured. Please check NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD environment variables.',
          );
        }

        driverInstance = neo4j.driver(uri, neo4j.auth.basic(username, password));

        await driverInstance.verifyConnectivity()
        appLogger.info('Neo4j driver connected successfully');
      } catch (error) {
        if (driverInstance) {
          await driverInstance.close();
          driverInstance = null;
        }

        const err = error instanceof Error ? error : new Error(String(error));
        appLogger.error({ error: err.message }, 'Failed to connect to Neo4j');
        throw new Error(`Neo4j connection failed: ${err.message}`);
      }
    })
    .decorate('neo4j', {
      get driver(): Driver {
        if (!driverInstance) {
          throw new Error('Neo4j driver not initialized');
        }
        return driverInstance;
      },
      getSession(config?: SessionConfig): Session {
        if (!driverInstance) {
          throw new Error('Neo4j driver not initialized');
        }
        return driverInstance.session(config);
      },
      async withSession<T>(callback: (session: Session) => Promise<T>, config?: SessionConfig): Promise<T> {
        if (!driverInstance) {
          throw new Error('Neo4j driver not initialized');
        }
        const session = driverInstance.session(config);
        try {
          return await callback(session);
        } finally {
          await session.close();
        }
      },
    })
    .onStop(async () => {
      if (process.env.NODE_ENV === 'production' && driverInstance) {
        await driverInstance.close();
        driverInstance = null;
      }
    });
};

export type Tneo4j = {
  readonly driver: Driver;
  getSession(config?: SessionConfig): Session;
  withSession<T>(callback: (session: Session) => Promise<T>, config?: SessionConfig): Promise<T>;
}
