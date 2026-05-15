# Phase 5 - Ask Gemini

A full-stack AI assistant powered by Node, Express, and the Gemini API. It serves a clean frontend and exposes API endpoints for asking questions and listing available Gemini models.

## Live Demo

https://phase-5-three-phi.vercel.app/

## Preview

Add a screenshot to this repo (for example `public/preview.png`) and keep this image tag:

![Ask Gemini Preview]
<img width="666" height="497" alt="image" src="https://github.com/user-attachments/assets/aadd95fd-1062-4084-83a9-7ec60c8fc7d8" />


## Features

- Ask questions via `/api/ask`
- List available models via `/api/models`
- Express server with static frontend
- Environment-based configuration

## Tech Stack

- Node.js
- Express
- Gemini API
- HTML/CSS/JS

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and add your keys.
3. Run the server:
   ```bash
   npm start
   ```
4. Open http://localhost:3000

## Environment Variables

- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional)
- `GEMINI_MAX_TOKENS` (optional)

## API Endpoints

- `POST /api/ask` - Body: `{ "prompt": "...", "model": "...", "maxOutputTokens": 1000 }`
- `GET /api/models`
