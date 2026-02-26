const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const sdk = require('node-appwrite');
const { databases, DB_ID, COLLECTION_USERS, COLLECTION_AI_USAGE } = require('./appwrite');
const { Client, Databases, Storage, ID, Query, InputFile } = sdk;

// Appwrite Connectivity Check
if (!databases || !DB_ID) {
    console.warn("⚠️ Appwrite Cloud not fully configured in .env. Data will only be saved locally (SQLite).");
} else {
    console.log("✅ Appwrite Cloud Sync Active: Data will be mirrored to Live Storage.");
}

// Serve Static Files from Client Build (for Single Container Deployment)
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- REDIS SETUP ---
const redis = require('redis');
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

(async () => {
    try {
        await redisClient.connect();
    } catch (e) {
        console.error("Failed to connect to Redis:", e);
    }
})();

// Configure Multer for PDF Uploads (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Database connection (SQLite)
// Using a file-based DB for persistence without needing external services
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const dbPath = path.join(dataDir, 'career_compass.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB Error:", err.message);
    else console.log("Connected to SQLite database at " + dbPath);
});

// Initialize Tables on Boot
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        linkedin TEXT,
        summary TEXT,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Attempt to add new columns if they don't exist (for existing DBs)
    db.serialize(() => {
        db.all("PRAGMA table_info(users)", (err, rows) => {
            if (!err && rows) {
                const existingCols = rows.map(r => r.name);
                const colsToAdd = ['phone', 'linkedin', 'summary', 'location'];
                colsToAdd.forEach(col => {
                    if (!existingCols.includes(col)) {
                        db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {
                            if (err) console.error(`Error adding column ${col}:`, err.message);
                        });
                    }
                });
            }
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_skills (
        user_id INTEGER,
        skill_name TEXT,
        proficiency INTEGER,
        PRIMARY KEY (user_id, skill_name),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_experience (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        role TEXT,
        company TEXT,
        duration TEXT,
        description TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_education (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        degree TEXT,
        institution TEXT,
        year TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_roadmaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        role TEXT,
        duration TEXT,
        roadmap_data TEXT,
        status TEXT DEFAULT 'Not Started',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        reminders_enabled BOOLEAN DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Migration for existing tables
    const roadmapCols = ['started_at', 'reminders_enabled'];
    roadmapCols.forEach(col => {
        db.run(`ALTER TABLE user_roadmaps ADD COLUMN ${col} ${col === 'reminders_enabled' ? 'BOOLEAN DEFAULT 0' : 'DATETIME'}`, (err) => {
            // Ignore duplicate column errors
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS market_trends_cache (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        trends_data TEXT,
        last_updated DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        topic TEXT,
        level TEXT,
        score INTEGER,
        total_questions INTEGER,
        details_json TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ai_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT,
        status TEXT, -- success, failure
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS predefined_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        level TEXT,
        question_data TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Migrate users for is_admin
    db.run(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0`, (err) => {
        // Default admin seeding if not exists
        db.run(`UPDATE users SET is_admin = 1 WHERE email = 'admin@compass.com'`, (err) => {
            if (!err) {
                db.run(`INSERT OR IGNORE INTO users (name, email, is_admin) VALUES ('System Admin', 'admin@compass.com', 1)`);
            }
        });
    });
});

// Helper: Log AI Usage
const logAIUsage = (endpoint, status = 'success') => {
    db.run("INSERT INTO ai_usage (endpoint, status) VALUES (?, ?)", [endpoint, status]);

    // --- APPWRITE CLOUD MIRROR ---
    if (databases && DB_ID) {
        // Appwrite URL attributes require protocol. We use a fake prefix if the attribute is URL type, 
        // but it's better if the user sets it as String in Appwrite dashboard.
        let safeEndpoint = endpoint;
        if (!endpoint.startsWith('http')) {
            safeEndpoint = `https://compass.api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        }

        databases.createDocument(DB_ID, COLLECTION_AI_USAGE, ID.unique(), {
            endpoint: safeEndpoint,
            status,
            timestamp: new Date().toISOString()
        }).catch(e => console.error("[Appwrite Sync Fail]:", e.message));
    }
};

// Helper: Promisify DB Queries for async/await usage
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

app.get('/api/ai/trends', async (req, res) => {
    try {
        // Check Cache
        const cached = await dbGet("SELECT * FROM market_trends_cache WHERE id = 1");

        // 7 Days in ms = 7 * 24 * 60 * 60 * 1000
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        let shouldRefresh = true;
        let cachedData = null;

        if (cached && cached.last_updated && cached.trends_data) {
            try {
                // Verify if cache is valid JSON and not empty
                const parsed = JSON.parse(cached.trends_data);
                if (parsed && parsed.trends && parsed.jobs) {
                    cachedData = parsed; // Still assign for potential future use or debugging
                    const lastUpdate = new Date(cached.last_updated).getTime();
                    if (now - lastUpdate < ONE_WEEK_MS) {
                        shouldRefresh = false;
                        // console.log("Serving cached trends data"); // Muted to reduce noise
                        return res.json(JSON.parse(cached.trends_data));
                    }
                } else {
                    console.warn("Cache missing expected fields, forcing refresh...");
                }
            } catch (e) {
                console.error("Cache corrupted (JSON Parse Error), forcing refresh...", e.message);
                await dbRun("DELETE FROM market_trends_cache WHERE id = 1");
                shouldRefresh = true;
                cachedData = null;
            }
        }

        if (!shouldRefresh && cachedData) {
            console.log("Serving cached trends data");
            return res.json(cachedData);
        }

        console.log("Fetching fresh trends data from AI...");
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.get(`${aiServiceUrl}/market_trends`);
        const newData = response.data;

        // Validation before caching
        if (newData && newData.trends && Array.isArray(newData.trends)) {
            try {
                if (cached) {
                    await dbRun("UPDATE market_trends_cache SET trends_data = ?, last_updated = ? WHERE id = 1", [JSON.stringify(newData), new Date().toISOString()]);
                } else {
                    await dbRun("INSERT INTO market_trends_cache (id, trends_data, last_updated) VALUES (1, ?, ?)", [JSON.stringify(newData), new Date().toISOString()]);
                }
            } catch (dbErr) {
                console.error("Failed to update cache DB:", dbErr.message);
            }
            res.json(newData);
        } else {
            console.error("Invalid data from AI, sending without caching:", newData);
            res.json(newData);
        }

    } catch (err) {
        console.error("AI Trends Error:", err.message);
        // FORCE DELETE BAD CACHE if it exists to prevent permanent loops
        try { await dbRun("DELETE FROM market_trends_cache WHERE id = 1"); } catch (e) { }

        res.status(502).json({ error: "AI Service Unavailable" });
    }
});

// --- Skill Test Routes ---

app.post('/api/ai/skill_test', async (req, res) => {
    try {
        const { topic, level } = req.body;
        console.log(`[AI Proxy] Requesting Skill Test: ${topic} (${level})`);

        const getFromDB = async (t, l) => {
            const rows = await new Promise((resolve, reject) => {
                db.all("SELECT question_data FROM predefined_questions WHERE LOWER(topic) = LOWER(?) AND level = ?", [t, l], (err, rows) => {
                    if (err) reject(err); else resolve(rows);
                });
            });
            if (rows && rows.length >= 5) {
                const shuffled = rows.sort(() => 0.5 - Math.random()).slice(0, 5);
                return shuffled.map(s => JSON.parse(s.question_data));
            }
            return null;
        };

        if (level && level.toLowerCase() === 'beginner') {
            const dbData = await getFromDB(topic, level);
            if (dbData) return res.json(dbData);
        }

        try {
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
            const response = await axios.post(`${aiServiceUrl}/generate_skill_test`, { topic, level });
            const questions = response.data;

            if (Array.isArray(questions) && questions.length > 0) {
                // Background: Save to DB with deduplication
                setImmediate(async () => {
                    try {
                        const currentRows = await new Promise((resolve, reject) => {
                            db.all("SELECT question_data FROM predefined_questions WHERE LOWER(topic) = LOWER(?) AND level = ?", [topic, level], (err, rows) => {
                                if (err) reject(err); else resolve(rows);
                            });
                        });
                        const existingTexts = new Set(currentRows.map(r => {
                            try { return JSON.parse(r.question_data).question; } catch (e) { return null; }
                        }));
                        const stmt = db.prepare("INSERT INTO predefined_questions (topic, level, question_data) VALUES (?, ?, ?)");
                        questions.forEach(q => {
                            if (q.question && !existingTexts.has(q.question)) {
                                stmt.run(topic, level, JSON.stringify(q));
                                existingTexts.add(q.question);
                            }
                        });
                        stmt.finalize();
                    } catch (e) { }
                });
                logAIUsage('/generate_skill_test');
                return res.json(questions);
            }
        } catch (aiErr) {
            console.warn(`[AI Proxy] AI Failed or Limit Reached. Attempting DB fallback...`);
            if (aiErr.response?.status === 429 || aiErr.response?.status === 502 || !aiErr.response) {
                const fallbackData = await getFromDB(topic, level);
                if (fallbackData) {
                    logAIUsage('/generate_skill_test', 'db_fallback');
                    return res.json(fallbackData);
                }
            }
            throw aiErr;
        }
    } catch (err) {
        logAIUsage('/generate_skill_test', 'failure');
        console.error("AI Skill Test Error:", err.message);
        res.status(502).json({ error: "AI Limit reached and no local questions available." });
    }
});

app.post('/api/tests/save', (req, res) => {
    const { user_email, topic, level, score, total_questions, details } = req.body;
    db.get("SELECT id FROM users WHERE email = ?", [user_email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        const stmt = db.prepare("INSERT INTO user_test_results (user_id, topic, level, score, total_questions, details_json) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run(user.id, topic, level, score, total_questions, JSON.stringify(details), function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // --- APPWRITE CLOUD SYNC: TEST RESULTS ---
            if (databases && DB_ID) {
                databases.createDocument(DB_ID, 'user_test_results', ID.unique(), {
                    user_id: String(user.id),
                    topic,
                    level,
                    score: Number(score),
                    total_questions: Number(total_questions),
                    details_json: JSON.stringify(details),
                    created_at: new Date().toISOString()
                }).catch(e => console.error("[Appwrite Sync Fail]:", e.message));
            }

            res.json({ message: "Test result saved" });
        });
        stmt.finalize();
    });
});

app.get('/api/tests/history', (req, res) => {
    const { email } = req.query;
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        db.all("SELECT * FROM user_test_results WHERE user_id = ? ORDER BY created_at DESC", [user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => ({ ...r, details_json: JSON.parse(r.details_json) })));
        });
    });
});

// Save a generated roadmap
app.post('/api/roadmaps/save', (req, res) => {
    const { user_email, role, duration, roadmap } = req.body;
    console.log(`[Roadmap Save] Request for ${user_email}, role: ${role}`);

    // Log structure check
    if (!roadmap || !roadmap.roadmap || !Array.isArray(roadmap.roadmap)) {
        console.warn("[Roadmap Save] WARNING: Saving roadmap with invalid structure!", JSON.stringify(roadmap).substring(0, 100));
    }

    db.get("SELECT id FROM users WHERE email = ?", [user_email], (err, user) => {
        if (err) { console.error("DB User Error:", err); return res.status(500).json({ error: "Database error checking user" }); }
        if (!user) { console.error("User not found for email:", user_email); return res.status(404).json({ error: "User not found" }); }

        const stmt = db.prepare("INSERT INTO user_roadmaps (user_id, role, duration, roadmap_data) VALUES (?, ?, ?, ?)");
        stmt.run(user.id, role, duration, JSON.stringify(roadmap), function (err) {
            if (err) {
                console.error("DB Insert Error:", err);
                return res.status(500).json({ error: "Failed to save roadmap to DB: " + err.message });
            }
            console.log(`[Roadmap Save] Success! ID: ${this.lastID}`);
            res.json({ id: this.lastID, message: "Roadmap saved successfully" });
        });
        stmt.finalize();
    });
});

// List user's roadmaps
app.get('/api/roadmaps', (req, res) => {
    const { email } = req.query;
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        db.all("SELECT * FROM user_roadmaps WHERE user_id = ? ORDER BY created_at DESC", [user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            // Parse JSON data back to object
            const roadmaps = rows.map(r => ({
                ...r,
                roadmap_data: JSON.parse(r.roadmap_data)
            }));
            res.json(roadmaps);
        });
    });
});

// --- PROFILE MANAGEMENT ---

app.post('/api/profile/save', async (req, res) => {
    const { email, personalDetails, skills, experience, education } = req.body;

    // Validate inputs
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Update User Personal Details
        await dbRun(
            'UPDATE users SET name = ?, phone = ?, linkedin = ?, summary = ?, location = ? WHERE id = ?',
            [personalDetails.name, personalDetails.phone, personalDetails.linkedin, personalDetails.summary, personalDetails.location, user.id]
        );

        // Invalidate Redis Cache for this user (Skills/Location might have changed)
        try {
            await redisClient.del(`jobs:${email}`); // Ignore error if key doesn't exist
            console.log(`[Redis] Cache invalidated for ${email}`);
        } catch (rErr) {
            console.error("Redis Delete Error:", rErr);
        }

        // Transaction-like updates for related tables
        // 1. Skills
        await dbRun('DELETE FROM user_skills WHERE user_id = ?', [user.id]);
        if (skills && Array.isArray(skills)) {
            const skillStmt = db.prepare('INSERT INTO user_skills (user_id, skill_name, proficiency) VALUES (?, ?, ?)');
            skills.forEach(skill => {
                skillStmt.run(user.id, skill, 3); // Default proficiency 3
            });
            skillStmt.finalize();
        }

        // 2. Experience
        await dbRun('DELETE FROM user_experience WHERE user_id = ?', [user.id]);
        if (experience && Array.isArray(experience)) {
            const expStmt = db.prepare('INSERT INTO user_experience (user_id, role, company, duration, description) VALUES (?, ?, ?, ?, ?)');
            experience.forEach(exp => {
                expStmt.run(user.id, exp.role, exp.company, exp.duration, exp.description);
            });
            expStmt.finalize();
        }

        // 3. Education
        await dbRun('DELETE FROM user_education WHERE user_id = ?', [user.id]);
        if (education && Array.isArray(education)) {
            const eduStmt = db.prepare('INSERT INTO user_education (user_id, degree, institution, year) VALUES (?, ?, ?, ?)');
            education.forEach(edu => {
                eduStmt.run(user.id, edu.degree, edu.institution, edu.year);
            });
            eduStmt.finalize();
        }

        res.json({ message: "Profile saved successfully" });

    } catch (err) {
        console.error("Profile Save Error:", err);
        res.status(500).json({ error: "Failed to save profile" });
    }
});

app.get('/api/profile', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const skills = await new Promise((resolve, reject) => {
            db.all('SELECT skill_name FROM user_skills WHERE user_id = ?', [user.id], (err, rows) => {
                if (err) reject(err); else resolve(rows.map(r => r.skill_name));
            });
        });

        const experience = await new Promise((resolve, reject) => {
            db.all('SELECT role, company, duration, description FROM user_experience WHERE user_id = ?', [user.id], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        const education = await new Promise((resolve, reject) => {
            db.all('SELECT degree, institution, year FROM user_education WHERE user_id = ?', [user.id], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        res.json({
            personalDetails: {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                linkedin: user.linkedin || '',
                summary: user.summary || '',
                location: user.location || ''
            },
            skills,
            experience,
            education
        });

    } catch (err) {
        console.error("Profile Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});



// Email Transporter (SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Generate valid OTP
    const otp = generateOTP();
    // Expiry 5 mins from now
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();

    try {
        // Upsert OTP
        const check = await dbGet('SELECT * FROM otp_codes WHERE email = ?', [email]);
        if (check) {
            await dbRun('UPDATE otp_codes SET code = ?, expires_at = ? WHERE email = ?', [otp, expiresAt, email]);
        } else {
            await dbRun('INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);
        }

        // Attempt Send Email via SMTP
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Ethical Career Compass - Login OTP',
                text: `Your secure OTP is ${otp}. It expires in 5 minutes.`
            });
            console.log(`OTP sent to ${email} via SMTP.`);
        } catch (mailErr) {
            console.error("SMTP Failed. Printing to console for debugging/demo:", mailErr.message);
            console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
        }

        res.json({ message: "OTP sent" });
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { email, otp, name } = req.body;

    try {
        const record = await dbGet('SELECT * FROM otp_codes WHERE email = ?', [email]);

        if (!record) return res.status(400).json({ error: "OTP not found" });

        // Check Expiry
        if (new Date() > new Date(record.expires_at)) {
            return res.status(400).json({ error: "OTP expired" });
        }

        // Check Value
        if (record.code !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // Create or Fetch User
        let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            await dbRun('INSERT INTO users (name, email) VALUES (?, ?)', [name || 'User', email]);

            // --- APPWRITE CLOUD SYNC: USERS ---
            if (databases && DB_ID) {
                databases.createDocument(DB_ID, COLLECTION_USERS, ID.unique(), {
                    email,
                    name: name || 'User',
                    isAdmin: false // Matches your screenshot column name
                }).catch(e => console.error("[Appwrite Sync Fail]:", e.message));
            }
            user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        }

        // Clear used OTP
        await dbRun('DELETE FROM otp_codes WHERE email = ?', [email]);

        res.json({ user, token: "mock-jwt-token" });
    } catch (err) {
        console.error("Verify Error:", err);
        res.status(500).json({ error: "Server error verifying OTP" });
    }
});

// --- AI PROXY ROUTES ---

app.post('/api/ai/analyze', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:8000/analyze_career_match', req.body);
        logAIUsage('/analyze_career_match');
        res.json(response.data);
    } catch (err) {
        logAIUsage('/analyze_career_match', 'failure');
        console.error("AI Error:", err.message);
        res.status(500).json({ error: "AI Engine unavailable" });
    }
});

app.post('/api/ai/roadmap', async (req, res) => {
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        console.log(`[AI Proxy] Generating Roadmap for: ${req.body.target_role}`);
        const response = await axios.post(`${aiServiceUrl}/generate_roadmap`, req.body);
        logAIUsage('/generate_roadmap');
        console.log(`[AI Proxy] Roadmap generated. Keys: ${Object.keys(response.data).join(', ')}`);
        res.json(response.data);
    } catch (err) {
        logAIUsage('/generate_roadmap', 'failure');
        console.error("AI Error:", err.message);
        res.status(500).json({ error: "AI Engine unavailable" });
    }
});


app.post('/api/ai/jobs', async (req, res) => {
    try {
        const { skills, email, location, force_refresh } = req.body;

        console.log(`[AI Proxy] Fetching Job Recommendations for: ${email}`);

        // 1. Check Redis Cache
        const cacheKey = `jobs:${email}`; // Unique key per user

        if (!force_refresh) {
            try {
                const cachedData = await redisClient.get(cacheKey);
                if (cachedData) {
                    console.log(`[Redis] Serving cached jobs for ${email}`);
                    return res.json(JSON.parse(cachedData));
                }
            } catch (redisErr) {
                console.error("Redis Get Error:", redisErr);
            }
        } else {
            console.log(`[Redis] Force Refresh detected for ${email}`);
        }

        // 2. Fetch from AI Engine (SerpAPI)
        console.log(`[AI Proxy] Fetching fresh jobs from AI...`);
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        console.log(`[AI Proxy] Fetching fresh jobs from AI at ${aiServiceUrl}...`);
        const response = await axios.post(`${aiServiceUrl}/recommend_jobs`, req.body);
        const jobData = response.data;

        // 3. Store in Redis (1 Day Expiry)
        try {
            if (jobData && Array.isArray(jobData) && jobData.length > 0) {
                await redisClient.set(cacheKey, JSON.stringify(jobData), {
                    EX: 86400 // 24 Hours
                });
                console.log(`[Redis] Cached jobs for ${email}`);
            }
        } catch (redisErr) {
            console.error("Redis Set Error:", redisErr);
        }
        logAIUsage('/recommend_jobs');
        res.json(jobData);
    } catch (err) {
        logAIUsage('/recommend_jobs', 'failure');
        console.error("AI Jobs Error:", err.message);
        res.status(502).json({ error: "Job recommendation failed" });
    }
});


app.post('/api/ai/recommend', async (req, res) => {
    try {
        console.log(`[AI Proxy] Generating Career Paths for: ${req.body.name}`);
        console.log(`[AI Proxy] Generating Career Paths for: ${req.body.name}`);
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.post(`${aiServiceUrl}/recommend_career_paths`, req.body);
        logAIUsage('/recommend_career_paths');
        res.json(response.data);
    } catch (err) {
        logAIUsage('/recommend_career_paths', 'failure');
        console.error("AI Recommendation Error:", err.message);
        res.status(502).json({ error: "AI Recommendation Service Unavailable" });
    }
});

app.post('/api/ai/grade', async (req, res) => {
    try {
        console.log(`[AI Proxy] Grading Test Submission: ${req.body.topic}`);
        console.log(`[AI Proxy] Grading Test Submission: ${req.body.topic}`);
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.post(`${aiServiceUrl}/grade_test`, req.body);
        logAIUsage('/grade_test');
        res.json(response.data);
    } catch (err) {
        logAIUsage('/grade_test', 'failure');
        console.error("AI Grading Error:", err.message);
        res.status(500).json({ error: "AI Grading unavailable" });
    }
});

app.post('/api/ai/run_code', async (req, res) => {
    try {
        console.log(`[AI Proxy] Running Code for: ${req.body.language}`);
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.post(`${aiServiceUrl}/run_code_simulation`, req.body);
        res.json(response.data);
    } catch (err) {
        console.error("AI Run Code Error:", err.message);
        res.status(500).json({ error: "Failed to run code" });
    }
});

app.post('/api/ai/resume-parse', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // Create FormData to send to Python
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // --- APPWRITE CLOUD STORAGE SYNC ---
        if (databases && DB_ID) {
            const { storage, BUCKET_RESUMES } = require('./appwrite');

            storage.createFile(
                BUCKET_RESUMES || 'resumes',
                ID.unique(),
                InputFile.fromBuffer(req.file.buffer, req.file.originalname)
            ).catch(e => console.error("[Appwrite Storage Fail]:", e.message));
        }

        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.post(`${aiServiceUrl}/parse_resume`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
        logAIUsage('/parse_resume');
        res.json(response.data);
    } catch (err) {
        logAIUsage('/parse_resume', 'failure');
        console.error("Resume Parsing Error:", err.message);
        res.status(502).json({ error: "Failed to parse resume" });
    }
});

app.post('/api/ai/quiz', async (req, res) => {
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.post(`${aiServiceUrl}/generate_phase_test`, req.body);
        res.json(response.data);
    } catch (err) {
        console.error("AI Quiz Error:", err.message);
        res.status(502).json({ error: "AI Service Unavailable" });
    }
});

app.get('/api/ai/trends', async (req, res) => {
    try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.get(`${aiServiceUrl}/market_trends`);
        res.json(response.data);
    } catch (err) {
        console.error("AI Trends Error:", err.message);
        res.status(502).json({ error: "AI Service Unavailable" });
    }
});

app.post('/api/roadmaps/progress', (req, res) => {
    const { id, roadmap_data } = req.body;
    db.run("UPDATE user_roadmaps SET roadmap_data = ? WHERE id = ?", [JSON.stringify(roadmap_data), id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Progress saved" });
    });
});

// Start Roadmap & Enable Reminders
app.post('/api/roadmaps/start', (req, res) => {
    const { id } = req.body;
    const now = new Date().toISOString();

    db.run("UPDATE user_roadmaps SET status = 'In Progress', started_at = ?, reminders_enabled = 1 WHERE id = ?", [now, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Roadmap started successfully", started_at: now });
    });
});

// Delete Roadmap Endpoint
app.delete('/api/roadmaps/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM user_roadmaps WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Roadmap not found" });
        res.json({ message: "Roadmap deleted successfully" });
    });
});

// Manual Trigger for Reminder System (For Testing/Demo)
app.post('/api/admin/trigger-reminders', async (req, res) => {
    console.log("[Admin] Manual trigger for daily reminders initiated.");

    // Logic extracted from scheduler
    try {
        const activeRoadmaps = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM user_roadmaps WHERE status = 'In Progress' AND reminders_enabled = 1", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (activeRoadmaps.length > 0) {
            console.log(`[Reminder System] Found ${activeRoadmaps.length} active roadmaps.`);
            let sentCount = 0;
            for (const rm of activeRoadmaps) {
                const user = await dbGet("SELECT email FROM users WHERE id = ?", [rm.user_id]);
                if (user) {
                    console.log(`[Email] Sending manual reminder to ${user.email} for '${rm.role}' journey.`);
                    try {
                        await transporter.sendMail({
                            from: process.env.EMAIL_USER,
                            to: user.email,
                            subject: `Daily Goal: ${rm.role}`,
                            text: `Good Morning! \n\nThis is your manually triggered reminder to keep moving forward on your "${rm.role}" roadmap.\n\nLog in now to track your progress!`
                        });
                        sentCount++;
                    } catch (e) {
                        console.error(`[Email Failed] Could not send to ${user.email}`);
                    }
                }
            }
            res.json({ message: `Triggered reminders for ${sentCount} users.` });
        } else {
            console.log("[Reminder System] No active roadmaps to remind.");
            res.json({ message: "No active roadmaps found." });
        }
    } catch (e) {
        console.error("Manual Trigger Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Daily Reminder Scheduler (Runs every minute to check if it's 6:00 AM)
setInterval(async () => {
    const now = new Date();
    // Check if it is exactly 6:00 AM
    if (now.getHours() === 6 && now.getMinutes() === 0) {
        console.log("[Reminder System] It is 6 AM. Initiating daily reminders...");

        try {
            const activeRoadmaps = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM user_roadmaps WHERE status = 'In Progress' AND reminders_enabled = 1", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (activeRoadmaps.length > 0) {
                console.log(`[Reminder System] Found ${activeRoadmaps.length} active roadmaps.`);
                for (const rm of activeRoadmaps) {
                    // Fetch user email
                    const user = await dbGet("SELECT email FROM users WHERE id = ?", [rm.user_id]);
                    if (user) {
                        console.log(`[Email] Sending daily reminder to ${user.email} for '${rm.role}' journey.`);
                        try {
                            await transporter.sendMail({
                                from: process.env.EMAIL_USER,
                                to: user.email,
                                subject: `Daily Goal: ${rm.role}`,
                                text: `Good Morning! \n\nThis is your 6 AM reminder to keep moving forward on your "${rm.role}" roadmap.\n\nLog in now to track your progress and learn something new today!`
                            });
                        } catch (e) {
                            console.error(`[Email Failed] Could not send to ${user.email}`);
                        }
                    }
                }
            } else {
                console.log("[Reminder System] No active roadmaps to remind.");
            }
        } catch (e) {
            console.error("Reminder Scheduler Error:", e);
        }
    }
}, 60000); // Check every minute

// --- ADMIN ENDPOINTS ---

app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    // For demo/simple app, we use a fixed password for the seeded admin
    if (email === 'admin@compass.com' && password === 'admin123') {
        const user = await dbGet("SELECT * FROM users WHERE email = ? AND is_admin = 1", [email]);
        if (user) {
            return res.json({ user, token: "admin-token", isAdmin: true });
        }
    }
    res.status(401).json({ error: "Invalid admin credentials" });
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const userCount = await dbGet("SELECT COUNT(*) as count FROM users");
        const roadmapCount = await dbGet("SELECT COUNT(*) as count FROM user_roadmaps");
        const testCount = await dbGet("SELECT COUNT(*) as count FROM user_test_results");

        // Latest users
        const recentUsers = await new Promise((resolve, reject) => {
            db.all("SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        res.json({
            users: userCount.count,
            roadmaps: roadmapCount.count,
            tests: testCount.count,
            recentUsers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/usage', async (req, res) => {
    try {
        const dailyUsage = await new Promise((resolve, reject) => {
            db.all("SELECT COUNT(*) as count, DATE(timestamp) as date FROM ai_usage GROUP BY DATE(timestamp) ORDER BY date DESC LIMIT 7", (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        const endpointUsage = await new Promise((resolve, reject) => {
            db.all("SELECT COUNT(*) as count, endpoint FROM ai_usage GROUP BY endpoint ORDER BY count DESC", (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        // Gemini reset info (mocked/static based on Gemini free tier rules)
        const limit = 1500; // Custom daily limit for this app's dashboard
        const currentTotal = await dbGet("SELECT COUNT(*) as count FROM ai_usage WHERE DATE(timestamp) = DATE('now')");

        // Next reset is midnight
        const now = new Date();
        const reset = new Date();
        reset.setHours(24, 0, 0, 0);
        const timeToReset = Math.floor((reset - now) / (1000 * 60)); // minutes

        res.json({
            dailyUsage,
            endpointUsage,
            limit,
            current: currentTotal.count,
            resetInMinutes: timeToReset
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN DB BROWSER ---

app.get('/api/admin/db/tables', async (req, res) => {
    try {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows.map(r => r.name));
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/data', async (req, res) => {
    const { table, search } = req.query;
    if (!table) return res.status(400).json({ error: "Table name required" });

    try {
        // Warning: This is a internal admin tool, but we should still be careful.
        // In a real app, we'd whitelist tables.
        let query = `SELECT * FROM ${table}`;
        let params = [];

        if (search) {
            // Get columns first to build search
            db.all(`PRAGMA table_info(${table})`, (err, cols) => {
                if (err) return res.status(500).json({ error: err.message });

                const searchClauses = cols.map(c => `${c.name} LIKE ?`).join(' OR ');
                query += ` WHERE ${searchClauses}`;
                params = cols.map(() => `%${search}%`);

                db.all(query, params, (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(rows);
                });
            });
        } else {
            db.all(query, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
// ... existing listen code ...

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
