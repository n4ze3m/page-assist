from pydantic import BaseModel

class ChatBody(BaseModel):
    user_message: str
    html: str
    history: list
    # url: str

class ChatAppBody(BaseModel):
    id: str
    user_message: str
    url: str
    history: list