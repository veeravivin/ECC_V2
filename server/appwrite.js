const { Client, Databases, Storage, ID, Query } = require('node-appwrite');
const path = require('path');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

module.exports = {
    databases,
    storage,
    ID,
    Query,
    DB_ID: process.env.APPWRITE_DATABASE_ID,
    COLLECTION_USERS: 'users',
    COLLECTION_AI_USAGE: 'ai_usage',
    BUCKET_RESUMES: process.env.APPWRITE_BUCKET_ID || 'resumes'
};
