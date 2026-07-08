from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import asyncio

from app.models.schemas import ChatRequest, ChatResponse
from app.core.config import settings
from app.core.dependencies import get_current_user

from app.services.vector_store import VectorStore
from app.services.rag_service import RAGService

router = APIRouter()


# =============================
# Helper: get user id
# =============================

def get_user_id(current_user):

    if current_user:
        user_id = current_user["user_id"]
        print(f"🔐 Authenticated user: {user_id}")
        return user_id

    print("👤 Guest user")
    return "guest"


# =============================
# Helper: create vector store per user
# =============================

def get_user_vector_store(user_id: str):

    return VectorStore(
        embedding_model=settings.embedding_model,
        vector_db_dir=settings.vector_db_dir,
        user_id=user_id
    )


# =============================
# Helper: create RAG service per user
# =============================

def get_user_rag_service(user_id: str):

    vector_store = get_user_vector_store(user_id)

    return RAGService(
        vector_store=vector_store,
        groq_api_key=settings.groq_api_key,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model
    )


# =============================
# Streaming helper
# =============================

async def stream_answer(answer: str):

    words = answer.split(" ")

    for word in words:
        yield word + " "
        await asyncio.sleep(0.03)


# =============================
# Chat endpoint
# =============================

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user = Depends(get_current_user)
):

    # Get user id
    user_id = get_user_id(current_user)

    # Create services
    vector_store = get_user_vector_store(user_id)
    rag_service = get_user_rag_service(user_id)

    # Access control
    if current_user:

        expected_prefix = f"user_{current_user['user_id']}_"

        if not request.document_id.startswith(expected_prefix):
            raise HTTPException(
                status_code=403,
                detail="Access denied to this document"
            )

    else:
        if not request.document_id.startswith("guest_"):
            raise HTTPException(
                status_code=403,
                detail="Guest cannot access user documents"
            )

    if not vector_store.document_exists(request.document_id):
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    try:

        answer, sources = rag_service.generate_answer(
            document_id=request.document_id,
            question=request.message,
            top_k=3
        )

        return StreamingResponse(
            stream_answer(answer),
            media_type="text/plain"
        )

    except Exception as e:

        import traceback

        error_detail = (
            f"Error generating response: {str(e)}\n"
            f"{traceback.format_exc()}"
        )

        print(f"❌ Chat error: {error_detail}")

        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        )
