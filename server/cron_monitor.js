const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbPath = path.join(__dirname, 'data', 'career_compass.db');
const db = new sqlite3.Database(dbPath);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const LIMIT = 1500;
const THRESHOLD = 0.8; // 80%

async function checkAndNotify() {
    console.log(`[Cron] Checking AI usage at ${new Date().toLocaleString()}`);

    db.get("SELECT COUNT(*) as count FROM ai_usage WHERE DATE(timestamp) = DATE('now')", (err, row) => {
        if (err) {
            console.error("Cron DB Error:", err);
            process.exit(1);
        }

        const current = row.count;
        const percentage = (current / LIMIT) * 100;

        console.log(`[Cron] Current Usage: ${current}/${LIMIT} (${percentage.toFixed(2)}%)`);

        if (current >= LIMIT * THRESHOLD) {
            console.log("[Cron] Threshold exceeded! Sending alert email...");

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER, // Sending to admin
                subject: `⚠️ AI USAGE ALERT: ${percentage.toFixed(0)}% Limit Reached`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #e11d48;">AI Usage Warning</h2>
                        <p>The Ethical Career Compass AI Engine is approaching its daily limit.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Current Usage:</strong> ${current} calls</p>
                            <p><strong>Daily Limit:</strong> ${LIMIT} calls</p>
                            <p><strong>Status:</strong> ${percentage.toFixed(1)}% consumed</p>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">The limit will automatically restore at midnight.</p>
                        <a href="http://localhost:5173/admin/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">View Admin Dashboard</a>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Email failed:", error);
                } else {
                    console.log("Alert email sent:", info.response);
                }
                db.close();
            });
        } else {
            console.log("[Cron] Usage within safe limits.");
            db.close();
        }
    });
}

checkAndNotify();
