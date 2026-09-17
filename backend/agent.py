from dotenv import load_dotenv

load_dotenv()

import base64
from typing import Dict, Any

from langchain.tools import tool
from tavily import TavilyClient
from langchain.messages import HumanMessage

tavily_client=TavilyClient()

@tool
def web_search(query: str) -> Dict[str, Any]:
    """Search the web for information"""
    return tavily_client.search(query)

system_prompt = """
You are a personal chef. The user will give you a list of ingredients they have left over in their house.
Using the web search tool, search the web for recipes that can be made with the ingredients they have.
Return recipe suggestions and eventually the recipe instructions to the user, if requested.
Always respond in English, regardless of the language the user writes in.
"""

def image_message_from_bytes(text: str, image_bytes: bytes, mime_type: str) -> HumanMessage:
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    return HumanMessage(content_blocks=[
        {"type": "text", "text": text},
        {"type": "image", "base64": image_b64, "mime_type": mime_type},
    ])

from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model="google_genai:gemini-3.6-flash",
    tools=[web_search],
    system_prompt=system_prompt,
    checkpointer=InMemorySaver()
)

config = {"configurable": {"thread_id": "1"}}

if __name__ == "__main__":
    print("What are we cooking today? What do you have in your fridge?\n")

    while True:
        user_input = input("You: ")
        if user_input.lower() in ("quit", "exit"):
            break

        response = agent.invoke(
            {"messages": [HumanMessage(content=user_input)]},
            config
        )

        print("Chef:", response["messages"][-1].content, "\n")
