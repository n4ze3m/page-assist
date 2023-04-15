from fastapi import APIRouter, Header
from models import ChatBody, ChatAppBody
from handlers.chat import chat_extension_handler, chat_app_handler

router = APIRouter(prefix="/api/v1")

@router.post("/chat/chrome", tags=["chat"])
async def chat_extension(body: ChatBody):
    return await chat_extension_handler(body)


@router.post("/chat/app", tags=["chat"])
async def chat_app(body: ChatAppBody, x_auth_token: str = Header()):
    return await chat_app_handler(body, x_auth_token)