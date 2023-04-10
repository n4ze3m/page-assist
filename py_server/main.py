from fastapi import FastAPI, Header, UploadFile, File
import os
from pydantic import BaseModel
from uvicorn import run
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup

from langchain.docstore.document import Document as LDocument
from langchain.vectorstores.faiss import FAISS
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.llms import OpenAI
from langchain.text_splitter import CharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts.chat import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate
)



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


class ChatBody(BaseModel):
    user_message: str
    html: str
    history: list


@app.post("/chat")
async def chat(body: ChatBody):
    try:
        soup = BeautifulSoup(body.html, 'lxml')

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

        result = [LDocument(page_content=text, metadata={"source": "test"})]
        token_splitter =  CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
        doc = token_splitter.split_documents(result)

        print(f'Number of documents: {len(doc)}')
        

        vectorstore = FAISS.from_documents(doc, OpenAIEmbeddings())


        messages = [
            SystemMessagePromptTemplate.from_template("""I want you to act as a webpage that I am having a conversation witu. Your name is "OpenChatX". You will provide me with answers from the given text from webpage. Your answer should be original, concise, accurate, and helpful. You can recommend, translate and can do anything based on the context given. If the answer is not included in the text and you know the answer you can resonpond the answer othwerwise say exactly "I don't know the answer " and stop after that. Never break character. Answer must be in markdown format.
-----------------
{context}
            """),
            HumanMessagePromptTemplate.from_template("{question}")
        ]

        prompt = ChatPromptTemplate.from_messages(messages)


        chat =  ConversationalRetrievalChain.from_llm(OpenAI(temperature=0, model_name="gpt-3.5-turbo"), vectorstore.as_retriever(), return_source_documents=True, qa_prompt=prompt,)

        history = [(d["human_message"], d["bot_response"]) for d in body.history]

        print(history)

        response = chat({
            "question": body.user_message,
            "chat_history": history
        })
        

        answer = response["answer"]
        answer = answer[answer.find(":")+1:].strip()

        
        return {
            "bot_response": answer,
            "human_message": body.user_message,
        }

    except Exception as e:
        print(e)
        return {
            "bot_response": "Something went wrong please try again later",
            "human_message": body.user_message,
        }



if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    run(app, host="0.0.0.0", port=port)
