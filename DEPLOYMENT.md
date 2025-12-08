# 🚀 EventEase API Deployment Guide

## Render Deployment

### 1. Deploy to Render
- **Service**: Web Service
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### 2. Environment Variables on Render
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://eventease-api.onrender.com/api/auth/google/callback
RENDER_URL=https://eventease-api.onrender.com