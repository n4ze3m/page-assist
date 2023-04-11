from pydantic import BaseModel

class ChatBody(BaseModel):
    user_message: str
    html: str
    history: list
    # url: str
