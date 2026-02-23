/**
 * Minimal type shim for the 'pg' module used in E2E test helpers.
 * Install @types/pg at the root to replace this if needed.
 */
declare module 'pg' {
  export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
  }

  export interface ClientConfig {
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized?: boolean };
  }

  export class Client {
    constructor(config?: ClientConfig);
    connect(): Promise<void>;
    query(text: string, values?: unknown[]): Promise<QueryResult>;
    end(): Promise<void>;
  }
}
