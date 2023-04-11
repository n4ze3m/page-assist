from fastapi import APIRouter
from models import ChatBody
from handlers.chat import chat_extension_handler

router = APIRouter(prefix="/api/v1")

@router.post("/chat/chrome", tags=["chat"])
async def chat_extension(body: ChatBody):
    return await chat_extension_handler(body)