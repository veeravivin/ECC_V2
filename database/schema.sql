CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_codes (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_skills (
    user_id INT REFERENCES users(id),
    skill_name VARCHAR(255),
    proficiency INT CHECK (proficiency BETWEEN 1 AND 10),
    PRIMARY KEY (user_id, skill_name)
);

CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    skill_name VARCHAR(255),
    level VARCHAR(10) CHECK (level IN ('Easy', 'Medium', 'Hard')),
    score INT,
    passed BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store profiles if needed
CREATE TABLE IF NOT EXISTS profiles (
    user_id INT PRIMARY KEY REFERENCES users(id),
    resume_text TEXT,
    values_list TEXT, -- JSON or comma separated
    stress_tolerance INT
);
