from fastapi import FastAPI
import os
from uvicorn import run
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, user

os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY")

app = FastAPI()


origins = ["*"]
methods = ["*"]
headers = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=methods,
    allow_headers=headers
)

app.include_router(chat.router)

app.include_router(user.router)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    run(app, host="0.0.0.0", port=port)
