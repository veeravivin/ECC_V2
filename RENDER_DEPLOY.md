# 🚀 How to Host on Render (Docker)

This project is configured for easy deployment on [Render](https://render.com) using the `render.yaml` Blueprint. This will automatically set up your AI Engine, Backend/Frontend, and Redis instance.

## 📋 Prerequisites
1.  A [Render](https://render.com) account.
2.  Your code pushed to a **GitHub** or **GitLab** repository.

## 🛠️ Step 1: Push to GitHub
If you haven't already:
```bash
git init
git add .
git commit -m "Add Render configuration"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 🛠️ Step 2: Deploy to Render
1.  Log in to [Render Dashboard](https://dashboard.render.com).
2.  Click **"New +"** and select **"Blueprint"**.
3.  Connect your GitHub repository.
4.  Render will detect the `render.yaml` file and show you the services it will create:
    *   `ethical-career-ai` (Web Service)
    *   `ethical-career-web` (Web Service)
    *   `ethical-career-redis` (Redis)
5.  **Important:** You must fill in the missing environment variables in the Blueprint setup screen:
    *   `GEMINI_API_KEY` (Get from [Google AI Studio](https://aistudio.google.com/))
    *   `SERP_API_KEY` (Optional, for job searches)
    *   `EMAIL_USER` (Your Gmail)
    *   `EMAIL_PASS` (Your Gmail App Password)
6.  Click **"Apply"**.

## ⚠️ Important Notes for Free Tier
-   **SQLite Database**: On the Render **Free Tier**, the SQLite database (`/app/server/data/career_compass.db`) is **ephemeral**. This means your user data will be wiped every time the service restarts or redeploys.
    *   *Solution:* Upgrade the `ethical-career-web` service to the **Starter** plan ($7/mo) and add a **Persistent Disk** (which the `render.yaml` is already prepared to support if you add the `disk:` section).
-   **Cold Starts**: Free tier services "sleep" after 15 minutes of inactivity. The first request after a sleep period might take 30-50 seconds to respond.

## 📁 Project Structure Used
Render is configured to use:
-   `Dockerfile.web` (Root) for the main application.
-   `ai-engine/Dockerfile` for the AI Logic.
-   Managed Redis for caching.
