require("dotenv").config();
const db = require("./connection");

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

async function addColumnIfMissing(tableName, columnName, columnDefinition) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}

const seed = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      theme TEXT DEFAULT 'dark',
      currency_code TEXT DEFAULT 'INR',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("users", "theme", "TEXT DEFAULT 'dark'");
  await addColumnIfMissing("users", "currency_code", "TEXT DEFAULT 'INR'");

  await run(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      due_date TEXT,
      badge TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      reminder_date TEXT NOT NULL,
      notes TEXT,
      is_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense', 'saving')) NOT NULL,
      category TEXT DEFAULT 'General',
      notes TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await addColumnIfMissing("transactions", "category", "TEXT DEFAULT 'General'");
  await addColumnIfMissing("transactions", "notes", "TEXT");
  await addColumnIfMissing("transactions", "is_recurring", "INTEGER DEFAULT 0");
  await addColumnIfMissing("transactions", "recurrence_pattern", "TEXT");

  await run("DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email = ?)", ["demo@example.com"]);
  await run("DELETE FROM savings_goals WHERE user_id IN (SELECT id FROM users WHERE email = ?)", ["demo@example.com"]);
  await run("DELETE FROM users WHERE email = ?", ["demo@example.com"]);

};

seed()
  .then(() => {
    console.log("Database initialized and seeded.");
    db.close();
  })
  .catch((error) => {
    console.error("Database initialization failed:", error.message);
    db.close();
    process.exit(1);
  });
