# Patch Patrol

Patch Patrol is a comprehensive service for automated repository dependency scanning, providing AI-powered risk analysis and real-time vulnerability monitoring for development teams.

## Prerequisites

- Node.js (version 18 or higher)
- PostgreSQL (version 12 or higher)
- GitHub Personal Access Token with repo permissions

## Setup

### Database Setup

1. Install and start PostgreSQL
2. Create a database: `createdb patch_patrol`
3. Apply the schema: `psql -d patch_patrol -f server/src/db/schema.sql`

### Backend Setup

1. Navigate to the server directory: `cd server`
2. Copy environment configuration: `cp .env.example .env`
3. Update `.env` with your configuration:
   - Database connection details
   - `APP_API_TOKEN` for API authentication
   - `OPENROUTER_API_KEY` for AI features
   - `WEBHOOK_SECRET` for GitHub webhooks
4. Install dependencies: `npm install`
5. Start the development server: `npm run dev`

The backend API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the client directory: `cd client`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

The frontend dashboard will be available at `http://localhost:5173`

### Running the Full Application

1. Ensure PostgreSQL is running
2. Start the backend in one terminal: `cd server && npm run dev`
3. Start the frontend in another terminal: `cd client && npm run dev`
4. Open `http://localhost:5173` in your browser

## Quick Test

1. Register a repo: `POST /api/repos` with {owner, repo, githubToken}
2. Trigger scan: `POST /api/scans` with {owner, repo}
3. View results: `GET /api/repos/:owner/:repo/scans/:scanId`

## Documentation

Detailed documentation is available in the `docs/` folder:

## Notes

- Set `APP_API_TOKEN` to protect non-webhook endpoints (send as X-API-Key or Authorization: Bearer)
- Set `OPENROUTER_API_KEY` for AI explanations (falls back to prototype if unavailable)
- Configure GitHub webhook to `POST /api/webhooks/github` with secret matching `WEBHOOK_SECRET`
