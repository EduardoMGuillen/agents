import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL missing in .env.local");
  }

  const sqlPath = resolve(process.cwd(), "supabase/migrations/001_init.sql");
  const sql = readFileSync(sqlPath, "utf8");

  // Supabase / pooler often presents a chain Node rejects by default
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const client = new pg.Client({
    connectionString: url,
    ssl: true,
  });

  await client.connect();
  console.log("Connected. Running migration…");
  await client.query(sql);
  console.log("Migration OK");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
