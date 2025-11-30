import {
  Session,
  QueryResult,
  ManagedTransaction,
  Integer,
  Node,
  Relationship,
} from 'neo4j-driver';
import { Tneo4j } from '../../plugins/neo4j.plugin';
import type { Logger } from 'pino';

/**
 * Base Repository Pattern for Neo4j with Full Type Safety
 *
 * Provides a foundation for all domain repositories following the Repository pattern.
 * Utilizes Neo4j 5.2.0+ TypeScript features for compile-time type checking.
 *
 * Key Principles:
 * - Full Type Safety: Uses Neo4j's Node<Integer, Props> and Relationship<Integer, Props> types
 * - Separation of Concerns: Database logic is isolated from business logic
 * - Dependency Injection: Neo4j connection and logger are injected
 * - Transaction Support: Built-in support for read/write transactions
 * - Error Handling: Consistent error handling across all repositories
 *
 * Type Safety Features (Neo4j 5.2.0+):
 * - Node<Integer, TProps>: Represents a Neo4j node with typed properties
 * - Relationship<Integer, TProps>: Represents a Neo4j relationship with typed properties
 * - Record types: Define the shape of query results for compile-time validation
 *
 * @example
 * interface UserProps {
 *   id: string;
 *   email: string;
 *   name: string;
 * }
 *
 * interface UserRecord {
 *   user: Node<Integer, UserProps>;
 * }
 *
 * const result = await this.executeRead<UserRecord>(query, params);
 * const user = result.records[0]?.get('user'); // Fully typed!
 */

export interface RepositoryDependencies {
  neo4j: Tneo4j;
  log: Logger;
}

/**
 * Helper type to extract Node properties with Integer conversion
 */
export type NodeProps<T> = {
  [K in keyof T]: T[K] extends Integer ? number : T[K];
};

/**
 * Type-safe Neo4j Node
 */
export type TypedNode<TProps extends Record<string, unknown> = Record<string, unknown>> = Node<
  Integer,
  TProps
>;

/**
 * Type-safe Neo4j Relationship
 */
export type TypedRelationship<TProps extends Record<string, unknown> = Record<string, unknown>> =
  Relationship<Integer, TProps>;

export abstract class BaseRepository {
  protected readonly neo4j: Tneo4j;
  protected readonly log: Logger;

  constructor(deps: RepositoryDependencies) {
    this.neo4j = deps.neo4j;
    this.log = deps.log;
  }

  /**
   * Execute a read query within a transaction with full type safety
   * Use this for queries that only read data (MATCH, RETURN)
   *
   * @param cypherQuery - Cypher query string
   * @param params - Query parameters
   * @returns Type-safe query result
   *
   * @example
   * interface UserRecord {
   *   user: Node<Integer, { id: string; name: string }>;
   * }
   *
   * const result = await this.executeRead<UserRecord>(
   *   'MATCH (user:user {id: $id}) RETURN user',
   *   { id: '123' }
   * );
   *
   * const user = result.records[0]?.get('user'); // TypeScript knows the type!
   */
  protected async executeRead<TRecord extends Record<string, unknown>>(
    cypherQuery: string,
    params: Record<string, unknown> = {}
  ): Promise<QueryResult<TRecord>> {
    try {
      return await this.neo4j.withSession(async (session: Session) => {
        return await session.executeRead((tx: ManagedTransaction) => {
          return tx.run<TRecord>(cypherQuery, params);
        });
      });
    } catch (error) {
      this.log.error({ error, query: cypherQuery, params }, 'Read query failed');
      throw error;
    }
  }

  /**
   * Execute a write query within a transaction with full type safety
   * Use this for queries that modify data (CREATE, UPDATE, DELETE, MERGE)
   *
   * @param cypherQuery - Cypher query string
   * @param params - Query parameters
   * @returns Type-safe query result
   *
   * @example
   * interface CreateUserRecord {
   *   user: Node<Integer, { id: string; email: string }>;
   * }
   *
   * const result = await this.executeWrite<CreateUserRecord>(
   *   'CREATE (user:user {id: $id, email: $email}) RETURN user',
   *   { id: '123', email: 'test@example.com' }
   * );
   */
  protected async executeWrite<TRecord extends Record<string, unknown>>(
    cypherQuery: string,
    params: Record<string, unknown> = {}
  ): Promise<QueryResult<TRecord>> {
    try {
      return await this.neo4j.withSession(async (session: Session) => {
        return await session.executeWrite((tx: ManagedTransaction) => {
          return tx.run<TRecord>(cypherQuery, params);
        });
      });
    } catch (error) {
      this.log.error({ error, query: cypherQuery, params }, 'Write query failed');
      throw error;
    }
  }

  /**
   * Execute multiple queries in a single transaction
   * All queries will be committed or rolled back together
   *
   * @param callback - Function containing transaction logic
   * @returns Result of the transaction
   *
   * @example
   * await this.transaction(async (tx) => {
   *   await tx.run('CREATE (u:user {id: $id})', { id: '123' });
   *   await tx.run('CREATE (p:profile {userId: $id})', { id: '123' });
   *   // Both succeed or both fail
   * });
   */
  protected async transaction<T>(callback: (tx: ManagedTransaction) => Promise<T>): Promise<T> {
    try {
      return await this.neo4j.withSession(async (session: Session) => {
        return await session.executeWrite(callback);
      });
    } catch (error) {
      this.log.error({ error }, 'Transaction failed');
      throw error;
    }
  }

  /**
   * Type-safe helper to extract a single node from query result
   * Automatically converts Neo4j Integer types to numbers
   *
   * @param result - Query result
   * @param key - Property key in the record
   * @returns Node with typed properties or null
   *
   * @example
   * interface UserProps { id: string; followers: Integer }
   * interface UserRecord { user: Node<Integer, UserProps> }
   *
   * const result = await this.executeRead<UserRecord>(query, params);
   * const user = this.getNode(result, 'user');
   * // user.properties.followers is automatically converted to number
   */
  protected getNode<TProps extends Record<string, unknown>>(
    result: QueryResult<Record<string, unknown>>,
    key: string
  ): NodeProps<TProps> | null {
    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    if (!record) {
      return null;
    }

    const node = record.get(key) as Node<Integer, TProps> | null;
    if (!node || !node.properties) {
      return null;
    }

    return this.convertNodeProperties<TProps>(node.properties);
  }

  /**
   * Type-safe helper to extract multiple nodes from query result
   *
   * @param result - Query result
   * @param key - Property key in the record
   * @returns Array of nodes with typed properties
   */
  protected getNodes<TProps extends Record<string, unknown>>(
    result: QueryResult<Record<string, unknown>>,
    key: string
  ): NodeProps<TProps>[] {
    if (result.records.length === 0) {
      return [];
    }

    const record = result.records[0];
    if (!record) {
      return [];
    }

    const nodes = record.get(key) as Node<Integer, TProps>[] | null;
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }

    return nodes.map((node) => this.convertNodeProperties<TProps>(node.properties));
  }

  /**
   * Type-safe helper to extract a value from query result
   * Automatically converts Integer types
   *
   * @param result - Query result
   * @param key - Property key in the record
   * @returns Value or null
   *
   * @example
   * const result = await this.executeRead(
   *   'MATCH (u:user) RETURN count(u) as total',
   *   {}
   * );
   * const total = this.getValue<number>(result, 'total'); // Typed as number
   */
  protected getValue<T>(result: QueryResult<any>, key: string): T | null {
    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    if (!record) {
      return null;
    }

    const value = record.get(key);

    if (value === null || value === undefined) {
      return null;
    }

    // Convert Integer to number if needed
    if (this.isInteger(value)) {
      return value.toNumber() as T;
    }

    return value as T;
  }

  /**
   * Extract all records as typed objects
   *
   * @param result - Query result
   * @returns Array of typed records
   */
  protected getRecords<T extends Record<string, unknown>>(
    result: QueryResult<Record<string, unknown>>
  ): T[] {
    return result.records.map((record) => {
      const obj = record.toObject();
      return this.convertObjectIntegers(obj) as T;
    });
  }

  /**
   * Convert Neo4j node properties to plain JavaScript object
   * Handles Integer conversion automatically
   *
   * @param properties - Node properties
   * @returns Plain object with Integers converted to numbers
   */
  private convertNodeProperties<TProps extends Record<string, unknown>>(
    properties: TProps
  ): NodeProps<TProps> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (this.isInteger(value)) {
        result[key] = value.toNumber();
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) => (this.isInteger(item) ? item.toNumber() : item));
      } else if (value && typeof value === 'object' && 'properties' in value && value.properties) {
        // Nested node
        result[key] = this.convertNodeProperties(value.properties as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result as NodeProps<TProps>;
  }

  /**
   * Convert Integers in an object recursively
   *
   * @param obj - Object to convert
   * @returns Object with Integers converted
   */
  private convertObjectIntegers(obj: unknown): unknown {
    if (this.isInteger(obj)) {
      return obj.toNumber();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertObjectIntegers(item));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.convertObjectIntegers(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Check if a value is a Neo4j Integer
   *
   * @param value - Value to check
   * @returns True if value is Integer
   */
  private isInteger(value: unknown): value is Integer {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      'toNumber' in value &&
      'toInt' in value
    );
  }

  /**
   * Helper to convert Neo4j Integer to JavaScript number
   * Legacy method for backward compatibility
   *
   * @param value - Neo4j Integer or number
   * @returns JavaScript number
   * @deprecated Use getValue() or getNode() instead for type safety
   */
  protected toNumber(value: unknown): number {
    if (this.isInteger(value)) {
      return value.toNumber();
    }
    return Number(value);
  }
}
