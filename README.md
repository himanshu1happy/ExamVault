# ExamVault

ExamVault is a full-stack educational platform for browsing, uploading, downloading, and discussing competitive examination papers. It includes authentication, saved papers, comments, an admin dashboard, file storage, and an AI study assistant powered by Gemini and RAG.

## Features

- Student and administrator authentication
- Email OTP verification and password reset
- Exam paper search and filtering
- Paper downloads, likes, and saved-paper lists
- PDF uploads and Cloudinary media storage
- Paper comments and admin moderation
- Gemini-based study assistant with RAG retrieval
- Responsive static frontend
- Rate limiting, CORS controls, Helmet security headers, and JWT authentication

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT, bcrypt
- **File storage:** Cloudinary
- **AI:** Google Gemini APIs
- **Email:** Brevo

## Getting Started

### Prerequisites

- Node.js 18 or newer
- MongoDB local instance or MongoDB Atlas
- Optional: Cloudinary, Gemini, and Brevo accounts

### Installation

```bash
npm install
cp .env.example .env
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.

Update `.env` with local and service credentials. JWT secrets must contain at least 64 bytes.

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:5001`.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP server port |
| `NODE_ENV` | `development` or `production` |
| `APP_URL` | Public application URL |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long secret used to sign JWTs |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_EMBEDDING_MODEL` | Embedding model name |
| `GEMINI_CHAT_MODEL` | Chat model name |
| `RAG_MIN_SCORE` | Minimum RAG similarity score |
| `BREVO_API_KEY` | Brevo API key |
| `BREVO_SENDER_EMAIL` | Verified sender email |
| `BREVO_SENDER_NAME` | Sender display name |

Never commit `.env` or real credentials. `.env` is ignored by Git.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the server |
| `npm run dev` | Start with Nodemon |
| `npm run seed` | Seed local MongoDB with sample papers |
| `npm run reembed` | Rebuild paper embeddings |

The seed script is restricted to local MongoDB hosts and requires explicit confirmation:

```bash
node seed.js --confirm
```

## API Overview

- `GET /api/health` - Health check
- `/api/auth/*` - Registration, login, profile, and password flows
- `/api/papers/*` - Paper listing, uploads, downloads, saves, likes, and comments
- `/api/messages/*` - Contact and admin messages
- `/api/ai/*` - AI study assistant
- `/api/admin/*` - Admin statistics and moderation
