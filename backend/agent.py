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

import os
import sqlite3
from pathlib import Path

from langchain.agents import create_agent


def build_checkpointer():
    """Conversation history: Postgres where deployed, SQLite on a laptop.

    Both present the same interface, so nothing else in the project knows which
    one it is talking to. The split exists because a SQLite checkpointer is a
    file, and most hosts rebuild their filesystem on every deploy -- every code
    change would silently wipe the conversations. DATABASE_URL is what a host
    hands the process, so its presence doubles as "this is not a laptop".

    Note for both branches: the from_conn_string() helpers are context managers
    that close the connection on exit. That is right for a script and wrong for
    an agent that has to live as long as the server, so the connection is opened
    directly here.
    """
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        import psycopg
        from langgraph.checkpoint.postgres import PostgresSaver

        # These three are not stylistic. PostgresSaver writes outside an explicit
        # transaction, addresses its rows by name, and re-plans each statement
        # rather than reusing a prepared one -- the same set that
        # PostgresSaver.from_conn_string() applies before handing back a saver.
        conn = psycopg.connect(
            database_url,
            autocommit=True,
            prepare_threshold=0,
            row_factory=psycopg.rows.dict_row,
        )
        return PostgresSaver(conn)

    from langgraph.checkpoint.sqlite import SqliteSaver

    # Anchored to __file__ rather than left relative, so the history does not
    # depend on which directory uvicorn happened to be started from.
    #
    # check_same_thread=False because the connection is opened once, on import,
    # while uvicorn serves requests from a thread pool. Safe for both savers:
    # each funnels every database access through a lock of its own, so the
    # connection is never used concurrently.
    db_path = Path(__file__).parent / "checkpoints.sqlite"
    conn = sqlite3.connect(db_path, check_same_thread=False)
    return SqliteSaver(conn)


checkpointer = build_checkpointer()
checkpointer.setup()  # create the tables now, so a bad connection fails at startup

agent = create_agent(
    model="google_genai:gemini-3.6-flash",
    tools=[web_search],
    system_prompt=system_prompt,
    checkpointer=checkpointer,
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
