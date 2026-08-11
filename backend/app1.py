from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_google_genai import (
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings
)

from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

import os

load_dotenv()


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="TubeGPT API",
    description="RAG backend for YouTube videos",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class IngestRequest(BaseModel):
    video_id: str


class AskRequest(BaseModel):
    video_id: str
    question: str


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "TubeGPT backend is running"
    }


# ============================================================
# INGEST VIDEO
# ============================================================

@app.post("/ingest")
def ingest_video(request: IngestRequest):

    video_id = request.video_id

    print(f"Processing video: {video_id}")

    # --------------------------------------------------------
    # 1. Fetch YouTube transcript
    # --------------------------------------------------------

    ytt_api = YouTubeTranscriptApi()

    result = ytt_api.fetch(video_id)

    text = " ".join(
        snippet.text for snippet in result
    )

    # --------------------------------------------------------
    # 2. Split transcript
    # --------------------------------------------------------

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=0
    )

    texts = text_splitter.split_text(text)

    print("============ Chunks created =============")


    # --------------------------------------------------------
    # 3. Create embeddings
    # --------------------------------------------------------

    print("Creating embeddings and adding to vector store...")

    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-2"
    )


    # --------------------------------------------------------
    # 4. Create Chroma vector store
    # --------------------------------------------------------

    persist_directory = (
        f"./chroma_langchain_db/{video_id}"
    )

    vector_store = Chroma(
        collection_name="youtube-rag",
        embedding_function=embeddings,
        persist_directory=persist_directory
    )


    # --------------------------------------------------------
    # 5. Add chunks to Chroma
    # --------------------------------------------------------

    ids = vector_store.add_texts(texts)

    print("============= Added to vector store ==========")


    return {
        "message": "Video processed successfully",
        "video_id": video_id,
        "chunks": len(texts)
    }


# ============================================================
# ASK QUESTION
# ============================================================

@app.post("/ask")
def ask_question(request: AskRequest):

    video_id = request.video_id
    question = request.question

    print(f"Question: {question}")


    # --------------------------------------------------------
    # 1. Create embeddings
    # --------------------------------------------------------

    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-2"
    )


    # --------------------------------------------------------
    # 2. Load existing Chroma vector store
    # --------------------------------------------------------

    persist_directory = (
        f"./chroma_langchain_db/{video_id}"
    )

    vector_store = Chroma(
        collection_name="youtube-rag",
        embedding_function=embeddings,
        persist_directory=persist_directory
    )


    # --------------------------------------------------------
    # 3. Retriever
    # --------------------------------------------------------

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 2}
    )


    # --------------------------------------------------------
    # 4. Retrieve relevant documents
    # --------------------------------------------------------

    docs = retriever.invoke(question)


    # --------------------------------------------------------
    # 5. Create context
    # --------------------------------------------------------

    context = "\n\n".join(
        doc.page_content
        for doc in docs
    )


    # --------------------------------------------------------
    # 6. Gemini LLM
    # --------------------------------------------------------

    llm = ChatGoogleGenerativeAI(
        model="gemini-3.6-flash"
    )


    parser = StrOutputParser()


    # --------------------------------------------------------
    # 7. Prompt
    # --------------------------------------------------------

    prompt = PromptTemplate(
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

        Answer:
        """,
        input_variables=["question", "context"]
    )


    # --------------------------------------------------------
    # 8. Chain
    # --------------------------------------------------------

    chain = prompt | llm | parser


    # --------------------------------------------------------
    # 9. Generate answer
    # --------------------------------------------------------

    result = chain.invoke({
        "question": question,
        "context": context
    })


    return {
        "video_id": video_id,
        "question": question,
        "answer": result
    }