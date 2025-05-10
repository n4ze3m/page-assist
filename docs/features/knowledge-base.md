# Knowledge Base

Page Assist supports Knowledge Base which is useful for chatting with your own data. You can use it to chat with your own data.

::: warning
Use this feature with caution. Due to no server-side storage, the data will be processed and embeddings will be stored in browser storage. This may cause performance issues.
:::

## Supported File Types

- PDF
- Docx
- Txt
- CSV
- MD

## How to use Knowledge Base  

In order to use knowledge base, you need to set an embedding model from the RAG Settings. We recommend using `nomic-embed-text` or any embedding model that supports text. Do not use text to text model for this. 

1. Go to Settings
2. Go to Manage Knowledge
![Knowledge Base](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20210054.png)
3. You can upload your files by clicking `Add New Knowledge`

It will take some time to process the files. Once it is done, when you check the input box, you will see a block icon which is knowledge base. You can click on it and select the knowledge you want to use.

![Knowledge Base](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20210300.png)