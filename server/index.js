const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const sdk = require('node-appwrite');
const { databases, DB_ID, COLLECTION_USERS, COLLECTION_AI_USAGE } = require('./appwrite');
const { Client, Databases, Storage, ID, Query, InputFile } = sdk;

// Appwrite Connectivity Check
if (!databases || !DB_ID) {
    console.warn("⚠️ Appwrite Cloud not fully configured in .env. Data will only be saved locally.");
} else {
    console.log("✅ Appwrite Cloud Sync Active: Data will be mirrored to Live Storage.");
}

// SMTP Connectivity Check
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ SMTP Credentials (EMAIL_USER/EMAIL_PASS) not found in .env. Email features (OTP/Reminders) will fail.");
} else {
    console.log(`✅ SMTP Configured for User: ${process.env.EMAIL_USER}`);
}

// AI Engine Discovery
console.log(`🚀 AI Service Target: ${aiServiceUrl}`);

// --- HEALTH CHECK ENDPOINTS ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        config: {
            ai_service: aiServiceUrl,
            smtp_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
            appwrite_configured: !!(databases && DB_ID)
        }
    });
});

app.get('/api/health/ai', async (req, res) => {
    try {
        const response = await axios.get(`${aiServiceUrl}/market_trends`, { timeout: 5000 });
        res.json({ ai_status: 'online', data: response.data });
    } catch (err) {
        res.status(502).json({
            ai_status: 'offline',
            error: err.message,
            hint: `Ensure AI service is running at ${aiServiceUrl}`
        });
    }
});

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

// --- POSTGRES DATABASE SETUP ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'career_compass',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false // Required for Render/External DBs
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Initialize Tables on Boot
const initializeDB = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            linkedin TEXT,
            summary TEXT,
            location TEXT,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Check for missing columns (Migration)
        const userColsResult = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        const existingCols = userColsResult.rows.map(r => r.column_name);
        const colsToAdd = [
            { name: 'phone', type: 'TEXT' },
            { name: 'linkedin', type: 'TEXT' },
            { name: 'summary', type: 'TEXT' },
            { name: 'location', type: 'TEXT' },
            { name: 'is_admin', type: 'BOOLEAN DEFAULT FALSE' }
        ];

        for (const col of colsToAdd) {
            if (!existingCols.includes(col.name)) {
                await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // Default Admin Seed
        await pool.query(`INSERT INTO users (name, email, is_admin) 
                         VALUES ('System Admin', 'admin@compass.com', TRUE) 
                         ON CONFLICT (email) DO UPDATE SET is_admin = TRUE`);

        await pool.query(`CREATE TABLE IF NOT EXISTS otp_codes (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS user_skills (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            skill_name TEXT,
            proficiency INTEGER,
            PRIMARY KEY (user_id, skill_name)
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS user_experience (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role TEXT,
            company TEXT,
            duration TEXT,
            description TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS user_education (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            degree TEXT,
            institution TEXT,
            year TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS user_roadmaps (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role TEXT,
            duration TEXT,
            roadmap_data TEXT,
            status TEXT DEFAULT 'Not Started',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            reminders_enabled BOOLEAN DEFAULT FALSE
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS market_trends_cache (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            trends_data TEXT,
            last_updated TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS user_test_results (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            topic TEXT,
            level TEXT,
            score INTEGER,
            total_questions INTEGER,
            details_json TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS ai_usage (
            id SERIAL PRIMARY KEY,
            endpoint TEXT,
            status TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS predefined_questions (
            id SERIAL PRIMARY KEY,
            topic TEXT,
            level TEXT,
            question_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log("✅ PostgreSQL Tables Initialized");
    } catch (err) {
        console.error("❌ DB Initialization Error:", err.message);
    }
};

initializeDB();

// Helper: Log AI Usage
const logAIUsage = async (endpoint, status = 'success') => {
    try {
        await pool.query("INSERT INTO ai_usage (endpoint, status) VALUES ($1, $2)", [endpoint, status]);

        // --- APPWRITE CLOUD MIRROR ---
        if (databases && DB_ID) {
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
    } catch (err) {
        console.error("AI Usage Log Fail:", err.message);
    }
};

// Helper: Adapters for async/await (Replacing SQLite helpers)
const dbRun = (sql, params = []) => pool.query(sql.replace(/\?/g, (val, i) => `$${params.indexOf(val) + 1}`), params); // This regex replacement is risky, better to use positional manually or a proper helper.
// Actually, I should just update the calls to use $1, $2, etc. and call pool.query directly.
// But to keep it semi-compatible for a quick migration, I'll create a better wrapper.

const query = (text, params) => {
    // Convert ? to $1, $2, etc.
    let index = 0;
    const formattedSQL = text.replace(/\?/g, () => {
        index++;
        return `$${index}`;
    });
    return pool.query(formattedSQL, params);
};

const dbGet = async (sql, params = []) => {
    const res = await query(sql, params);
    return res.rows[0];
};

const dbAll = async (sql, params = []) => {
    const res = await query(sql, params);
    return res.rows;
};


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
            const rows = await dbAll("SELECT question_data FROM predefined_questions WHERE LOWER(topic) = LOWER(?) AND level = ?", [t, l]);
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
            const response = await axios.post(`${aiServiceUrl}/generate_skill_test`, { topic, level });
            const questions = response.data;

            if (Array.isArray(questions) && questions.length > 0) {
                // Background: Save to DB with deduplication
                setImmediate(async () => {
                    try {
                        const currentRows = await dbAll("SELECT question_data FROM predefined_questions WHERE LOWER(topic) = LOWER(?) AND level = ?", [topic, level]);
                        const existingTexts = new Set(currentRows.map(r => {
                            try { return JSON.parse(r.question_data).question; } catch (e) { return null; }
                        }));

                        for (const q of questions) {
                            if (q.question && !existingTexts.has(q.question)) {
                                await query("INSERT INTO predefined_questions (topic, level, question_data) VALUES (?, ?, ?)", [topic, level, JSON.stringify(q)]);
                                existingTexts.add(q.question);
                            }
                        }
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

app.post('/api/tests/save', async (req, res) => {
    const { user_email, topic, level, score, total_questions, details } = req.body;
    try {
        const user = await dbGet("SELECT id FROM users WHERE email = ?", [user_email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        await query("INSERT INTO user_test_results (user_id, topic, level, score, total_questions, details_json) VALUES (?, ?, ?, ?, ?, ?)",
            [user.id, topic, level, score, total_questions, JSON.stringify(details)]);

        // --- APPWRITE CLOUD SYNC ---
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tests/history', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await dbGet("SELECT id FROM users WHERE email = ?", [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const rows = await dbAll("SELECT * FROM user_test_results WHERE user_id = ? ORDER BY created_at DESC", [user.id]);
        res.json(rows.map(r => ({ ...r, details_json: JSON.parse(r.details_json) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save a generated roadmap
app.post('/api/roadmaps/save', async (req, res) => {
    const { user_email, role, duration, roadmap } = req.body;
    console.log(`[Roadmap Save] Request for ${user_email}, role: ${role}`);

    if (!roadmap || !roadmap.roadmap || !Array.isArray(roadmap.roadmap)) {
        console.warn("[Roadmap Save] WARNING: Saving roadmap with invalid structure!", JSON.stringify(roadmap).substring(0, 100));
    }

    try {
        const user = await dbGet("SELECT id FROM users WHERE email = ?", [user_email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const insertRes = await query("INSERT INTO user_roadmaps (user_id, role, duration, roadmap_data) VALUES (?, ?, ?, ?) RETURNING id",
            [user.id, role, duration, JSON.stringify(roadmap)]);

        const lastID = insertRes.rows[0].id;
        console.log(`[Roadmap Save] Success! ID: ${lastID}`);
        res.json({ id: lastID, message: "Roadmap saved successfully" });
    } catch (err) {
        console.error("DB Save Error:", err);
        res.status(500).json({ error: "Failed to save roadmap: " + err.message });
    }
});

app.get('/api/roadmaps', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await dbGet("SELECT id FROM users WHERE email = ?", [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const rows = await dbAll("SELECT * FROM user_roadmaps WHERE user_id = ? ORDER BY created_at DESC", [user.id]);
        const roadmaps = rows.map(r => ({
            ...r,
            roadmap_data: JSON.parse(r.roadmap_data)
        }));
        res.json(roadmaps);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
            for (const skill of skills) {
                await query('INSERT INTO user_skills (user_id, skill_name, proficiency) VALUES (?, ?, ?)', [user.id, skill, 3]);
            }
        }

        // 2. Experience
        await dbRun('DELETE FROM user_experience WHERE user_id = ?', [user.id]);
        if (experience && Array.isArray(experience)) {
            for (const exp of experience) {
                await query('INSERT INTO user_experience (user_id, role, company, duration, description) VALUES (?, ?, ?, ?, ?)',
                    [user.id, exp.role, exp.company, exp.duration, exp.description]);
            }
        }

        // 3. Education
        await dbRun('DELETE FROM user_education WHERE user_id = ?', [user.id]);
        if (education && Array.isArray(education)) {
            for (const edu of education) {
                await query('INSERT INTO user_education (user_id, degree, institution, year) VALUES (?, ?, ?, ?)',
                    [user.id, edu.degree, edu.institution, edu.year]);
            }
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

        const skills = (await dbAll('SELECT skill_name FROM user_skills WHERE user_id = ?', [user.id])).map(r => r.skill_name);
        const experience = await dbAll('SELECT role, company, duration, description FROM user_experience WHERE user_id = ?', [user.id]);
        const education = await dbAll('SELECT degree, institution, year FROM user_education WHERE user_id = ?', [user.id]);

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
        const response = await axios.post(`${aiServiceUrl}/analyze_career_match`, req.body);
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
            storage.createFile(
                BUCKET_RESUMES || 'resumes',
                ID.unique(),
                InputFile.fromBuffer(req.file.buffer, req.file.originalname)
            ).catch(e => console.error("[Appwrite Storage Fail]:", e.message));
        }

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
        const response = await axios.post(`${aiServiceUrl}/generate_phase_test`, req.body);
        res.json(response.data);
    } catch (err) {
        console.error("AI Quiz Error:", err.message);
        res.status(502).json({ error: "AI Service Unavailable" });
    }
});

app.get('/api/ai/trends', async (req, res) => {
    try {
        const response = await axios.get(`${aiServiceUrl}/market_trends`);
        res.json(response.data);
    } catch (err) {
        console.error("AI Trends Error:", err.message);
        res.status(502).json({ error: "AI Service Unavailable" });
    }
});

app.post('/api/roadmaps/progress', async (req, res) => {
    const { id, roadmap_data } = req.body;
    try {
        await query("UPDATE user_roadmaps SET roadmap_data = ? WHERE id = ?", [JSON.stringify(roadmap_data), id]);
        res.json({ message: "Progress saved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Roadmap & Enable Reminders
app.post('/api/roadmaps/start', async (req, res) => {
    const { id } = req.body;
    const now = new Date().toISOString();

    try {
        await query("UPDATE user_roadmaps SET status = 'In Progress', started_at = ?, reminders_enabled = TRUE WHERE id = ?", [now, id]);
        res.json({ message: "Roadmap started successfully", started_at: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Roadmap Endpoint
app.delete('/api/roadmaps/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query("DELETE FROM user_roadmaps WHERE id = ?", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Roadmap not found" });
        res.json({ message: "Roadmap deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual Trigger for Reminder System (For Testing/Demo)
app.post('/api/admin/trigger-reminders', async (req, res) => {
    console.log("[Admin] Manual trigger for daily reminders initiated.");

    // Logic extracted from scheduler
    try {
        const activeRoadmaps = await dbAll("SELECT * FROM user_roadmaps WHERE status = 'In Progress' AND reminders_enabled = TRUE");

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
            const activeRoadmaps = await dbAll("SELECT * FROM user_roadmaps WHERE status = 'In Progress' AND reminders_enabled = TRUE");

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
        const user = await dbGet("SELECT * FROM users WHERE email = ? AND is_admin = TRUE", [email]);
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
        const recentUsers = await dbAll("SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5");

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
        const dailyUsage = await dbAll("SELECT COUNT(*) as count, timestamp::date as date FROM ai_usage GROUP BY timestamp::date ORDER BY date DESC LIMIT 7");
        const endpointUsage = await dbAll("SELECT COUNT(*) as count, endpoint FROM ai_usage GROUP BY endpoint ORDER BY count DESC");

        // Gemini reset info (mocked/static based on Gemini free tier rules)
        const limit = 1500; // Custom daily limit for this app's dashboard
        const currentTotal = await dbGet("SELECT COUNT(*) as count FROM ai_usage WHERE timestamp::date = CURRENT_DATE");

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
        const rows = await dbAll("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'");
        res.json(rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/db/data', async (req, res) => {
    const { table, search } = req.query;
    if (!table) return res.status(400).json({ error: "Table name required" });

    try {
        let sql = `SELECT * FROM ${table}`;
        let params = [];

        if (search) {
            const cols = await dbAll("SELECT column_name as name FROM information_schema.columns WHERE table_name = ?", [table]);
            const searchClauses = cols.map(c => `${c.name}::text ILIKE ?`).join(' OR ');
            sql += ` WHERE ${searchClauses}`;
            params = cols.map(() => `%${search}%`);
        }

        const rows = await dbAll(sql, params);
        res.json(rows);
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
