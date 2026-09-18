# 🍲 Personal Chef

A cooking assistant for the food you already have. Tell it what is left in the fridge, or show it a photo, and it comes back with recipes built from those ingredients.

## 🎯 The Problem

Cooking rarely starts with a recipe. It starts with half an onion, three eggs and a bunch of parsley going soft. Searching for "recipes with eggs and parsley" returns blog posts that want eleven ingredients, nine of which you do not have, wrapped in two thousand words about someone's holiday in Provence.

## 💡 The Solution

Describe the leftovers in plain language, or take a photo of the shelf. The agent reads what is actually there, searches the web for recipes that fit, and suggests what you can cook tonight. Ask for the method and it walks you through it. The conversation is remembered, so you can come back later and pick up where you left off.

## 🚀 Quick Start

Two processes, two terminals.

```bash
# Backend - FastAPI on port 8000
cd backend
cp .env.example .env    # add GOOGLE_API_KEY and TAVILY_API_KEY
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

## 🧩 Built With

**Google Gemini** · **LangChain** · **LangGraph** · **FastAPI** · **Tavily** · **Next.js** · **TypeScript** · **Tailwind CSS**

## 🧠 How It Works

The frontend sends a message, and optionally a photo, to `POST /chat` along with a thread id. FastAPI hands it to a LangGraph agent running Gemini, which decides on its own whether the question needs a web search and calls a Tavily tool when it does. Photos travel to the model as base64 image blocks in the same message as the text, so it reads the ingredients rather than being told about them.

Conversations are kept by a LangGraph checkpointer writing to SQLite, keyed by thread id. The browser stores its thread id in `localStorage`, so reloading the page continues the same conversation rather than starting a new one, and `GET /history/{thread_id}` replays it - filtering out tool calls and their results, which belong to the agent's working state rather than to the conversation.

```
frontend (Next.js) ──POST /chat──> FastAPI ──> LangGraph agent ──> Gemini
                   <──GET /history──          │                     │
                                              │                     └──> Tavily search
                                              └──> SQLite checkpoints
```

## 📄 License

Copyright © 2026 Olga Aksenova.
