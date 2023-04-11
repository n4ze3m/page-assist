from pydantic import BaseModel


class UserValidation(BaseModel):
    token: str



class SaveChatToApp(BaseModel):
    html: str
    url: str