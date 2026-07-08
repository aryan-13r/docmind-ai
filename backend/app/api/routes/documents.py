from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pathlib import Path
import shutil
import uuid

from app.models.schemas import DocumentUploadResponse
from app.core.config import settings
from app.core.dependencies import get_current_user

from app.services.pdf_processor import PDFProcessor
from app.services.vector_store import VectorStore

router = APIRouter()


# =============================
# Initialize PDF processor
# =============================

pdf_processor = PDFProcessor(
    chunk_size=settings.chunk_size,
    chunk_overlap=settings.chunk_overlap
)


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
        user_id=user_id   # ✅ CRITICAL FIX
    )


# =============================
# Helper: get upload directory per user
# =============================

def get_user_upload_dir(user_id: str):

    if user_id == "guest":

        upload_dir = settings.upload_dir / "guests" / "guest"

        print("👤 Guest upload")

    else:

        upload_dir = settings.upload_dir / "users" / user_id

        print(f"🔐 Authenticated upload by user: {user_id}")

    upload_dir.mkdir(parents=True, exist_ok=True)

    return upload_dir


# =============================
# Upload PDF
# =============================

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Login required to upload documents"
        )

    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    # Get user id
    user_id = get_user_id(current_user)

    # Create user-specific vector store
    vector_store = get_user_vector_store(user_id)

    # Get upload dir
    upload_dir = get_user_upload_dir(user_id)

    file_path = upload_dir / file.filename

    try:

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process PDF
        base_document_id, chunks = pdf_processor.process_pdf(file_path)

        # ✅ attach ownership
        if current_user:
            document_id = f"user_{current_user['user_id']}_{base_document_id}"
        else:
            document_id = f"guest_{base_document_id}"

        # Store vectors per user
        chunks_count = vector_store.add_document(
            document_id=document_id,
            chunks=chunks
        )

        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename,
            chunks_count=chunks_count,
            message="Document uploaded and processed successfully"
        )

    except Exception as e:

        if file_path.exists():
            file_path.unlink()

        print(f"❌ Upload error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )


# =============================
# Check document exists
# =============================

@router.get("/documents/{document_id}/exists")
async def check_document_exists(
    document_id: str,
    current_user = Depends(get_current_user)
):

    user_id = get_user_id(current_user)

    vector_store = get_user_vector_store(user_id)

    exists = vector_store.document_exists(document_id)

    return {
        "exists": exists,
        "document_id": document_id
    }


    # =============================
# Get user's documents list
# =============================

@router.get("/my-documents")
async def get_my_documents(
    current_user = Depends(get_current_user)
):
    """
    Return list of documents belonging to current user
    """

    # Identify user
    if current_user:
        user_id = current_user["user_id"]
        print(f"🔐 Fetching documents for user: {user_id}")
    else:
        user_id = "guest"
        print("👤 Fetching documents for guest")

    # User vector directory
    user_vector_dir = settings.vector_db_dir / f"user_{user_id}"

    if not user_vector_dir.exists():
        return {
            "documents": [],
            "count": 0
        }

    documents = []

    # Scan directory for FAISS files
    for file in user_vector_dir.glob("*.faiss"):

        document_id = file.stem

        documents.append({
            "document_id": document_id,
            "filename": document_id,
        })

    return {
        "documents": documents,
        "count": len(documents)
    }