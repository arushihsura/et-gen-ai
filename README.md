# AI News

AI News is a full-stack business news intelligence application.

It combines:
- A React + Vite frontend
- An Express backend
- Groq-powered analysis, briefing, and translation
- SQLite persistence
- ffmpeg-based media rendering

## Quick Start

1. Install dependencies.

```bash
cd backend
npm install

cd ../frontend
npm install
```

2. Configure environment variables in backend/.env.

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_CHAT_MODEL=llama-3.1-8b-instant
DB_PATH=
```

3. Start backend and frontend in separate terminals.

Terminal A:

```bash
cd backend
npm run dev
```

Terminal B:

```bash
cd frontend
npm run dev
```

4. Open the Vite URL printed in the frontend terminal.

## Project Structure

```text
ai-news/
  backend/
    server.js
    package.json
    services/
    routes/
    data/
    media/
  frontend/
    src/
    public/
    package.json
  README.md
```

## Configuration

### Backend

- GROQ_API_KEY: Required for AI routes.
- GROQ_MODEL: Primary model for structured intelligence tasks.
- GROQ_CHAT_MODEL: Model used for chat-like tasks.
- DB_PATH: Optional SQLite file path.

If DB_PATH is empty, the app uses backend/data/ai-news.db.

### Frontend

- Default API base is http://localhost:5000.
- Optional override: set VITE_API_BASE in frontend environment.

## Development Commands

### Backend

```bash
npm run start        # Node server
npm run dev          # Nodemon server
npm run client:dev   # Start frontend dev server from backend folder
npm run client:build # Build frontend from backend folder
```

### Frontend

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Lint checks
```

## Build and Validation Workflow

### Frontend Build

```bash
cd frontend
npm run build
```

### Backend Syntax Validation

```bash
cd backend
node --check server.js
node --check services/intelligenceService.js
node --check services/videoRenderer.js
```

### API Smoke Checks (Optional)

Run after backend starts:

```bash
# Example (PowerShell)
Invoke-WebRequest -Method Post -Uri "http://localhost:5000/story-arc" -ContentType "application/json" -Body '{"topic":"Markets","url":"https://economictimes.indiatimes.com/markets/stocks/news"}'
```

## Core API Surface

Base URL: http://localhost:5000

- GET /news
- GET /article
- GET or POST /summarize
- POST /chat
- POST /navigator
- POST /story-arc
- POST /vernacular
- POST /video-studio
- GET /history/summaries
- GET /history/chats

## Build and Commit History

Recent commits:

```text
1ac69fa (HEAD -> master, origin/master) final changes
deb7c02 readme
d14f811 hello git
```

Useful history commands:

```bash
git log --oneline --decorate -n 20
git show --name-only <commit>
```

Recommended commit prefixes:
- feat
- fix
- build
- docs

## Common Issues

### Backend does not start

Cause:
- Running node server.js from repository root.

Fix:

```bash
cd backend
node server.js
```

### Frontend cannot connect to API

Cause:
- Backend is not running.
- Frontend is pointing to wrong API base.

Fix:
- Start backend from backend/.
- Verify VITE_API_BASE (if set).

### Vite runs on a different port

Cause:
- 5173 is occupied.

Fix:
- Use the exact URL printed by Vite (for example 5174).

### AI route failures

Cause:
- Missing or invalid GROQ_API_KEY.

Fix:
- Update backend/.env and restart backend.
