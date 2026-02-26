# Ethical Career Compass – AI-Driven Career, Skill & Learning Intelligence Platform

## Project Overview
This platform solves career confusion and skill mismatch using ethical, explainable AI agents. It does not rely on demo data; all insights are generated from user inputs (Profile, Resume, Skill Tests).

## Tech Stack
- **Frontend**: React (Vite) + TailwindCSS + Framer Motion
- **Backend**: Node.js + Express
- **AI Engine**: Python (FastAPI) + Scikit-Learn
- **Database**: PostgreSQL / SQL Schema provided

## Folder Structure
```
/
├── client/          # React Frontend
│   ├── src/
│   │   ├── pages/   # Login, Dashboard, Profile, CareerMatch, SkillTest
│   │   ├── components/
│   │   └── api/
├── server/          # Node.js Backend
│   ├── routes/      # Auth, AI Proxy
│   └── index.js
├── ai-engine/       # Python AI Logic
│   ├── agents.py    # Skill, Value, WellBeing, Regret Agents
│   └── main.py      # FastAPI Entry
├── database/        # SQL Schemas
└── README.md
```

## Setup Instructions
1. **Database**: Import `database/schema.sql` into your PostgreSQL instance.
2. **Environment**:
   - `server/.env`: DB credentials, Email SMTP (EMAIL_USER, EMAIL_PASS)
   - `ai-engine/.env`: (Optional) OpenAI keys if extending agents.
3. **Install**:
   - Client: `cd client && npm install`
   - Server: `cd server && npm install`
   - AI: `cd ai-engine && pip install -r requirements.txt`
4. **Run**:
   - AI Engine: `cd ai-engine && uvicorn main:app --reload --port 8000`
   - Server: `cd server && npm run dev` (Port 3000)
   - Client: `cd client && npm run dev` (Port 5173)

## AI Agents Logic
1. **Skill Matching Agent**: 
   - Uses set intersection and weighted scoring to calculate specific skill overlaps.
   - Explains missing skills precisely.
2. **Value Alignment Agent**:
   - Maps user values (e.g. Independence) to Job Ethos.
3. **Well-Being Agent**:
   - Compares User Stress Tolerance (1-10) vs Job Stress Level.
   - Predicts burnout risk.
4. **Regret Prediction Agent**:
   - Meta-agent that combines Wellbeing (40%), Alignment (40%) and Skills (20%) to predict long-term regret probability.

## Strict Rules Implemented
- **No Demo Data**: Dashboard logic checks for `hasData` flag (default false) and renders Empty State.
- **Strict Skill Tests**: Users must pass Easy (>70%) to unlock Medium.
- **Full Screen Integrity**: Skill test forces full-screen mode.
- **Auth**: Real OTP generation sent via SMTP (configured in nodemail).

## API Design
- `POST /api/auth/login`: Send OTP
- `POST /api/auth/verify`: Verify OTP & Create User
- `POST /analyze_career_match`: (AI) Detailed multi-agent analysis
- `POST /generate_roadmap`: (AI) Dynamic learning path

## License
Confidential.
