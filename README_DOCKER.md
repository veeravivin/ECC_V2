# 🚀 How to Run "Ethical Career Compass" on Another Device

This guide explains how to deploy and run this application on any other computer (Windows, Mac, or Linux) using Docker.

## 📋 Prerequisites
Before you begin, install the following on the target machine:
1.  **Docker Desktop** (or Docker Engine): [Download Here](https://www.docker.com/products/docker-desktop/)
2.  **Git** (Optional, to clone the code): [Download Here](https://git-scm.com/downloads)

---

## 🛠️ Step-by-Step Installation

### 1. Transfer the Project Code
You can get the code onto the new machine in two ways:
*   **Option A (Git):** If you pushed this code to GitHub/GitLab:
    ```bash
    git clone <your-repository-url>
    cd Ethical-Career-Compass-V2
    ```
*   **Option B (USB/Zip):** Copy the entire project folder to the new machine.

### 2. Configure Environment Variables
The application needs secure keys (like for AI and Email) to function.
1.  Navigate to the project folder.
2.  Look for a file named `.env.example`.
3.  Duplicate it and rename the copy to `.env`.
4.  Open `.env` in a text editor and fill in your details:
    ```env
    GEMINI_API_KEY=AIzaSy...           <-- Get from Google AI Studio
    EMAIL_USER=yourname@gmail.com      <-- Your Gmail for sending OTPs
    EMAIL_PASS=abcd-efgh-ijkl-mnop     <-- Gmail App Password (NOT your login password)
    ```

### 3. Build and Run
Open a terminal (Command Prompt, PowerShell, or Terminal) in the project folder and run:

```bash
docker-compose up --build
```

*This step may take a few minutes the first time as it downloads dependencies and builds the application.*

---

## 🌍 Accessing the Application

Once the terminal says `Server running on port 3000` (or similar success messages):

*   **Open your browser** and go to:
    👉 **[http://localhost:3000](http://localhost:3000)**

*   **To check the AI Service directly (optional):**
    👉 [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛑 Stopping the Application
To stop the app, press `Ctrl + C` in the terminal.
To remove the containers completely:
```bash
docker-compose down
```

## ⚠️ Troubleshooting
*   **Port Conflicts:** If port `3000` or `8000` is already in use, open `docker-compose.yml` and change the mapping (e.g., `"4000:3000"`).
*   **Email Errors:** Ensure you are using an **App Password** for Gmail, not your main password.
