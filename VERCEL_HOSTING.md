# 🚀 Hosting on Vercel (Free Tier)

You can host this project on Vercel for free, but you need to make **one critical change** because Vercel does not support local files (like `career_compass.db`).

## ⚠️ Important Limitations
1.  **Database**: The local `career_compass.db` file will be **deleted** every time your site sleeps (every few minutes). You **MUST** use a cloud database like **Neon (Postgres)** or **Turso (SQLite)**.
2.  **AI Engine**: The Python AI engine might be too large (libraries like Pandas/Scikit-learn) for Vercel's free tier limit (250MB). If the build fails, you might need to host the AI part on **Render** or **Hugging Face Spaces**.

---

## 🛠️ Step 1: Use a Cloud Database (Required)
Since you cannot use SQLite on Vercel, switch to **Neon (Free Postgres)**.

1.  Go to [Neon.tech](https://neon.tech) and create a free account.
2.  Create a project and get your **Connection String** (e.g., `postgres://user:pass@ep-shiny-....neon.tech/neondb`).
3.  **Update your Code**:
    You need to modify `server/index.js` to use `pg` (Postgres) instead of `sqlite3` when simpler.
    *(If you want help with this code conversion, ask me: "Convert my backend to use Postgres for Vercel")*.

## 🛠️ Step 2: Push to GitHub
1.  Create a repository on GitHub.
2.  Push your code:
    ```bash
    git init
    git add .
    git commit -m "Initial commit for Vercel"
    git branch -M main
    git remote add origin <YOUR_GITHUB_REPO_URL>
    git push -u origin main
    ```

## 🛠️ Step 3: Connect to Vercel
1.  Go to [Vercel.com](https://vercel.com) and sign up.
2.  Click **"Add New Project"**.
3.  Select your GitHub repository.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should auto-detect).
    *   **Root Directory**: Leave as `./` (current directory).
5.  **Environment Variables**:
    Add the following variables in the Vercel dashboard:
    *   `GEMINI_API_KEY`: Your Google AI Studio key.
    *   `EMAIL_USER`: Your Gmail address.
    *   `EMAIL_PASS`: Your App Password.
    *   `AI_SERVICE_URL`: Set this to your Vercel URL + `/api/ai` (e.g., `https://your-app.vercel.app/api/ai`) or `http://localhost:8000` if testing.
    *   `DATABASE_URL`: Your Neon/Turso connection string (if you updated the code).

6.  Click **Deploy**.

## 🛠️ Troubleshooting
*   **504 Gateway Timeout**: The AI generation might take too long (Vercel has a 10s limit on free functions). If this happens, you **cannot** host the AI on Vercel Free tier. You must use Render or dedicated backend hosting.
*   **Database Reset**: If your users disappear, it means you are still using SQLite. Switch to Neon/Turso.
