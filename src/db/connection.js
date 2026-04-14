const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(process.cwd(), "data", "app.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
  } else {
    console.log(`SQLite connected at ${dbPath}`);
  }
});

module.exports = db;
