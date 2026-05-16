import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "DATABASE_URL is not set in production. Database features will fail.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/postgres"
});
export const db = drizzle(pool, { schema });

export * from "./schema";
