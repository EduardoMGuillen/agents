import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const u = new URL(process.env.DATABASE_URL);
console.log({
  host: u.hostname,
  port: u.port,
  user: u.username,
  db: u.pathname,
});

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

await client.connect();
const r = await client.query(
  "select current_user, current_database(), has_schema_privilege(current_user, 'public', 'CREATE') as can_create",
);
console.log(r.rows[0]);
const schemas = await client.query(
  "select nspname from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema' order by 1",
);
console.log("schemas", schemas.rows);
await client.end();
