const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./career_compass.db', (err) => {
    if (err) {
        console.error("DB Error:", err.message);
        process.exit(1);
    }
    console.log("Connected to SQLite database.");
});

db.serialize(() => {
    const email = 'test@example.com';
    const name = 'Test User';

    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }

        if (row) {
            console.log(`User ${email} already exists with ID ${row.id}`);
        } else {
            db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email], function (err) {
                if (err) console.error(err);
                else console.log(`Created user ${email} with ID ${this.lastID}`);
            });
        }
    });

    // Also verify or create the initial tables just in case (server should have done it, but good to be safe)
});

// Close after a brief timeout to allow async ops to finish
setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err);
        else console.log("Database connection closed.");
    });
}, 1000);
