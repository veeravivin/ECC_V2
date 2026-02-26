const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'career_compass.db');
const db = new sqlite3.Database(dbPath);

console.log("Seeding Demo Data for Reminder Test...");

db.serialize(() => {
    // 1. Ensure a user exists
    const email = 'demo@example.com';
    db.run("INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)", ['Demo User', email]);

    // 2. Get User ID
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (!row) {
            console.error("User creation failed.");
            return;
        }
        const userId = row.id;

        // 3. Create active roadmap
        db.run(`INSERT INTO user_roadmaps (user_id, role, roadmap_data, status, duration, created_at, started_at, reminders_enabled)
                VALUES (?, ?, ?, 'In Progress', '3 Months', ?, ?, 1)`,
            [userId, 'AI Ethics Specialist (Demo)', JSON.stringify({ roadmap: [] }), new Date().toISOString(), new Date().toISOString()],
            function (err) {
                if (err) console.error(err);
                else console.log(`Created Roadmap ID: ${this.lastID} for ${email}`);
            }
        );
    });
});
