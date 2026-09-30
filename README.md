# 🥞 Personal Chef

An AI cooking agent that turns the ingredients you have into meals you can actually make. Without the extra shopping, guesswork, or endless recipe hunting.

### 🔗 **[Try it live](https://my-personal-chef.vercel.app)**

![The opening screen](docs/screenshot-start.png)

## 🎯 The Problem

Cooking rarely starts with a recipe. You have leftovers, a few vegetables, and no clear idea what to make. Traditional recipe search often gives you dishes that require ingredients you don’t have, turning a simple dinner into another trip to the store.

## 💡 The Solution

Personal Chef works backwards. You describe what you have or upload a photo of your ingredients, and the agent finds recipes that fit, adapts to what’s available, and guides you through cooking step by step.

![A conversation](docs/screenshot-conversation.png)

## 💬 How a conversation goes

🧑 **You:** Say what is left. Type it or photograph the shelf and let the agent read the ingredients itself. 
🧑‍🍳 **Chef:** Goes looking, calls a web search on its own, and comes back with a few things you could make, each with the method in a line.
🧑 **You:** Pick one and keep talking. Full steps, an ingredient you forgot, something you do not eat. The suggestions move with you.
🧑‍🍳 **Chef:** Holds the thread. Close the tab mid-recipe. Come back tomorrow and everything you said is still there.
🧑 **You:** Start over whenever. One button and the conversation is clean.

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

| Stack | Used for |
|---|---|
| **Google Gemini** | Reads the ingredients, decides when a question needs the web, and comes back with the recipes |
| **LangChain** | Wraps the model and defines the search tool it can reach for |
| **LangGraph** | Runs the agent loop and checkpoints the conversation after every turn |
| **Tavily** | Searches the web for real recipes |
| **FastAPI** | Serves the two endpoints the page calls: send a message, and replay a thread on reload |
| **Postgres** | Stores every conversation under its own thread id, so nothing is lost on a restart |
| **Next.js** | Renders the whole interface |
| **Tailwind CSS** | Styles the interface |
| **Vercel** | Hosts the frontend |
| **Render** | Hosts the backend |
| **Supabase** | Hosts the Postgres database the conversations are checkpointed into |

## 📄 License

Copyright © 2026 Olga Aksenova.

The code in this repository is licensed under the **[Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)** – see [LICENSE](LICENSE) for the full text.
