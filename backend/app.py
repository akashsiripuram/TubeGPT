from langchain_google_genai import ChatGoogleGenerativeAI,GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
load_dotenv()


ytt_api = YouTubeTranscriptApi()
result=ytt_api.fetch("YfQ7gm81WbQ")
text = " ".join(snippet.text for snippet in result)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=0)
texts = text_splitter.split_text(text)
print("============Chunks created=============")


print("Creating embeddings and adding to vector store...")
embeddings=GoogleGenerativeAIEmbeddings(model="gemini-embedding-2")
vector_store = Chroma(
    collection_name="youtube-rag",
    embedding_function=embeddings,
    persist_directory="./chroma_langchain_db/YfQ7gm81WbQ",  # Where to save data locally, remove if not necessary
)
ids = vector_store.add_texts(texts)
print("=============Added to vector store==========")

retriever=vector_store.as_retriever(search_type="similarity",search_kwargs={"k":2})
docs = retriever.invoke("What did the speaker spoke about life in the video")

context = "\n\n".join(doc.page_content for doc in docs)
llm=ChatGoogleGenerativeAI(model="gemini-3.6-flash")
parser=StrOutputParser()
prompt=PromptTemplate(
    template="""
    You are an AI assistant answering questions about a YouTube video.

Answer the user's question using ONLY the provided context.

Instructions:

Give a natural, conversational answer.
Do not simply repeat the transcript word-for-word.
Do not unnecessarily use numbered lists.
Synthesize the relevant points from the context.
Keep the answer concise but informative.
Do not mention "the provided context" or "retrieved documents".
Do not make up information that is not present in the context.
If the context does not contain enough information to answer,
say that the video transcript does not provide enough information.

Context:
{context}

Question:
{question}

Answer:""",
    input_variables=["question","context"]
)

chain=prompt|llm|parser

result=chain.invoke({"question":"What did the speaker spoke about life in the video","context":context})

print(result)

