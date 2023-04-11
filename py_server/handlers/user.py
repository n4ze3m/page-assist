from fastapi import HTTPException, Header
from models import UserValidation, SaveChatToApp
from db.supa import SupaService
from bs4 import BeautifulSoup


supabase = SupaService()

async def validate_user_handler(user: UserValidation):
    if user.token is None or user.token == "":
        raise HTTPException(status_code=400, detail="Token is required")
    user = supabase.validate_user(user.token)
    data = user.data

    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Invalid token")

    return {
        "status": "success",
    }


async def save_website_handler(body: SaveChatToApp, x_auth_token):
    try:
        if x_auth_token is None or x_auth_token == "":
            raise HTTPException(status_code=400, detail="Token is required")
        
        user = supabase.validate_user(x_auth_token)
        data = user.data
        if len(data) == 0:
            raise HTTPException(status_code=400, detail="Invalid token")
        
        soup = BeautifulSoup(body.html, 'lxml')

        title = soup.title.string if soup.title else "Untitled Page"
        icon = soup.find('link', rel='icon').get('href') if soup.find('link', rel='icon') else None

        iframe = soup.find('iframe', id='pageassist-iframe')
        if iframe:
            iframe.decompose()
        div = soup.find('div', id='pageassist-icon')
        if div:
            div.decompose()
        div = soup.find('div', id='__plasmo-loading__')
        if div:
            div.decompose()
        text = soup.get_text()


        result = supabase.save_webiste(html=text, title=title, icon=icon, url=body.url, user_id=data[0]["id"])

        return {
            "status": "Success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")