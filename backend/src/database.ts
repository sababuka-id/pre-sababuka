import pg from "pg";

const { Pool } = pg;

export type QueryResultRow = pg.QueryResultRow;

export interface Database {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<R>>;
  connect(): Promise<pg.PoolClient>;
  end(): Promise<void>;
}

export function createDatabase(connectionString: string): Database {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: "sababuka-api",
  });
}
