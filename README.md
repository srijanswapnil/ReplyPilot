<p align="center">
  <h1 align="center">🚀 ReplyPilot</h1>
  <p align="center">
    <strong>AI-Powered YouTube Comment Management Platform</strong>
  </p>
  <p align="center">
    Automate comment classification, reply generation, and publishing — all from one dashboard.
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#project-structure">Project Structure</a> •
    <a href="#license">License</a>
  </p>
</p>

---

## ✨ Features

- **🔐 Google OAuth 2.0** — Secure login with YouTube channel linking
- **📥 Auto Comment Sync** — Periodically fetches new comments from all your videos
- **🤖 AI Intent Classification** — Custom fine-tuned model detects spam, praise, criticism, questions, and neutral comments
- **💬 Smart Reply Generation** — LLM-powered replies using Google Gemma-4-31B-it with 10 customizable tone templates
- **🎭 Persona System** — Create multiple reply personas with custom system prompts and tones
- **📹 RAG-Powered Context** — Video transcript indexing with semantic search for context-aware replies
- **📊 Dashboard & Analytics** — Channel overview, video management, and comment insights
- **⚡ Background Processing** — BullMQ job queues with retry logic and exponential backoff
- **🛡️ Enterprise Security** — AES-256-GCM token encryption, CSRF protection, rate limiting, Helmet headers

---

## 🏗️ Architecture

ReplyPilot uses a **microservices architecture** with 5 independent services:

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   React +   │────▶│   Express.js    │────▶│   BullMQ Worker  │
│   Vite UI   │     │   REST API      │     │   (Background)   │
│  (Port 5173)│     │  (Port 5000)    │     │                  │
└─────────────┘     └────────┬────────┘     └───────┬──────────┘
                             │                      │
                    ┌────────┴────────┐    ┌────────┴──────────┐
                    │    MongoDB      │    │  AI Service       │
                    │    Redis        │    │  FastAPI (8000)   │
                    │                 │    │                   │
                    └─────────────────┘    │  RAG Service      │
                                          │  FastAPI (8001)   │
                                          └───────────────────┘
```

| Service | Description |
|---------|-------------|
| **Client** | React 18 + Vite frontend with Tailwind CSS |
| **Server** | Express.js API with Passport.js auth, session management, and cron jobs |
| **Worker** | Standalone BullMQ processor for classify, generate, and post-reply jobs |
| **AI Service** | FastAPI microservice for intent classification and LLM reply generation |
| **RAG Service** | FastAPI microservice for video transcript ingestion and semantic retrieval |

> For a comprehensive deep-dive, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 8, React Router v7, Tailwind CSS 4, Axios |
| **Backend API** | Node.js, Express 5, Passport.js, Mongoose, Winston |
| **Background Jobs** | BullMQ (Redis-backed), node-cron |
| **AI / NLP** | Python, FastAPI, HuggingFace Transformers, OpenAI SDK |
| **LLM** | Google Gemma-4-31B-it (HuggingFace Inference API) |
| **Embeddings** | BGE (BAAI General Embedding) via sentence-transformers |
| **Vector DB** | Pinecone |
| **Primary DB** | MongoDB (Mongoose ODM) |
| **Cache / Queue** | Redis (sessions, caching, token store, job queue) |
| **Auth** | Google OAuth 2.0, express-session + connect-redis |
| **Security** | Helmet, CORS, CSRF, AES-256-GCM encryption, Rate Limiting |
| **External API** | YouTube Data API v3 |
| **Infra** | Docker |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud)
- **Google Cloud Console** project with YouTube Data API v3 and OAuth 2.0 credentials
- **HuggingFace** API token (for LLM inference)
- **Pinecone** account (for RAG vector storage)

### 1. Clone the Repository

```bash
git clone https://github.com/ashutosh2652/ReplyPilot.git
cd ReplyPilot
```

### 2. Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example server/.env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `SESSION_SECRET` | Express session secret |
| `CLIENT_URL` | Frontend URL (e.g., `http://localhost:5173`) |
| `AI_SERVICE_URL` | AI service URL (e.g., `http://localhost:8000`) |
| `YOUTUBE_API_KEY` | YouTube Data API key |

> Also configure `.env` files for `ai-service/`, `rag/`, and `worker/` — refer to their `.env.example` / `.env.sample` files.

### 3. Install & Run Each Service

#### Client (React Frontend)

```bash
cd client
npm install
npm run dev          # → http://localhost:5173
```

#### Server (Express API)

```bash
cd server
npm install
npm run dev          # → http://localhost:5000
```

#### Worker (BullMQ)

```bash
cd worker
npm install
npm run dev
```

#### AI Service (FastAPI)

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

#### RAG Service (FastAPI)

```bash
cd rag
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

---

## 📁 Project Structure

```
ReplyPilot/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── api/                # Axios API modules
│   │   ├── components/         # Shared components (ProtectedRoute)
│   │   ├── context/            # AuthContext provider
│   │   ├── hooks/              # Custom hooks (useAuth)
│   │   ├── layouts/            # AppLayout wrapper
│   │   └── pages/              # 6 page components
│   └── vite.config.js
│
├── server/                     # Express.js Backend API
│   ├── server.js               # Entry point + graceful shutdown
│   └── src/
│       ├── config/             # env, db, redis, passport, cors
│       ├── controllers/        # Route controllers
│       ├── middleware/          # Auth, CSRF, rate limiter, logging
│       ├── models/             # Mongoose schemas (User, Channel, Video, etc.)
│       ├── routes/             # API route definitions
│       ├── services/           # Business logic (Channel, Queue, Reply, AI)
│       ├── mapper/             # Data transformation layers
│       ├── jobs/               # Cron jobs (syncComments)
│       └── utils/              # Crypto, logger, YouTube helpers
│
├── worker/                     # BullMQ Background Worker
│   ├── main.js                 # Entry point + shutdown handlers
│   ├── config/                 # DB, Redis, env config
│   ├── models/                 # Shared Mongoose models
│   ├── tasks/                  # classify, generate, postReply, youtubeSync workers
│   └── utils/                  # HTTP client, logger, YouTube helpers
│
├── ai-service/                 # Python AI Microservice
│   └── app/
│       ├── main.py             # FastAPI application
│       ├── api/v1/             # classify & generate endpoints
│       ├── services/           # Classification & generation logic
│       ├── model_files/        # Fine-tuned intent classifier
│       ├── prompts/            # 10 tone template files
│       └── schemas/            # Pydantic request/response models
│
├── rag/                        # Python RAG Microservice
│   └── app/
│       ├── main.py             # FastAPI application
│       ├── api/routes/         # health, ingest, query endpoints
│       ├── services/           # Ingest & query orchestration
│       ├── pipeline/           # 9-stage ingest pipeline
│       ├── retrieval/          # Query embedder, searcher, reranker
│       └── core/               # Config, logger, exceptions
│
├── infra/
│   └── docker/                 # Dockerfiles for client & server
│
├── ARCHITECTURE.md             # Detailed system architecture documentation
├── .env.example                # Environment variable template
└── README.md                   # ← You are here
```

---

## 🔄 How It Works

1. **User logs in** via Google OAuth → YouTube channel is linked
2. **Comments sync** automatically every 30 minutes via cron job
3. **Classification worker** picks up new comments → AI Service classifies intent (spam / praise / criticism / question / neutral)
4. **Generation worker** creates AI-powered replies using the user's selected persona and tone
5. **User reviews** replies on the dashboard → approves, edits, or rejects
6. **Post-reply worker** publishes approved replies directly to YouTube (with idempotency safeguards)

---

## 📡 API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/google` | GET | Initiate Google OAuth login |
| `/api/auth/google/callback` | GET | OAuth callback handler |
| `/api/auth/logout` | POST | Logout and destroy session |
| `/api/channel/sync` | POST | Sync channel info from YouTube |
| `/api/channel/videos` | GET | List synced videos |
| `/api/channel/videos/:videoId/comments` | GET | Fetch comments for a video |
| `/api/comments` | GET | List/filter all comments |
| `/api/personas` | GET/POST | CRUD for reply personas |
| `/api/batch/classify` | POST | Bulk classify comments |
| `/api/batch/generate` | POST | Bulk generate replies |
| `/api/replies` | GET | List generated replies |
| `/api/replies/:id/approve` | POST | Approve and publish a reply |
| `/health` | GET | Service health check |

---

## 🔒 Security

- **AES-256-GCM** encryption for Google refresh tokens at rest
- **Redis-backed sessions** with 7-day TTL and session regeneration
- **CSRF protection** on all state-changing endpoints
- **Rate limiting** with Redis store to prevent API abuse
- **Helmet** HTTP security headers
- **CORS** whitelist configuration
- **User data caching** (15-min TTL) to minimize database exposure

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <strong>Ashutosh</strong>
</p>
