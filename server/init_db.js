const db = require('./db');

const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'TECHNICIAN'
      );
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        ro_number VARCHAR(50) NOT NULL,
        reg_number VARCHAR(50) NOT NULL,
        start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status VARCHAR(20) DEFAULT 'ACTIVE'
      );
    `);

    // Insert admin and dummy user for demo if not exists
    await db.query(`
      INSERT INTO users (username, name, role) 
      VALUES ('admin', 'Super Admin', 'ADMIN'),
             ('tech01', 'John Doe', 'TECHNICIAN') 
      ON CONFLICT(username) DO UPDATE SET role=excluded.role;
    `);

    console.log("Database tables initialized.");
    process.exit(0);
  } catch (err) {
    console.error("Error initializing database", err);
    process.exit(1);
  }
};

initDb();
