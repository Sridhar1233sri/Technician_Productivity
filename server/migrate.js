const db = require('./db');

const migrate = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS job_pauses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER REFERENCES jobs(id),
        reason VARCHAR(100) NOT NULL,
        start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME
      );
    `);
    console.log("Migration successful: job_pauses table created.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrate();
