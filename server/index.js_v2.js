const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const { databases, DB_ID, COLLECTION_USERS, COLLECTION_AI_USAGE, ID } = require('./appwrite');

// Appwrite Connectivity Check
if (!databases || !DB_ID) {
    console.warn("⚠️ Appwrite Cloud not fully configured in .env. Data will only be saved locally (SQLite).");
} else {
    console.log("✅ Appwrite Cloud Sync Active: Data will be mirrored to Live Storage.");
}
