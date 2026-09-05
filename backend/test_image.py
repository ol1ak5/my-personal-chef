from dotenv import load_dotenv
load_dotenv()

import base64
from langchain.messages import HumanMessage
from langchain.chat_models import init_chat_model

model = init_chat_model("google_genai:gemini-3.6-flash")
                        
with open("test.jpg", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode("utf-8")

message = HumanMessage(content_blocks=[
    {"type": "text", "text": "What ingredients do you see in this photo?"},
    {"type": "image", "base64": image_b64, "mime_type": "image/jpeg"},
])

response = model.invoke([message])
print(response.text)
