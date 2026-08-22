import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __nexusPgPool: Pool | undefined;
}

export function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no configurada");
  }
  if (!globalThis.__nexusPgPool) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";
    globalThis.__nexusPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: true,
      max: 5,
    });
  }
  return globalThis.__nexusPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const res = await getPool().query<T>(text, params);
  return res;
}
