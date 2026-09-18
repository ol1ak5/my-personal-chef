# 🍲 Personal Chef

A cooking assistant for the food you already have. Tell it what is left in the fridge, or show it a photo, and it comes back with recipes built from those ingredients.

## 🎯 The Problem

Cooking rarely starts with a recipe. It starts with half an onion, three eggs and a bunch of parsley going soft. Searching for "recipes with eggs and parsley" returns blog posts that want eleven ingredients, nine of which you do not have, wrapped in two thousand words about someone's holiday in Provence.

## 💡 The Solution

Describe the leftovers in plain language, or take a photo of the shelf. The agent reads what is actually there, searches the web for recipes that fit, and suggests what you can cook tonight. Ask for the method and it walks you through it. The conversation is remembered, so you can come back later and pick up where you left off.

## ✨ What it does

- **Takes text or a photo** - list the ingredients, or photograph them and let the model read the shelf
- **Searches real recipes** - a web search tool looks for actual recipes rather than inventing plausible ones
- **Remembers the conversation** - history is kept on disk, so restarting the server or reloading the page does not lose the thread
- **Starts over when you want** - one button abandons the current conversation and begins a clean one

## 🚀 Quick Start

Two processes, two terminals.

```bash
# Backend - FastAPI on port 8000
cd backend
uv sync
uv run uvicorn api:app --reload --port 8000
```

```bash
# Frontend - Next.js on port 3000
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000.

## 🔑 API Keys

Create `backend/.env` with two keys:

```
GOOGLE_API_KEY=...      # Google AI Studio, for Gemini
TAVILY_API_KEY=...      # Tavily, for web search
```

The file is gitignored. So is `backend/checkpoints.sqlite`, which holds the conversations.

## 🧩 Built With

**Google Gemini** · **LangChain** · **LangGraph** · **FastAPI** · **Tavily** · **Next.js** · **TypeScript** · **Tailwind CSS**

## ⚠️ Honest Limits

- **Local only.** Both halves run on localhost. Nothing is deployed yet.
- **The free Gemini tier is a daily budget.** A heavy day of testing exhausts it, and the app then answers with an error until it resets. The backend log says `RESOURCE_EXHAUSTED` when this happens - it is not a bug in the app.
- **The chat screen is less finished than the opening one.** The empty state was designed properly; everything after the first message is functional but plainer.
- **No mobile layout.** Below roughly 900px wide the page shrinks rather than rearranging.
- **The illustrations are soft at high resolution.** They are cut from a single reference image at display size, so they look slightly blurred on a retina screen.

## 📄 License

Copyright © 2026 Olga Aksenova.
