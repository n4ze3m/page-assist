from fastapi import APIRouter, Header
from models import UserValidation, SaveChatToApp
from handlers.user import validate_user_handler, save_website_handler


router = APIRouter(prefix="/api/v1")

@router.post("/user/validate", tags=["user"])
async def validate_user(user: UserValidation):
    return await validate_user_handler(user)


@router.post("/user/save", tags=["user"])
async def save_website(body: SaveChatToApp, x_auth_token: str = Header(None)):
    return await save_website_handler(body, x_auth_token)