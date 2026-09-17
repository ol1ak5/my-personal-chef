from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from agent import agent, image_message_from_bytes
from langchain.messages import HumanMessage

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
