const db = require('./db');

const migrateRoles = async () => {
  try {
    console.log("Starting role migration...");
    
    // Add role column to users table
    try {
      await db.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'TECHNICIAN';");
      console.log("Added 'role' column to users table.");
    } catch (e) {
      // Ignore if column already exists
      if (e.message.includes("duplicate column name") || e.message.includes("duplicate column")) {
        console.log("Column 'role' already exists.");
      } else {
        throw e;
      }
    }

    // Insert admin user
    try {
      await db.query(
        "INSERT INTO users (username, name, role) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET role=excluded.role;",
        ['admin', 'Super Admin', 'ADMIN']
      );
      console.log("Upserted admin user.");
    } catch (e) {
      console.error("Error creating admin user:", e);
      throw e;
    }

    console.log("Role migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrateRoles();
