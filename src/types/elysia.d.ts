import type { Driver, Session, SessionConfig } from 'neo4j-driver';

/**
 * Elysia Context Augmentation
 *
 * This file augments the Elysia context with custom plugin decorations.
 * It provides type safety and autocomplete for decorated properties in route handlers.
 */

declare module 'elysia' {
  interface Context {
    /**
     * Neo4j database integration
     *
     * Provides access to the Neo4j driver and session management utilities.
     *
     * @example
     * ```typescript
     * app.get('/users/:id', async ({ params, neo4j }) => {
     *   return await neo4j.withSession(async (session) => {
     *     const result = await session.run('MATCH (u:user {id: $id}) RETURN u', { id: params.id });
     *     return result.records[0]?.get('u').properties;
     *   });
     * });
     * ```
     */
    neo4j: {
      /**
       * Direct access to the Neo4j driver instance
       */
      readonly driver: Driver;

      /**
       * Create a new Neo4j session
       *
       * @param config - Optional session configuration
       * @returns A new Neo4j session (must be closed manually)
       */
      getSession(config?: SessionConfig): Session;

      /**
       * Execute a callback with automatic session management
       *
       * The session is automatically created before the callback and closed after,
       * even if an error occurs.
       *
       * @param callback - Async function that receives a Neo4j session
       * @param config - Optional session configuration
       * @returns The result of the callback
       *
       * @example
       * ```typescript
       * const user = await neo4j.withSession(async (session) => {
       *   const result = await session.run('MATCH (u:user {id: $id}) RETURN u', { id: userId });
       *   return result.records[0]?.get('u').properties;
       * });
       * ```
       */
      withSession<T>(callback: (session: Session) => Promise<T>, config?: SessionConfig): Promise<T>;
    };
  }
}
