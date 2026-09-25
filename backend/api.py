import os

from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from agent import agent, image_message_from_bytes
from langchain.messages import AIMessage, HumanMessage

app = FastAPI()

# The browser will not let the page call this API unless the API names the
# page's exact origin, so the deployed frontend's address has to be added here
# before it will work at all. ALLOWED_ORIGINS takes a comma-separated list;
# the localhost default keeps `npm run dev` working with no configuration.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/history/{thread_id}")
async def history(thread_id: str):
    """Replay a thread so a reloaded page can show what was already said.

    The checkpointer keeps the agent's full working state, which includes tool
    calls and their results. Those are machinery, not conversation, so only
    human turns and assistant turns that actually said something are returned.
    """
    state = agent.get_state({"configurable": {"thread_id": thread_id}})
    messages = (state.values or {}).get("messages", [])

    replay = []
    for m in messages:
        if isinstance(m, HumanMessage):
            role = "user"
        elif isinstance(m, AIMessage):
            role = "chef"
        else:
            continue
        text = str(m.text).strip()
        if text:
            replay.append({"role": role, "content": text})

    return {"messages": replay}


@app.post("/chat")
async def chat (
    message: str = Form(...),
    thread_id: str = Form(...),
    image: Optional[UploadFile] = File(None),
):
    config = {"configurable": {"thread_id": thread_id}}

    if image is not None:
        image_bytes = await image.read()
        human_message = image_message_from_bytes(message, image_bytes, image.content_type)
    else:
        human_message = HumanMessage(content=message)

    response = agent.invoke({"messages": [human_message]}, config)

    return {"reply": response["messages"][-1].text}
