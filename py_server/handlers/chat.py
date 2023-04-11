from models import ChatBody
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
            SystemMessagePromptTemplate.from_template("""You are PageAssist bot. Follow the user's instructions carefully and generate answer from given context and You can recommend, translate and can do anything one the given context.  If the answer is not included in the context say exactly "Sorry, I don't know" and if you know the answer you can resonpond it.  Respond using markdown
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

