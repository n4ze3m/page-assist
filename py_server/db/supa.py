import supabase
import os

class SupaService:

    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_KEY")
        self.supabase = supabase.create_client(self.supabase_url, self.supabase_key)


    def validate_user(self, token):
        user = self.supabase.table("User").select("*").eq("access_token", token).execute()
        return user
    

    def save_webiste(self, title: str, icon: str, html: str, url: str, user_id: str):
        result = self.supabase.table("Website").insert(   {
                "title": title,
                "icon": icon,
                "html": html,
                "url": url,
                "user_id": user_id
            }).execute()
        return result