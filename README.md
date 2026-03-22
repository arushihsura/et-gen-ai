# AI News

AI News is a full-stack news intelligence app with a React frontend and an Express backend.
It fetches financial news, summarizes content, powers chat/Q&A, personalizes feeds, and generates briefing/video-style outputs.

## Project Structure

```text
ai-news/
  backend/      # Express API, scraping, AI services, SQLite persistence, media rendering
  frontend/     # React + Vite UI
```

## Tech Stack

- Frontend: React, React Router, Vite
- Backend: Node.js, Express
- Data: SQLite
- AI: Groq models
- Media: ffmpeg-static, Google TTS

## Prerequisites

- Node.js 18+
- npm
- Internet access for scraping and AI requests

## Environment Variables

Create `backend/.env` with values similar to:

```env
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_CHAT_MODEL=llama-3.1-8b-instant
DB_PATH=
```

Notes:
- `GROQ_API_KEY` is required for AI features.
- `DB_PATH` is optional. If empty, the app uses `backend/data/ai-news.db`.
- Frontend API target defaults to `http://localhost:5000`.
- To override frontend API base URL, set `VITE_API_BASE` in frontend env.

## Install

Install dependencies in both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run in Development

Use two terminals.

Terminal 1 (backend):

```bash
cd backend
npm run dev
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

- Backend runs on port `5000`.
- Frontend runs on Vite dev server (typically `5173`).

## Build Frontend

From frontend:

```bash
cd frontend
npm run build
```

Or from backend convenience script:

```bash
cd backend
npm run client:build
```

## Backend Scripts

In `backend/package.json`:

- `npm run start` - Start backend with Node
- `npm run dev` - Start backend with nodemon
- `npm run client:dev` - Run frontend dev server from backend folder
- `npm run client:build` - Build frontend from backend folder

## API Overview

Base URL: `http://localhost:5000`

- `POST /profile`
- `GET /profile/:userId`
- `GET /my-et`
- `GET /news`
- `GET /article`
- `GET /summarize`
- `POST /summarize`
- `POST /chat`
- `POST /navigator`
- `POST /story-arc`
- `POST /vernacular`
- `POST /video-studio`
- `GET /history/summaries`
- `GET /history/chats`

## Data and Media

- SQLite database defaults to: `backend/data/ai-news.db`
- Generated media files are written under: `backend/media/`

## Notes

- If ffmpeg/TTS fails in video generation, the backend falls back to silent video output.
- Keep backend and frontend in separate folders as currently structured.
