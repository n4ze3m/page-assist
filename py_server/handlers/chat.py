from models import ChatBody, ChatAppBody
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
from langchain.vectorstores import Chroma

from db.supa import SupaService


supabase = SupaService()



async def chat_app_handler(body: ChatAppBody, jwt: str):
    try:


        user = supabase.get_user(jwt)

        if not user:
            return {
                "bot_response": "You are not logged in",
                "human_message": body.user_message,
            }
        

        user_id = user.user.id


        website_response = supabase.find_website(body.id, user_id)

        website = website_response.data

        if len(website) == 0:
            return {
                "bot_response": "Website not found",
                "human_message": body.user_message,
            }
        
        website = website[0]


        text = website["html"]

        result = [LDocument(page_content=text, metadata={"source": "test"})]
        token_splitter =  CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
        doc = token_splitter.split_documents(result)

        print(f'Number of documents: {len(doc)}')
        

        vectorstore = Chroma.from_documents(doc, OpenAIEmbeddings())


        messages = [
            SystemMessagePromptTemplate.from_template("""You are PageAssist bot. Use the following pieces of context from this webpage to answer the question from the user.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If user want recommendation, help from the context, or any other information, please provide it.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context. Helpful answer in markdown:
-----------------
{context}
            """),
            HumanMessagePromptTemplate.from_template("{question}")
        ]

        prompt = ChatPromptTemplate.from_messages(messages)


        chat =  ConversationalRetrievalChain.from_llm(OpenAI(temperature=0, model_name="gpt-3.5-turbo"), vectorstore.as_retriever(search_kwargs={"k": 1}), return_source_documents=True, qa_prompt=prompt,)

        history = [(d["human_message"], d["bot_response"]) for d in body.history]

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





async def chat_extension_handler(body: ChatBody):
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
        

        vectorstore = Chroma.from_documents(doc, OpenAIEmbeddings())


        messages = [
            SystemMessagePromptTemplate.from_template("""You are PageAssist bot. Use the following pieces of context from this webpage to answer the question from the user.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If user want recommendation, help from the context, or any other information, please provide it.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context. Helpful answer in markdown:
-----------------
{context}
            """),
            HumanMessagePromptTemplate.from_template("{question}")
        ]

        prompt = ChatPromptTemplate.from_messages(messages)


        chat =  ConversationalRetrievalChain.from_llm(OpenAI(temperature=0, model_name="gpt-3.5-turbo"), vectorstore.as_retriever(search_kwargs={"k": 1}), return_source_documents=True, qa_prompt=prompt,)

        history = [(d["human_message"], d["bot_response"]) for d in body.history]

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

