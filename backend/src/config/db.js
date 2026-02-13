const { Pool } = require("pg");
const { env } = require("./env");

const db = new Pool({
  connectionString: env.DATABASE_URL,
});

let dbLoggingInitialized = false;

const initDbLogging = (logger = console) => {
  if (dbLoggingInitialized) return;
  dbLoggingInitialized = true;

  db.on("error", (error) => {
    logger.error("Postgres pool error:", error);
  });
};

const dbHealthCheck = async ({ timeoutMs = 2000 } = {}) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Database health check timed out")), timeoutMs);
  });

  await Promise.race([db.query("SELECT 1"), timeoutPromise]);
  return true;
};

module.exports = { db, dbHealthCheck, initDbLogging };
