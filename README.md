# Patch Patrol

Patch Patrol is a comprehensive service for automated repository dependency scanning, providing AI-powered risk analysis and real-time vulnerability monitoring for development teams.

## Prerequisites

- Node.js (version 20 or higher)
- PostgreSQL (version 12 or higher)
- GitHub OAuth App credentials

## Setup

### Database Setup

1. Install and start PostgreSQL
2. Create a database: `createdb patch_patrol`
3. Apply the schema: `psql -d patch_patrol -f server/src/db/schema.sql`

### Backend Setup

1. Navigate to the server directory: `cd server`
2. Copy environment configuration: `cp .env.example .env`
3. Update `.env` with your configuration (see Environment Variables section)
4. Install dependencies: `npm ci`
5. Start the development server: `npm run dev`

The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory: `cd client`
2. Install dependencies: `npm ci`
3. Start the development server: `npm run dev`

The frontend dashboard will be available at `http://localhost:5173`

### Running the Full Application

#### Development (local)

1. Ensure PostgreSQL is running
2. Start the backend in one terminal: `cd server && npm run dev`
3. Start the frontend in another terminal: `cd client && npm run dev`
4. Open `http://localhost:5173` in your browser

#### Production (Docker Compose)

1. Set all required environment variables (see below) in a `.env` file at the project root
2. Run `docker-compose up -d`
3. Access the frontend at `http://localhost`

The stack includes:
- PostgreSQL with schema migration
- Backend API (Node.js + Express)
- Frontend (React + Vite) served via Nginx

## Environment Variables

All variables must be set in production. See `server/.env.example` for defaults and comments.

### Required

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | 32-byte base64 string or 64-char hex for token encryption |
| `WEBHOOK_SECRET` | 32+ byte base64 secret for GitHub webhook verification |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth App client secret |
| `OAUTH_CALLBACK_URL` | Full callback URL (e.g., `https://your-domain.com/api/auth/github/callback`) |
| `SESSION_SECRET` | 32-byte base64 secret for signing session cookies |
| `APP_API_TOKEN` | Internal API token (required in production) |
| `DB_PASSWORD` | PostgreSQL password |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_NAME` | PostgreSQL database name | `patch_patrol` |
| `DB_POOL_MAX` | DB connection pool size | `10` |
| `PORT` | Backend port | `5000` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `AI_ENABLED` | Enable AI explanations | `true` |
| `AI_PROVIDER` | AI provider (`openrouter` or `openai`) | `openrouter` |
| `OPENROUTER_MODEL` | Model ID for OpenRouter | `openai/gpt-4o-mini` |
| `OPENROUTER_EMBEDDING_MODEL` | Embedding model | `openai/text-embedding-3-small` |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | (none) |

## Quick Test

1. Register a repo: `POST /api/repos` with `{owner, repo}` (include API token header)
2. Trigger scan: `POST /api/scans` with `{owner, repo}`
3. View results: `GET /api/repos/:owner/:repo/scans/:scanId`

## Production Deployment Notes

- **Never** commit `.env` files; use Docker secrets or Kubernetes secrets
- Set `NODE_ENV=production` when deploying
- Ensure HTTPS with valid TLS certificate (handled by reverse proxy or load balancer)
- Configure GitHub OAuth callback URL to your production domain
- Set up proper database backups and monitoring
- Use a process manager (PM2, systemd) if not using Docker
- Set up log aggregation (stdout from containers)
- Rotate secrets periodically

## Security Features

- Encrypted storage of GitHub OAuth tokens (AES-256-GCM)
- CSRF protection with double-submit cookie pattern
- Rate limiting on all endpoints
- Helmet-style security headers (CSP, HSTS, etc.)
- SQL parameterized queries (pg library)
- Session cookies: HttpOnly, Secure, SameSite=Strict
- Webhook signature verification (timing-safe)

## Architecture

- **Client**: React 19 + React Router, Tailwind CSS, Recharts
- **Server**: Express 5 (Node.js 20+), PostgreSQL
- **Security**: OAuth2 + PKCE, HMAC-signed sessions, AES-256 token encryption
- **Scanning**: OSV vulnerability database
- **AI**: OpenRouter (GPT-4o-mini) with prototype fallback

## License

ISC
