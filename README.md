# 🥘 Personal Chef

An AI cooking agent that turns the ingredients you already have into meals you can actually make. Without the extra shopping, guesswork, or endless recipe hunting.

### 🔗 **[Try it live](https://my-personal-chef.vercel.app)**

![The opening screen](docs/screenshot-start.png)

## 🎯 The Problem

Cooking rarely starts with a recipe. You have leftovers, a few vegetables, and no clear idea what to make. Traditional recipe search often gives you dishes that require ingredients you don’t have — turning a simple dinner into another trip to the store.

## 💡 The Solution

Personal Chef works backwards. Describe what you have or upload a photo of your ingredients. The agent understands your kitchen, finds recipes that fit, adapts to what’s available, and guides you through cooking step by step.

![A conversation](docs/screenshot-conversation.png)

- **Text or a photo** - list the ingredients, or photograph them and let the model read the shelf itself
- **Real recipes** - it searches the web rather than inventing plausible ones
- **Remembers** - history lives in Postgres, so a reload or a redeploy does not lose the thread
- **Starts over** - one button abandons the conversation and begins a clean one

## 🧠 How It Works

```mermaid
flowchart TD
    You(["You: ingredients or a photo"]) --> Page["Next.js page"]
    Page -->|"POST /chat"| API["FastAPI"]
    API --> Agent["LangGraph agent"]
    Agent <--> Gemini["Gemini"]
    Gemini -.->|"when it needs real recipes"| Tavily["Tavily web search"]
    Tavily -.-> Gemini
    Agent <-->|"every turn"| DB[("Postgres checkpoints")]
    Agent --> API
    API -->|"recipe suggestions"| Page
    Page -->|"GET /history/:thread_id on reload"| API
```

## 🧩 Built With

| | What it does here |
|---|---|
| **Google Gemini** | Reads the ingredients, whether typed or photographed, decides when a question needs the web, and writes the recipes |
| **LangChain** | Wraps the model and defines the search tool it can reach for |
| **LangGraph** | Runs the agent loop and checkpoints the conversation after every turn |
| **Tavily** | Web search, called by the model itself when a question needs real recipes |
| **FastAPI** | Two endpoints: send a message, replay a thread |
| **Postgres** | Conversation history, keyed by a thread id the browser keeps |
| **Next.js** · **TypeScript** | The interface, one page |
| **Tailwind CSS** | Styling, on design tokens measured off the reference illustration |

| | Runs on |
|---|---|
| **Vercel** | Frontend |
| **Render** | Backend |
| **Supabase** | Postgres database |

## 📄 License

Copyright © 2026 Olga Aksenova.

The code in this repository is licensed under the **[Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)** – see [LICENSE](LICENSE) for the full text.
