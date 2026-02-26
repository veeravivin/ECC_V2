# 🚀 Deployment Guide for Ethical Career Compass

This guide explains how to host your application on a Linux server (VPS).

## 1. Get a Server
Sign up for a cloud provider and create a **Ubuntu 22.04 (or newer)** server (often called a "Droplet" or "Instance").
*   **Recommended Specs:** 1GB RAM, 1 vCPU (minimum).
*   **Providers:** DigitalOcean ($4/mo), Hetzner (~€5/mo), Linode, AWS Lightsail.

## 2. Connect to Your Server
Open your terminal (on your computer) and run:
```bash
ssh root@<YOUR_SERVER_IP_ADDRESS>
```
*(Replace `<YOUR_SERVER_IP_ADDRESS>` with the IP given by your provider)*

## 3. Install Docker
Copy and paste this entire block into your server terminal to install Docker:
```bash
# Update and install allow apt to use a repository over HTTPS
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker’s official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 4. Deploy Your App

### A. Clone Your Code
If your code is on GitHub:
```bash
git clone https://github.com/YOUR_USERNAME/Ethical-Career-Compass-V2.git
cd Ethical-Career-Compass-V2
```

*(If you haven't pushed to GitHub yet, you can upload your files using `scp` or FileZilla)*

### B. Setup Environment Variables
Create your `.env` file on the server:
```bash
nano .env
```
Paste your secrets (API Keys, Email Password) into this file. Press `Ctrl+O`, `Enter` to save, and `Ctrl+X` to exit.

### C. Run the Application
Start the containers in the background:
```bash
docker compose up -d --build
```

## 5. You are Live! 🌐
Visit `http://<YOUR_SERVER_IP_ADDRESS>:3000` in your browser.

---

### Optional: Using a Domain Name (e.g., careercompass.com)
1.  Buy a domain from Namecheap or GoDaddy.
2.  Add an **A Record** in your domain settings pointing to your server's IP address.
3.  To get HTTPS (lock icon), you will need to set up **Nginx** and **Certbot** (this is an advanced step, ask if you need help!).
